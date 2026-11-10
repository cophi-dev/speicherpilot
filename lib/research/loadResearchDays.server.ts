import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { expectedBerlinQuarters } from "@/lib/berlinDayCompleteness";
import { loadGermanyPower } from "@/lib/loadGermanyPower";
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
import type { ResidualDay } from "@/lib/windSolarResidual";

function mergeDay(map: Map<string, ResidualDay>, day: ResidualDay): void {
  const prev = map.get(day.dateBerlin);
  if (!prev || day.slots.length > prev.slots.length) {
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
  const url = `https://api.energy-charts.info/v2/total_power?country=de&start=${yesterday}&end=${todayKey}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    return;
  }
  const parsed = parsePowerPayload(await res.json());
  if (!parsed) {
    return;
  }
  for (const day of residualDaysFromSlots(parsed)) {
    if (day.dateBerlin === yesterday && day.slots.length >= need) {
      mergeDay(byKey, day);
    }
  }
}

/** Snapshot plus live Energy-Charts tail so gestern tracks 96/96 publication. */
export async function loadResearchDays(now: Date): Promise<ResidualDay[]> {
  noStore();
  const snap = loadTagRollSnapshot();
  const byKey = new Map<string, ResidualDay>(snap.days.map((d) => [d.dateBerlin, d]));

  const { parsed } = await loadGermanyPower(now);
  if (parsed) {
    for (const day of residualDaysFromSlots(parsed)) {
      mergeDay(byKey, day);
    }
  }

  await refreshYesterdayIfNeeded(now, byKey);

  return [...byKey.values()].sort((a, b) => a.dateBerlin.localeCompare(b.dateBerlin));
}
