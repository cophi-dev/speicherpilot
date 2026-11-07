import type { MonatDayCell } from "@/lib/monatCalendar";

export type MonatSurplusBar = {
  dateKey: string;
  dayNum: number;
  surplusGwh: number | null;
  clickable: boolean;
  future: boolean;
  missing: boolean;
};

export function barsFromMonatGrid(grid: MonatDayCell[]): MonatSurplusBar[] {
  return grid.map((cell) => ({
    dateKey: cell.dateKey,
    dayNum: cell.dayNum,
    surplusGwh:
      cell.record && cell.inSeries && !cell.future
        ? cell.record.surplusGwh < 0.05
          ? 0
          : cell.record.surplusGwh
        : cell.inSeries && !cell.future && !cell.record
          ? null
          : null,
    clickable: Boolean(cell.inSeries && cell.record && !cell.future),
    future: cell.future,
    missing: cell.inSeries && !cell.future && !cell.record,
  }));
}
