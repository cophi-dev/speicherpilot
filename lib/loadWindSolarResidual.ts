import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { parseWindSolarDays, type ResidualDay } from "@/lib/windSolarResidual";

const LOOKBACK_DAYS = 21;
const CACHE_MS = 5 * 60 * 1000;

let cache: { at: number; days: ResidualDay[] } | null = null;

function berlinKey(date: Date): string {
  return formatBerlinDateKeyFromUtcDate(date);
}

export async function loadWindSolarDays(now: Date): Promise<ResidualDay[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.days;
  }
  const end = berlinKey(now);
  const start = berlinKey(new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000));
  try {
    const response = await fetch(
      `https://api.energy-charts.info/total_power?country=de&start=${start}&end=${end}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!response.ok) {
      throw new Error(`Wind and solar request failed with ${response.status}`);
    }
    const days = parseWindSolarDays(await response.json());
    cache = { at: Date.now(), days };
    return days;
  } catch {
    return cache?.days ?? [];
  }
}
