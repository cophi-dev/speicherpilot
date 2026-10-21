import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildLiveBoard, type LiveBoard, type QuarterPoint } from "@/lib/liveBoard";
import { fetchSmardQuarterHours, SMARD_FILTER, type SmardRegion } from "@/lib/smardApi";

export type GermanyLiveInput = {
  timestampIso: string;
  loadMw: number;
  generationMw: number | null;
} | null;

type CacheEntry = { at: number; body: unknown };

const cache = new Map<string, CacheEntry>();
const CACHE_MS = 5 * 60 * 1000;

async function cachedJson(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.body;
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Live request failed with ${response.status}`);
  }
  const body: unknown = await response.json();
  cache.set(url, { at: Date.now(), body });
  return body;
}

async function smard(filter: number, region: SmardRegion): Promise<QuarterPoint[] | null> {
  try {
    return await fetchSmardQuarterHours(filter, region, async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const body = await cachedJson(url);
      return new Response(JSON.stringify(body), { status: 200 });
    });
  } catch {
    return null;
  }
}

type EnergyChartsEnvelope = {
  data?: Array<{ timestamp?: string; values?: Record<string, number | null> }>;
};

async function dayAheadPrices(dateKey: string): Promise<Array<{ unixMs: number; eurPerMwh: number }> | null> {
  try {
    const body = (await cachedJson(
      `https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${dateKey}&end=${dateKey}`
    )) as EnergyChartsEnvelope;
    const points: Array<{ unixMs: number; eurPerMwh: number }> = [];
    for (const row of body.data ?? []) {
      const price = row.values?.day_ahead_price;
      if (!row.timestamp || price === null || price === undefined || !Number.isFinite(price)) {
        continue;
      }
      points.push({ unixMs: Date.parse(row.timestamp), eurPerMwh: price });
    }
    return points;
  } catch {
    return null;
  }
}

async function nationalSignal(): Promise<Array<{ unixMs: number; sharePct: number; signal: number }> | null> {
  try {
    const body = (await cachedJson("https://api.energy-charts.info/v2/signal?country=de")) as EnergyChartsEnvelope;
    const points: Array<{ unixMs: number; sharePct: number; signal: number }> = [];
    for (const row of body.data ?? []) {
      const share = row.values?.share;
      const signal = row.values?.signal;
      if (!row.timestamp || share === null || share === undefined || signal === null || signal === undefined) {
        continue;
      }
      if (!Number.isFinite(share) || !Number.isFinite(signal)) {
        continue;
      }
      points.push({ unixMs: Date.parse(row.timestamp), sharePct: share, signal });
    }
    return points;
  } catch {
    return null;
  }
}

export async function loadLiveBoard(options?: { now?: Date; germany?: GermanyLiveInput }): Promise<LiveBoard> {
  const now = options?.now ?? new Date();
  const berlinDateKey = formatBerlinDateKeyFromUtcDate(now);
  const [hertzWindOn, hertzWindOff, hertzPv, hertzLoad, tennetOff, southWind, southPv, southLoad, prices, signal] =
    await Promise.all([
      smard(SMARD_FILTER.windOnshore, "50Hertz"),
      smard(SMARD_FILTER.windOffshore, "50Hertz"),
      smard(SMARD_FILTER.photovoltaic, "50Hertz"),
      smard(SMARD_FILTER.load, "50Hertz"),
      smard(SMARD_FILTER.windOffshore, "TenneT"),
      smard(SMARD_FILTER.windOnshore, "TransnetBW"),
      smard(SMARD_FILTER.photovoltaic, "TransnetBW"),
      smard(SMARD_FILTER.load, "TransnetBW"),
      dayAheadPrices(berlinDateKey),
      nationalSignal(),
    ]);

  const hertz = hertzWindOn && hertzWindOff && hertzPv && hertzLoad
    ? { windOn: hertzWindOn, windOff: hertzWindOff, pv: hertzPv, load: hertzLoad }
    : null;
  const offshore = hertzWindOff && tennetOff ? { hertz: hertzWindOff, tennet: tennetOff } : null;
  const transnet = southWind && southPv && southLoad ? { windOn: southWind, pv: southPv, load: southLoad } : null;
  const germany = options?.germany
    ? {
        unixMs: Date.parse(options.germany.timestampIso),
        loadMw: options.germany.loadMw,
        generationMw: options.germany.generationMw,
      }
    : null;

  return buildLiveBoard({
    berlinDateKey,
    nowMs: now.getTime(),
    hertz,
    offshore,
    transnet,
    prices,
    signal,
    germany,
  });
}
