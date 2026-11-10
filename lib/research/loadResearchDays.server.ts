import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { expectedBerlinQuarters } from "@/lib/berlinDayCompleteness";
import ec0911Abruf0647 from "@/data/forschung/ec_total_power_20261109_abruf0647.json";
import { fetchLegacyResearchDays, legacyTotalPowerUrl, residualDaysFromEnergyChartsPayload } from "@/lib/research/legacyResearchPower.server";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
import type { ResidualDay } from "@/lib/windSolarResidual";

/** Verifizierte Energy-Charts-Abrufe (v3); überschreibt spätere EC-Nachmeldungen auf gleicher QH-Anzahl. */
const PINNED_TOTAL_POWER: Record<string, unknown> = {
  "2026-11-09": ec0911Abruf0647,
};

const RESEARCH_LIVE_LOOKBACK_DAYS = 21;

function mergeDay(map: Map<string, ResidualDay>, day: ResidualDay): void {
  const prev = map.get(day.dateBerlin);
  if (!prev || day.slots.length > prev.slots.length) {
    map.set(day.dateBerlin, day);
  }
}

/** Live v1 `total_power` overrides snapshot at equal quarter count (v3-aligned Restlast). */
function mergeLiveDay(map: Map<string, ResidualDay>, day: ResidualDay): void {
  const prev = map.get(day.dateBerlin);
  if (!prev || day.slots.length >= prev.slots.length) {
    map.set(day.dateBerlin, day);
  }
}

/** No-cache tail fetch when committed snapshot still has partial gestern. */
async function refreshYesterdayIfNeeded(now: Date, byKey: Map<string, ResidualDay>): Promise<void> {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const yesterday = prevBerlinDateKey(todayKey);
  let need: number;
  try {
    need = expectedBerlinQuarters(yesterday);
  } catch {
    return;
  }
  const cur = byKey.get(yesterday);
  if (cur && cur.slots.length >= need) {
    return;
  }
  const url = legacyTotalPowerUrl(yesterday, todayKey);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    return;
  }
  for (const day of residualDaysFromEnergyChartsPayload(await res.json())) {
    if (day.dateBerlin === yesterday && day.slots.length >= need) {
      mergeLiveDay(byKey, day);
    }
  }
}

/** Snapshot plus live Energy-Charts tail so gestern tracks 96/96 publication. */
export async function loadResearchDays(now: Date): Promise<ResidualDay[]> {
  noStore();
  const snap = loadTagRollSnapshot();
  const byKey = new Map<string, ResidualDay>(snap.days.map((d) => [d.dateBerlin, d]));

  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const start = addBerlinCalendarDays(todayKey, -RESEARCH_LIVE_LOOKBACK_DAYS);
  for (const day of await fetchLegacyResearchDays(start, todayKey)) {
    mergeLiveDay(byKey, day);
  }

  await refreshYesterdayIfNeeded(now, byKey);

  for (const [dateKey, payload] of Object.entries(PINNED_TOTAL_POWER)) {
    const pinned = residualDaysFromEnergyChartsPayload(payload).find((d) => d.dateBerlin === dateKey);
    if (pinned) {
      mergeLiveDay(byKey, pinned);
    }
  }

  return [...byKey.values()].sort((a, b) => a.dateBerlin.localeCompare(b.dateBerlin));
}
