import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { dayIsUsable } from "@/lib/liveFleetDispatch";
import type { ResidualDay } from "@/lib/windSolarResidual";

/** Berlin calendar day with published quarter-hours through 23:45 (or full historical day). */
export function isCompleteBerlinDay(day: ResidualDay, todayKey: string): boolean {
  if (!dayIsUsable(day)) {
    return false;
  }
  if (day.dateBerlin > todayKey) {
    return false;
  }
  const last = day.slots[day.slots.length - 1];
  const throughEnd = last.hourBerlin === 23 && last.minuteBerlin === 45;
  if (day.dateBerlin === todayKey) {
    return throughEnd;
  }
  return throughEnd || day.slots.length >= 92;
}

/** Newest complete Berlin day in the series (for /tag redirects and date pickers). */
export function pickLastCompleteDayKey(days: ResidualDay[], todayKey: string): string {
  const newest = days
    .filter((day) => isCompleteBerlinDay(day, todayKey))
    .sort((left, right) => (left.dateBerlin < right.dateBerlin ? 1 : -1))[0];
  if (newest) {
    return newest.dateBerlin;
  }
  return prevBerlinDateKey(todayKey);
}
