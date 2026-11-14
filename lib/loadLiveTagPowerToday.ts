import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { createLastGoodStore, fetchJsonWithLastGoodState } from "@/lib/dailySeriesCache";
import { LIVE_TAG_DATA_REVALIDATE_SECONDS } from "@/lib/liveTagConfig";
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";

const store = createLastGoodStore<ResidualDay | null>();

export function clearLiveTagPowerTodayCache(): void {
  store.clear();
}

function liveTagFetchInit(timeoutMs: number): RequestInit {
  return {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: LIVE_TAG_DATA_REVALIDATE_SECONDS },
  };
}

/**
 * Energy-Charts total_power nur für den Berlin-Tag `dateKey`. Die letzte Viertelstunde
 * fällt weg, wenn Wind oder Solar fehlen (wie bei parsePowerPayload / residualDaysFromSlots).
 */
export async function loadLiveTagPowerToday(
  now: Date = new Date(),
): Promise<{ day: ResidualDay | null; stale: boolean; fetchedAtMs: number | null }> {
  const dateKey = formatBerlinDateKeyFromUtcDate(now);
  const url = `https://api.energy-charts.info/v2/total_power?country=de&start=${dateKey}&end=${dateKey}`;
  const result = await fetchJsonWithLastGoodState({
    key: `live-tag-tp:${dateKey}`,
    url,
    store,
    parse: (payload) => {
      const parsed = parsePowerPayload(payload);
      if (!parsed) {
        return null;
      }
      const days = residualDaysFromSlots(parsed);
      return days.find((day) => day.dateBerlin === dateKey) ?? null;
    },
    init: liveTagFetchInit(12_000),
    isUsable: (day) => Boolean(day && day.slots.length > 0),
  });
  const cached = store.get(`live-tag-tp:${dateKey}`);
  return {
    day: result.value,
    stale: result.stale,
    fetchedAtMs: cached?.savedAtMs ?? null,
  };
}