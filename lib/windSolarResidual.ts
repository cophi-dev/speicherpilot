import { z } from "zod";

import { getBerlinDateKeyFromUnixSeconds } from "@/lib/berlinCalendar";

const QUARTER_HOUR_H = 0.25;

const totalPowerSchema = z.object({
  unix_seconds: z.array(z.number()),
  production_types: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.number().nullable()),
    })
  ),
});

export type ResidualSlot = {
  timestampIso: string;
  hourBerlin: number;
  minuteBerlin: number;
  loadMw: number;
  windMw: number;
  solarMw: number;
};

export type ResidualDay = {
  dateBerlin: string;
  slots: ResidualSlot[];
};

const berlinClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function clockParts(timestampSeconds: number): { hour: number; minute: number } {
  const parts = berlinClock.formatToParts(new Date(timestampSeconds * 1000));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return {
    hour: Number.isFinite(hour) ? hour % 24 : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function findSeries(
  series: Array<{ name: string; data: Array<number | null> }>,
  pattern: RegExp
): Array<{ name: string; data: Array<number | null> }> {
  return series.filter((entry) => pattern.test(entry.name.trim()));
}

function finiteAt(series: { data: Array<number | null> }, index: number): number | null {
  const value = series.data[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Quarter-hours where load, solar and every wind series are published. A null is not 0 MW. */
export function parseWindSolarDays(payload: unknown): ResidualDay[] {
  const parsed = totalPowerSchema.safeParse(payload);
  if (!parsed.success) {
    return [];
  }
  const { unix_seconds: stamps, production_types: series } = parsed.data;
  const load = findSeries(series, /^load\b/i)[0];
  const solar = findSeries(series, /^solar$/i)[0];
  const wind = findSeries(series, /^wind\b/i);
  if (!load || !solar || wind.length === 0) {
    return [];
  }

  const byDate = new Map<string, ResidualSlot[]>();
  for (let index = 0; index < stamps.length; index += 1) {
    const loadMw = finiteAt(load, index);
    const solarMw = finiteAt(solar, index);
    if (loadMw === null || solarMw === null) {
      continue;
    }
    let windMw = 0;
    let windPublished = true;
    for (const entry of wind) {
      const value = finiteAt(entry, index);
      if (value === null) {
        windPublished = false;
        break;
      }
      windMw += value;
    }
    if (!windPublished) {
      continue;
    }
    const stamp = stamps[index];
    const clock = clockParts(stamp);
    const dateBerlin = getBerlinDateKeyFromUnixSeconds(stamp);
    const slot: ResidualSlot = {
      timestampIso: new Date(stamp * 1000).toISOString(),
      hourBerlin: clock.hour,
      minuteBerlin: clock.minute,
      loadMw,
      windMw,
      solarMw,
    };
    const day = byDate.get(dateBerlin);
    if (day) {
      day.push(slot);
    } else {
      byDate.set(dateBerlin, [slot]);
    }
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([dateBerlin, slots]) => ({
      dateBerlin,
      slots: slots.sort((left, right) => left.timestampIso.localeCompare(right.timestampIso)),
    }));
}

export function windSolarSurplusMwh(slots: ResidualSlot[]): number {
  return slots.reduce(
    (sum, slot) => sum + Math.max(0, slot.windMw + slot.solarMw - slot.loadMw) * QUARTER_HOUR_H,
    0
  );
}

/**
 * Today when it has wind-plus-solar surplus. Otherwise the newest earlier day that does.
 * A day with no surplus must not become an empty chart.
 */
export function pickSurplusDay(
  days: ResidualDay[],
  todayKey: string
): { day: ResidualDay; fallback: boolean } | null {
  const withSurplus = days.filter((day) => windSolarSurplusMwh(day.slots) > 0);
  if (withSurplus.length === 0) {
    return null;
  }
  const today = withSurplus.find((day) => day.dateBerlin === todayKey);
  if (today) {
    return { day: today, fallback: false };
  }
  const latest = [...withSurplus].sort((left, right) => (left.dateBerlin < right.dateBerlin ? 1 : -1))[0];
  return { day: latest, fallback: true };
}
