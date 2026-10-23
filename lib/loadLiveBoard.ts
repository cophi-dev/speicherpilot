import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { createLastGoodStore, dailySeriesFetchInit, fetchJsonWithLastGood } from "@/lib/dailySeriesCache";
import { dayAheadPriceUrl, parseDayAheadPrices, type DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { buildLiveBoard, type LiveBoard, type QuarterPoint } from "@/lib/liveBoard";
import { fetchSmardQuarterHours, SMARD_FILTER, type SmardRegion } from "@/lib/smardApi";

export type GermanyLiveInput = {
  timestampIso: string;
  loadMw: number;
  generationMw: number | null;
} | null;

const lastGood = createLastGoodStore<unknown>();

export function clearLiveBoardCache(): void {
  lastGood.clear();
}

async function cachedJson(url: string): Promise<unknown> {
  const body = await fetchJsonWithLastGood({
    key: url,
    url,
    store: lastGood,
    parse: (payload) => payload,
    init: dailySeriesFetchInit(12_000),
    isUsable: (payload) => payload !== null,
  });
  if (body === null) {
    throw new Error(`Live request failed for ${url}`);
  }
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

async function dayAheadPrices(dateKey: string): Promise<DayAheadPricePoint[] | null> {
  try {
    const body = await cachedJson(dayAheadPriceUrl(dateKey));
    return parseDayAheadPrices(body);
  } catch {
    return null;
  }
}

/** DE-LU day-ahead prices for one Berlin delivery day. Same feed as `/live`. */
export async function loadDayAheadPricesForDate(dateKey: string): Promise<DayAheadPricePoint[] | null> {
  return dayAheadPrices(dateKey);
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
