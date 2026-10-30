import { addBerlinCalendarDays, prevBerlinDateKey } from "@/lib/berlinCalendar";

export const OVERVIEW_BLICKS = ["heute", "gestern", "7tage", "30tage"] as const;
export type OverviewBlick = (typeof OVERVIEW_BLICKS)[number];

export const OVERVIEW_FACTORS = [1, 2, 5, 10] as const;
export type OverviewFactor = (typeof OVERVIEW_FACTORS)[number];

export function parseOverviewBlick(value: string | null | undefined): OverviewBlick {
  if (value === "gestern" || value === "7tage" || value === "30tage" || value === "heute") {
    return value;
  }
  return "heute";
}

export function parseOverviewFactor(value: string | null | undefined): OverviewFactor {
  const parsed = Number(value);
  return OVERVIEW_FACTORS.includes(parsed as OverviewFactor) ? (parsed as OverviewFactor) : 1;
}

export type OverviewBounds = {
  blick: OverviewBlick;
  startKey: string;
  endKey: string;
  /** When true, only slots up to the last published quarter on `endKey` count (open today). */
  capEndAtLastSlot: boolean;
  dayCount: number;
};

/** Rolling windows in Berlin time. Seven and thirty days exclude today so the figure stays stable. */
export function overviewBounds(blick: OverviewBlick, todayKey: string): OverviewBounds {
  const yesterday = prevBerlinDateKey(todayKey);
  if (blick === "heute") {
    return { blick, startKey: todayKey, endKey: todayKey, capEndAtLastSlot: true, dayCount: 1 };
  }
  if (blick === "gestern") {
    return { blick, startKey: yesterday, endKey: yesterday, capEndAtLastSlot: false, dayCount: 1 };
  }
  if (blick === "7tage") {
    return {
      blick,
      startKey: addBerlinCalendarDays(yesterday, -6),
      endKey: yesterday,
      capEndAtLastSlot: false,
      dayCount: 7,
    };
  }
  return {
    blick,
    startKey: addBerlinCalendarDays(yesterday, -29),
    endKey: yesterday,
    capEndAtLastSlot: false,
    dayCount: 30,
  };
}
