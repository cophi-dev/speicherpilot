import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import {
  createLastGoodStore,
  dailySeriesFetchInit,
  fetchJsonWithLastGood,
} from "@/lib/dailySeriesCache";
import { parseWindSolarDays, type ResidualDay } from "@/lib/windSolarResidual";

const LOOKBACK_DAYS = 21;
const STORE_KEY = "wind-solar-days";

const lastGood = createLastGoodStore<ResidualDay[]>();

function berlinKey(date: Date): string {
  return formatBerlinDateKeyFromUtcDate(date);
}

export function clearWindSolarDaysCache(): void {
  lastGood.clear();
}

export async function loadWindSolarDays(now: Date): Promise<ResidualDay[]> {
  const end = berlinKey(now);
  const start = berlinKey(new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000));
  const url = `https://api.energy-charts.info/total_power?country=de&start=${start}&end=${end}`;
  const days = await fetchJsonWithLastGood({
    key: STORE_KEY,
    url,
    store: lastGood,
    parse: (payload) => parseWindSolarDays(payload),
    init: dailySeriesFetchInit(20_000),
    isUsable: (value) => value.length > 0,
  });
  return days ?? [];
}
