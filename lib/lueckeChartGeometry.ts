import type { ResidualSlot } from "@/lib/windSolarResidual";

/** Fraction of calendar day [0, 1] for Berlin wall-clock (0 = 00:00, 1 = 24:00). */
export function berlinDayFraction(slot: ResidualSlot): number {
  return (slot.hourBerlin + slot.minuteBerlin / 60) / 24;
}

export function plotXFromFraction(
  fraction: number,
  padLeft: number,
  plotW: number
): number {
  const t = Math.min(1, Math.max(0, fraction));
  return padLeft + t * plotW;
}

export function plotXFromSlot(slot: ResidualSlot, padLeft: number, plotW: number): number {
  return plotXFromFraction(berlinDayFraction(slot), padLeft, plotW);
}

export function plotXFromHour(hour: number, padLeft: number, plotW: number): number {
  return plotXFromFraction(hour / 24, padLeft, plotW);
}
