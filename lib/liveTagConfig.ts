import { addBerlinCalendarDays } from "@/lib/berlinCalendar";

/** Daten-Cache für Energy-Charts total_power nur heute (Sekunden). */
export const LIVE_TAG_DATA_REVALIDATE_SECONDS = 900;

/**
 * Wenn `SPEICHERPILOT_TAG_INDEX_HEUTE=1`, leitet `/tag` ohne Datum auf heute statt auf den
 * letzten vollständigen Tag. Standard aus, bis die Abnahme durch ist.
 */
export function tagIndexPointsToToday(): boolean {
  return process.env.SPEICHERPILOT_TAG_INDEX_HEUTE === "1";
}

export function tagIndexRedirectTarget(todayKey: string, lastCompleteDayKey: string): string {
  return tagIndexPointsToToday() ? todayKey : lastCompleteDayKey;
}

/** Morgen-Vorschau im Preis-Panel, sobald Day-Ahead für den Folgetag veröffentlicht ist. */
export function liveTagTomorrowKey(todayKey: string): string {
  return addBerlinCalendarDays(todayKey, 1);
}