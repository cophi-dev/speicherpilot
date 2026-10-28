import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DAILY_SERIES_REVALIDATE_SECONDS,
  createLastGoodStore,
  dailySeriesFetchInit,
  fetchJsonWithLastGood,
  fetchJsonWithLastGoodState,
} from "@/lib/dailySeriesCache";

describe("daily series revalidation", () => {
  it("expires the shared fetch after 30 minutes", () => {
    expect(DAILY_SERIES_REVALIDATE_SECONDS).toBe(1800);
    expect(dailySeriesFetchInit(1_000).next.revalidate).toBe(1800);
  });

  it("keeps the page revalidate literal in step with the fetch lifetime", () => {
    for (const file of ["app/page.tsx", "app/live/page.tsx"]) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain(`export const revalidate = ${DAILY_SERIES_REVALIDATE_SECONDS}`);
    }
  });

  it("always calls fetch and returns the last usable payload unchanged", async () => {
    const store = createLastGoodStore<{ dateBerlin: string }>();
    const calls: string[] = [];
    const original = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      if (calls.length === 1) {
        return { ok: true, status: 200, json: async () => ({ dateBerlin: "2026-10-22" }) } as Response;
      }
      throw new Error("upstream down");
    }) as typeof fetch;

    try {
      const first = await fetchJsonWithLastGood({
        key: "day",
        url: "https://example.test/day",
        store,
        parse: (payload) => payload as { dateBerlin: string },
        init: dailySeriesFetchInit(1_000),
      });
      const second = await fetchJsonWithLastGood({
        key: "day",
        url: "https://example.test/day",
        store,
        parse: (payload) => payload as { dateBerlin: string },
        init: dailySeriesFetchInit(1_000),
      });
      const empty = await fetchJsonWithLastGood({
        key: "other",
        url: "https://example.test/other",
        store,
        parse: () => null,
        init: dailySeriesFetchInit(1_000),
      });

      expect(calls).toHaveLength(3);
      expect(first).toEqual({ dateBerlin: "2026-10-22" });
      expect(second).toEqual({ dateBerlin: "2026-10-22" });
      expect(second).not.toEqual({ dateBerlin: "2026-10-27" });
      expect(empty).toBeNull();
    } finally {
      global.fetch = original;
    }
  });

  it("keeps the last payload and marks it stale on HTTP 429", async () => {
    const store = createLastGoodStore<{ n: number }>();
    const original = global.fetch;
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ n: 4 }) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) }) as typeof fetch;
    try {
      const first = await fetchJsonWithLastGoodState({
        key: "row",
        url: "https://example.test/row",
        store,
        parse: (payload) => payload as { n: number },
        init: dailySeriesFetchInit(1_000),
      });
      const second = await fetchJsonWithLastGoodState({
        key: "row",
        url: "https://example.test/row",
        store,
        parse: (payload) => payload as { n: number },
        init: dailySeriesFetchInit(1_000),
      });
      expect(first).toEqual({ value: { n: 4 }, stale: false });
      expect(second).toEqual({ value: { n: 4 }, stale: true });
      expect(second.value).not.toEqual({ n: 0 });
    } finally {
      global.fetch = original;
    }
  });
});
