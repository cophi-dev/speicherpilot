import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";

const QUARTER_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Floor unix ms to the start of the Berlin quarter-hour encoded in `timestampIso`. */
export function quarterStartMsFromIso(timestampIso: string): number | null {
  const ms = Date.parse(timestampIso);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return Math.floor(ms / QUARTER_MS) * QUARTER_MS;
}

/** Hourly prices are copied to all four quarter-hours; quarter-hour prices map exactly. */
export function buildQuarterPriceMap(points: DayAheadPricePoint[]): Map<number, number> {
  const map = new Map<number, number>();
  if (points.length === 0) {
    return map;
  }
  const sorted = [...points].sort((left, right) => left.unixMs - right.unixMs);
  let stepMs = QUARTER_MS;
  if (sorted.length >= 2) {
    const delta = sorted[1].unixMs - sorted[0].unixMs;
    if (delta >= HOUR_MS - 1000) {
      stepMs = HOUR_MS;
    }
  }
  for (const point of sorted) {
    if (stepMs === QUARTER_MS) {
      map.set(Math.floor(point.unixMs / QUARTER_MS) * QUARTER_MS, point.eurPerMwh);
    } else {
      const hourStart = Math.floor(point.unixMs / HOUR_MS) * HOUR_MS;
      for (let quarter = 0; quarter < 4; quarter += 1) {
        map.set(hourStart + quarter * QUARTER_MS, point.eurPerMwh);
      }
    }
  }
  return map;
}

export function priceForQuarterIso(map: Map<number, number>, timestampIso: string): number | null {
  const key = quarterStartMsFromIso(timestampIso);
  if (key === null) {
    return null;
  }
  const price = map.get(key);
  return price !== undefined ? price : null;
}

export function mergeDayAheadPrices(...groups: DayAheadPricePoint[][]): DayAheadPricePoint[] {
  const map = buildQuarterPriceMap(groups.flat());
  return [...map.entries()]
    .sort(([left], [right]) => left - right)
    .map(([unixMs, eurPerMwh]) => ({ unixMs, eurPerMwh }));
}
