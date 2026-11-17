import {
  findFirstUnixSecondForBerlinDateKey,
  nextBerlinDateKey,
} from "@/lib/berlinCalendar";

const GRID_STEP_S = 900;

/** UTC-Millisekunden des Berlin-Kalendertags {dateKey} um 00:00:00 (unabhängig von process TZ). */
export function berlinMidnightUtcMs(dateKey: string): number {
  return findFirstUnixSecondForBerlinDateKey(dateKey) * 1000;
}

/** Viertelstunden pro Berlin-Kalendertag (92/96/100 bei DST). */
export function expectedQuartersBerlinDay(dateKey: string): number {
  const start = findFirstUnixSecondForBerlinDateKey(dateKey);
  const end = findFirstUnixSecondForBerlinDateKey(nextBerlinDateKey(dateKey));
  return Math.round((end - start) / GRID_STEP_S);
}