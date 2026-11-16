import type { LiveDayPlausibilityResult, LiveResidualPoint } from "@/lib/liveDayPlausibility";

/** Feste Berlin-Tagesachse 00–24: x aus Uhrzeit, nicht aus Slot-Index. */
export function plotXFromBerlinHour(hourFraction: number, padLeft: number, plotW: number): number {
  const clamped = Math.min(24, Math.max(0, hourFraction));
  return padLeft + (clamped / 24) * plotW;
}

export function quarterWidthPx(plotW: number): number {
  return plotW / 96;
}

/** Nur Viertelstunden, deren Beginn vor Stand-Ende liegt. */
export function chartPointsWithinStand(result: LiveDayPlausibilityResult): LiveResidualPoint[] {
  return result.points.filter((point) => Date.parse(point.slot.timestampIso) < result.standEndUnixMs);
}

export function lastChartHourFraction(result: LiveDayPlausibilityResult): number | null {
  const visible = chartPointsWithinStand(result);
  if (visible.length === 0) {
    return null;
  }
  return visible[visible.length - 1]!.hour;
}

export function standHourFraction(standEndUnixMs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(standEndUnixMs));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return (Number.isFinite(hour) ? hour % 24 : 0) + (Number.isFinite(minute) ? minute : 0) / 60;
}

export function hmToHourFraction(hm: string): number {
  const [hour, minute] = hm.split(":");
  return Number(hour) + Number(minute ?? 0) / 60;
}