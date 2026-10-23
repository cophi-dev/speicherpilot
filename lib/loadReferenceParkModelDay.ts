import "server-only";

import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { loadDayAheadPricesForDate } from "@/lib/loadLiveBoard";
import { referenceParkModelDay, type ReferenceParkModelDay } from "@/lib/referenceParkModelDay";

/** Yesterday’s DE-LU day-ahead prices, run through the existing dispatch engine. */
export async function loadReferenceParkModelDay(now: Date = new Date()): Promise<ReferenceParkModelDay | null> {
  const today = formatBerlinDateKeyFromUtcDate(now);
  const yesterday = addBerlinCalendarDays(today, -1);
  const prices = await loadDayAheadPricesForDate(yesterday);
  if (!prices || prices.length === 0) {
    return null;
  }
  return referenceParkModelDay({ prices, dateBerlin: yesterday });
}
