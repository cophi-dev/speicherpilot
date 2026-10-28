import "server-only";

import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import {
  createLastGoodStore,
  dailySeriesFetchInit,
  fetchJsonWithLastGoodState,
} from "@/lib/dailySeriesCache";
import { parseDayAheadPrices, type DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { frequencyWindow, parseFrequency } from "@/lib/frequencySeries";
import type { FrequencySample } from "@/lib/liveStrip";
import { parsePowerPayload, type PowerParse } from "@/lib/powerMix";

const powerStore = createLastGoodStore<PowerParse>();
const priceStore = createLastGoodStore<DayAheadPricePoint[]>();
const frequencyStore = createLastGoodStore<FrequencySample>();

export function clearGermanyPowerCache(): void {
  powerStore.clear();
  priceStore.clear();
  frequencyStore.clear();
}

function berlinKey(date: Date): string {
  return formatBerlinDateKeyFromUtcDate(date);
}

export async function loadGermanyPower(now: Date): Promise<{ parsed: PowerParse | null; stale: boolean }> {
  const end = berlinKey(now);
  const start = addBerlinCalendarDays(end, -30);
  const url = `https://api.energy-charts.info/v2/total_power?country=de&start=${start}&end=${end}`;
  const result = await fetchJsonWithLastGoodState({
    key: "total-power-de",
    url,
    store: powerStore,
    parse: (payload) => parsePowerPayload(payload),
    init: dailySeriesFetchInit(20_000),
    isUsable: (value) => value.slots.length > 0,
  });
  return { parsed: result.value, stale: result.stale };
}

export async function loadDayAheadDay(dateKey: string): Promise<{ prices: DayAheadPricePoint[]; stale: boolean }> {
  const url = `https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${dateKey}&end=${dateKey}`;
  const result = await fetchJsonWithLastGoodState({
    key: `price-de-lu:${dateKey}`,
    url,
    store: priceStore,
    parse: (payload) => {
      const prices = parseDayAheadPrices(payload);
      return prices.length > 0 ? prices : null;
    },
    init: dailySeriesFetchInit(15_000),
    isUsable: (value) => value.length > 0,
  });
  return { prices: result.value ?? [], stale: result.stale && result.value !== null };
}

export async function loadFreiburgFrequency(now: Date): Promise<{ sample: FrequencySample | null; stale: boolean }> {
  const window = frequencyWindow(now);
  const url = `https://api.energy-charts.info/v2/frequency?start=${window.start}&end=${window.end}`;
  const result = await fetchJsonWithLastGoodState({
    key: `frequency:${window.start}`,
    url,
    store: frequencyStore,
    parse: (payload) => parseFrequency(payload),
    init: dailySeriesFetchInit(15_000),
    isUsable: (value) => Number.isFinite(value.hertz),
  });
  return { sample: result.value, stale: result.stale && result.value !== null };
}
