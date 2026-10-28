/**
 * Shared lifetime for Energy-Charts and SMARD day series on `/` and `/live`.
 * The previous Berlin day is usually published around 06:00, and day-ahead
 * prices for the next day around 13:00. Thirty minutes is long enough to sit
 * on the CDN and short enough that a publication shows up the same morning.
 *
 * Page segments must export this number as a literal (`export const revalidate = 1800`).
 * Next.js does not accept an imported binding there.
 */
export const DAILY_SERIES_REVALIDATE_SECONDS = 1800;

export type DailySeriesFetchInit = RequestInit & {
  next: { revalidate: number };
};

export function dailySeriesFetchInit(timeoutMs: number): DailySeriesFetchInit {
  return {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: DAILY_SERIES_REVALIDATE_SECONDS },
  };
}

export type LastGoodStore<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
};

/** Process memory for a failed request. Not a freshness cache: every call still hits `fetch`. */
export function createLastGoodStore<T>(): LastGoodStore<T> {
  const values = new Map<string, T>();
  return {
    get(key) {
      return values.get(key);
    },
    set(key, value) {
      values.set(key, value);
    },
    clear() {
      values.clear();
    },
  };
}

/**
 * Always requests `url`. Next.js keeps the successful response for
 * `next.revalidate` seconds, including on a new serverless instance.
 * The store is used only when this attempt fails or the payload is unusable.
 * Callers must keep the payload's own date visible and must not relabel it as today.
 */
export type LastGoodState<T> = {
  value: T | null;
  /** True when a failed attempt, including HTTP 429, fell back to an older success. */
  stale: boolean;
};

export async function fetchJsonWithLastGoodState<T>(options: {
  key: string;
  url: string;
  store: LastGoodStore<T>;
  parse: (payload: unknown) => T | null;
  init: RequestInit;
  isUsable?: (value: T) => boolean;
}): Promise<LastGoodState<T>> {
  const isUsable = options.isUsable ?? (() => true);
  const cached = () => options.store.get(options.key);
  try {
    const response = await fetch(options.url, options.init);
    if (!response.ok) {
      const previous = cached();
      return { value: previous ?? null, stale: previous !== undefined };
    }
    const parsed = options.parse(await response.json());
    if (parsed !== null && isUsable(parsed)) {
      options.store.set(options.key, parsed);
      return { value: parsed, stale: false };
    }
    const previous = cached();
    if (previous !== undefined) {
      return { value: previous, stale: true };
    }
    return { value: parsed, stale: false };
  } catch {
    const previous = cached();
    return { value: previous ?? null, stale: previous !== undefined };
  }
}

export async function fetchJsonWithLastGood<T>(options: {
  key: string;
  url: string;
  store: LastGoodStore<T>;
  parse: (payload: unknown) => T | null;
  init: RequestInit;
  isUsable?: (value: T) => boolean;
}): Promise<T | null> {
  const result = await fetchJsonWithLastGoodState(options);
  return result.value;
}
