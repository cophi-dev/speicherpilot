import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

const QUARTER_HOUR_H = 0.25;

export const STORAGE_FACTORS = [1, 2, 3, 5, 10] as const;

export type StorageFactor = (typeof STORAGE_FACTORS)[number];

export type StorageDayPick = "today" | "yesterday" | "sunniest" | "windiest";

export type StorageDayCatalog = {
  todayKey: string;
  yesterdayKey: string;
  today: string | null;
  yesterday: string | null;
  sunniest: string | null;
  windiest: string | null;
};

export function parseStorageFactor(value: string | null): StorageFactor {
  const parsed = Number(value);
  if (STORAGE_FACTORS.some((factor) => factor === parsed)) {
    return parsed as StorageFactor;
  }
  return 1;
}

export function shiftBerlinDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatBerlinDateKeyFromUtcDate(new Date(Date.UTC(year, month - 1, day + days, 12)));
}

function energyMwh(slots: ResidualSlot[], key: "windMw" | "solarMw"): number {
  return slots.reduce((sum, slot) => sum + slot[key] * QUARTER_HOUR_H, 0);
}

function richest(days: ResidualDay[], key: "windMw" | "solarMw"): ResidualDay | null {
  if (days.length === 0) {
    return null;
  }
  return days.reduce((best, day) => (energyMwh(day.slots, key) > energyMwh(best.slots, key) ? day : best));
}

/** Today, yesterday, and the sunniest and windiest published days of this Berlin month. */
export function storageDayCatalog(days: ResidualDay[], todayKey: string): StorageDayCatalog {
  const yesterdayKey = shiftBerlinDateKey(todayKey, -1);
  const month = todayKey.slice(0, 7);
  const inMonth = days.filter((day) => day.dateBerlin.startsWith(month));
  const pool = inMonth.length > 0 ? inMonth : days;
  const has = (key: string) => days.some((day) => day.dateBerlin === key);
  return {
    todayKey,
    yesterdayKey,
    today: has(todayKey) ? todayKey : null,
    yesterday: has(yesterdayKey) ? yesterdayKey : null,
    sunniest: richest(pool, "solarMw")?.dateBerlin ?? null,
    windiest: richest(pool, "windMw")?.dateBerlin ?? null,
  };
}
