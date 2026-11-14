import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { parseDayAheadPrices, type DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { createLastGoodStore, fetchJsonWithLastGoodState } from "@/lib/dailySeriesCache";
import { LIVE_TAG_DATA_REVALIDATE_SECONDS, liveTagTomorrowKey } from "@/lib/liveTagConfig";
import { buildLiveDayPlausibility, type LiveDayPlausibilityResult } from "@/lib/liveDayPlausibility";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadLiveTagPowerToday } from "@/lib/loadLiveTagPowerToday";
import { resolveNavShortcuts } from "@/lib/navShortcuts.server";
import { berlinDayPrices, type PreisTick } from "@/lib/preisFenster";
import { referenceParkModelDay, type ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import type { ResidualDay } from "@/lib/windSolarResidual";

const priceStore = createLastGoodStore<DayAheadPricePoint[]>();

function liveTagPriceInit(timeoutMs: number): RequestInit {
  return {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: LIVE_TAG_DATA_REVALIDATE_SECONDS },
  };
}

async function loadDayAheadForLiveTag(todayKey: string): Promise<{
  today: PreisTick[];
  tomorrow: PreisTick[];
  tomorrowKey: string;
  stale: boolean;
  raw: DayAheadPricePoint[];
}> {
  const tomorrowKey = liveTagTomorrowKey(todayKey);
  const url = `https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${todayKey}&end=${tomorrowKey}`;
  const result = await fetchJsonWithLastGoodState({
    key: `live-tag-price:${todayKey}:${tomorrowKey}`,
    url,
    store: priceStore,
    parse: (payload) => {
      const prices = parseDayAheadPrices(payload);
      return prices.length > 0 ? prices : null;
    },
    init: liveTagPriceInit(15_000),
    isUsable: (value) => value.length > 0,
  });
  const prices = result.value ?? [];
  const tomorrowPrices = prices.filter(
    (point) => formatBerlinDateKeyFromUtcDate(new Date(point.unixMs)) === tomorrowKey,
  );
  return {
    today: berlinDayPrices(prices, todayKey),
    tomorrow: tomorrowPrices.length >= 4 ? berlinDayPrices(prices, tomorrowKey) : [],
    tomorrowKey,
    stale: result.stale,
    raw: prices,
  };
}

export type LiveTagView = {
  mode: "laufend";
  todayKey: string;
  dayKey: string;
  lastCompleteDayKey: string;
  day: ResidualDay;
  plausibility: LiveDayPlausibilityResult;
  preisToday: PreisTick[];
  preisTomorrow: PreisTick[];
  tomorrowKey: string;
  marktFahrplan: ReferenceParkModelDay | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  dataDelayed: boolean;
  dataStandHm: string;
  fetchedAtMs: number | null;
  pricesStale: boolean;
  powerStale: boolean;
};

export async function loadLiveTagView(dayKey: string, now: Date = new Date()): Promise<LiveTagView | null> {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  if (dayKey !== todayKey) {
    return null;
  }

  const [{ day, stale: powerStale, fetchedAtMs }, prices, fleet, nav] = await Promise.all([
    loadLiveTagPowerToday(now),
    loadDayAheadForLiveTag(todayKey),
    loadLargeBatteryFleet(),
    resolveNavShortcuts(),
  ]);

  if (!day || day.slots.length === 0) {
    return null;
  }

  const plausibility = buildLiveDayPlausibility(day.slots);
  const powerGw = fleet?.powerGw ?? 4.645;
  const energyGwh = fleet?.energyGwh ?? 8.155;

  const todayRaw = prices.raw.filter(
    (point) => formatBerlinDateKeyFromUtcDate(new Date(point.unixMs)) === todayKey,
  );

  const marktFahrplan =
    todayRaw.length >= 4
      ? referenceParkModelDay({
          prices: todayRaw,
          dateBerlin: todayKey,
          powerMw: powerGw * 1000,
          energyMwh: energyGwh * 1000,
        })
      : null;

  const dataDelayed =
    powerStale ||
    (fetchedAtMs !== null && Date.now() - fetchedAtMs > 2 * 60 * 60 * 1000);

  return {
    mode: "laufend",
    todayKey,
    dayKey: todayKey,
    lastCompleteDayKey: nav.lastCompleteDayKey,
    day,
    plausibility,
    preisToday: prices.today,
    preisTomorrow: prices.tomorrow,
    tomorrowKey: prices.tomorrowKey,
    marktFahrplan,
    fleetPowerGw: powerGw,
    fleetEnergyGwh: energyGwh,
    dataDelayed,
    dataStandHm: plausibility.standLabelHm,
    fetchedAtMs,
    pricesStale: prices.stale,
    powerStale,
  };
}