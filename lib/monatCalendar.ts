import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { formatQuantity } from "@/lib/formatQuantity";

const MONTH_KEY = /^\d{4}-\d{2}$/;

export function isBerlinMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

export function berlinMonthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function daysInBerlinMonth(monthKey: string): string[] {
  const [y, mo] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= last; d += 1) {
    days.push(`${monthKey}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

export function prevBerlinMonthKey(monthKey: string): string {
  const [y, mo] = monthKey.split("-").map(Number);
  if (mo === 1) {
    return `${y - 1}-12`;
  }
  return `${y}-${String(mo - 1).padStart(2, "0")}`;
}

export function nextBerlinMonthKey(monthKey: string): string {
  const [y, mo] = monthKey.split("-").map(Number);
  if (mo === 12) {
    return `${y + 1}-01`;
  }
  return `${y}-${String(mo + 1).padStart(2, "0")}`;
}

export function formatBerlinMonthLabel(monthKey: string): string {
  const [y, mo] = monthKey.split("-").map(Number);
  const label = new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function recordSeriesBounds(records: TagesKennzahlRecord[]): {
  firstKey: string;
  lastKey: string;
} | null {
  if (records.length === 0) {
    return null;
  }
  return { firstKey: records[0].dateKey, lastKey: records[records.length - 1].dateKey };
}

/** Months that have at least one day present in `records`. */
export function monthsWithData(records: TagesKennzahlRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    set.add(berlinMonthKeyFromDateKey(r.dateKey));
  }
  return [...set].sort();
}

export function monthHasAnyRecord(monthKey: string, records: TagesKennzahlRecord[]): boolean {
  return records.some((r) => berlinMonthKeyFromDateKey(r.dateKey) === monthKey);
}

/**
 * Month is „archiv-vollständig“ if every calendar day through `lastCompleteDayKey`
 * that falls in this month has a record in the loaded series (no arbitrary %-Schwelle).
 */
export function isMonthArchivedComplete(
  monthKey: string,
  records: TagesKennzahlRecord[],
  lastCompleteDayKey: string,
): boolean {
  const byDate = new Map(records.map((r) => [r.dateKey, r]));
  const bounds = recordSeriesBounds(records);
  if (!bounds) {
    return false;
  }
  const days = daysInBerlinMonth(monthKey).filter((d) => d <= lastCompleteDayKey);
  if (days.length === 0) {
    return false;
  }
  return days.every((d) => d >= bounds.firstKey && d <= bounds.lastKey && byDate.has(d));
}

/** Calendar month fully in the past relative to the last complete archive day. */
export function isBerlinMonthCalendarClosed(monthKey: string, lastCompleteDayKey: string): boolean {
  const days = daysInBerlinMonth(monthKey);
  const lastCalendarDay = days[days.length - 1];
  return lastCompleteDayKey >= lastCalendarDay;
}

/** Default /monat entry: latest closed month with every day present in the archive (no 80 %-rule). */
export function pickDefaultMonatMonthKey(records: TagesKennzahlRecord[], lastCompleteDayKey: string): string {
  const months = monthsWithData(records);
  for (let i = months.length - 1; i >= 0; i -= 1) {
    const key = months[i];
    if (
      isBerlinMonthCalendarClosed(key, lastCompleteDayKey) &&
      isMonthArchivedComplete(key, records, lastCompleteDayKey)
    ) {
      return key;
    }
  }
  for (let i = months.length - 1; i >= 0; i -= 1) {
    const key = months[i];
    if (isBerlinMonthCalendarClosed(key, lastCompleteDayKey) && monthHasAnyRecord(key, records)) {
      return key;
    }
  }
  return berlinMonthKeyFromDateKey(lastCompleteDayKey);
}

export function adjacentMonthWithData(
  monthKey: string,
  direction: "prev" | "next",
  records: TagesKennzahlRecord[]
): string | null {
  let cursor = monthKey;
  for (let i = 0; i < 240; i += 1) {
    cursor = direction === "prev" ? prevBerlinMonthKey(cursor) : nextBerlinMonthKey(cursor);
    if (monthHasAnyRecord(cursor, records)) {
      return cursor;
    }
    const bounds = recordSeriesBounds(records);
    if (!bounds) {
      return null;
    }
    if (direction === "prev" && cursor < berlinMonthKeyFromDateKey(bounds.firstKey)) {
      return null;
    }
    if (direction === "next" && cursor > berlinMonthKeyFromDateKey(bounds.lastKey)) {
      return null;
    }
  }
  return null;
}

export type MonatDayCell = {
  dateKey: string;
  dayNum: number;
  weekday: string;
  record: TagesKennzahlRecord | null;
  inSeries: boolean;
  future: boolean;
};

export function buildMonatGrid(args: {
  monthKey: string;
  records: TagesKennzahlRecord[];
  todayKey: string;
  lastCompleteDayKey: string;
}): MonatDayCell[] {
  const byDate = new Map(args.records.map((r) => [r.dateKey, r]));
  const bounds = recordSeriesBounds(args.records);
  return daysInBerlinMonth(args.monthKey).map((dateKey) => {
    const record = byDate.get(dateKey) ?? null;
    const inSeries =
      bounds != null && dateKey >= bounds.firstKey && dateKey <= bounds.lastKey && record != null;
    return {
      dateKey,
      dayNum: Number(dateKey.slice(8, 10)),
      weekday: weekdayShort(dateKey, "de"),
      record,
      inSeries,
      future: dateKey > args.lastCompleteDayKey,
    };
  });
}

export function monatPointe(monthKey: string, records: TagesKennzahlRecord[]): { h1: string; subline: string } {
  const monthRecords = records.filter((r) => berlinMonthKeyFromDateKey(r.dateKey) === monthKey);
  const noSurplus = monthRecords.filter((r) => r.surplusGwh < 0.05).length;
  const surplusDays = monthRecords.filter((r) => r.surplusGwh >= 0.05);
  const strongest = surplusDays.reduce<TagesKennzahlRecord | null>(
    (best, r) => (!best || r.surplusGwh > best.surplusGwh ? r : best),
    null
  );
  const label = formatBerlinMonthLabel(monthKey);
  const missing = daysInBerlinMonth(monthKey).filter((d) => !monthRecords.some((r) => r.dateKey === d));
  const h1 = `${noSurplus} Tage ohne Überschuss im ${label}`;
  const subParts = [
    `${monthRecords.length} Tage mit Kennzahlen in der geladenen Reihe.`,
    strongest
      ? `Stärkster Überschuss: ${formatQuantity(strongest.surplusGwh, "de", 1)} GWh am ${formatBerlinDayLabel(strongest.dateKey)}.`
      : null,
    missing.length > 0 ? `${missing.length} Kalendertage fehlen in den Daten.` : null,
  ].filter(Boolean);
  return { h1, subline: subParts.join(" ") };
}
