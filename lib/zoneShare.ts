import { berlinDateKey } from "@/lib/liveBoard";
import type { QuarterPoint } from "@/lib/liveBoard";

export type ZoneQuarter = {
  unixMs: number;
  hour: number;
  northPct: number;
  southPct: number;
};

const berlinClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function hourOf(unixMs: number): number {
  const parts = berlinClock.formatToParts(new Date(unixMs));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour + (Number.isFinite(minute) ? minute : 0) / 60;
}

function column(points: QuarterPoint[]): Map<number, number | null> {
  const values = new Map<number, number | null>();
  for (const point of points) {
    values.set(point.unixMs, point.value);
  }
  return values;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Wind and solar as a share of load.
 * North is the 50Hertz control area, including offshore wind.
 * South is TransnetBW. That area has no offshore series.
 * A null sample is dropped. A published 0 stays 0.
 */
export function zoneShareQuarters(input: {
  northWindOn: QuarterPoint[];
  northWindOff: QuarterPoint[];
  northPv: QuarterPoint[];
  northLoad: QuarterPoint[];
  southWindOn: QuarterPoint[];
  southPv: QuarterPoint[];
  southLoad: QuarterPoint[];
}): ZoneQuarter[] {
  const northWindOn = column(input.northWindOn);
  const northWindOff = column(input.northWindOff);
  const northPv = column(input.northPv);
  const northLoad = column(input.northLoad);
  const southWindOn = column(input.southWindOn);
  const southPv = column(input.southPv);
  const southLoad = column(input.southLoad);
  const rows: ZoneQuarter[] = [];
  for (const unixMs of [...northLoad.keys()].sort((left, right) => left - right)) {
    const northOn = northWindOn.get(unixMs);
    const northOff = northWindOff.get(unixMs);
    const northSun = northPv.get(unixMs);
    const northDemand = northLoad.get(unixMs);
    const southOn = southWindOn.get(unixMs);
    const southSun = southPv.get(unixMs);
    const southDemand = southLoad.get(unixMs);
    if (
      !finite(northOn) ||
      !finite(northOff) ||
      !finite(northSun) ||
      !finite(northDemand) ||
      !finite(southOn) ||
      !finite(southSun) ||
      !finite(southDemand) ||
      northDemand <= 0 ||
      southDemand <= 0
    ) {
      continue;
    }
    rows.push({
      unixMs,
      hour: hourOf(unixMs),
      northPct: ((northOn + northOff + northSun) / northDemand) * 100,
      southPct: ((southOn + southSun) / southDemand) * 100,
    });
  }
  return rows;
}

export function zoneShareDays(rows: ZoneQuarter[]): Array<{ dateKey: string; slots: ZoneQuarter[] }> {
  const grouped = new Map<string, ZoneQuarter[]>();
  for (const row of rows) {
    const dateKey = berlinDateKey(row.unixMs);
    const list = grouped.get(dateKey) ?? [];
    list.push(row);
    grouped.set(dateKey, list);
  }
  return [...grouped.entries()].map(([dateKey, slots]) => ({ dateKey, slots }));
}
