import type { ResidualSlot } from "@/lib/windSolarResidual";

export type LueckeDayKind = "standard-96" | "dst-fall-100" | "dst-spring-92" | "other";

export function lueckeDayKind(slotCount: number): LueckeDayKind {
  if (slotCount === 96) return "standard-96";
  if (slotCount === 100) return "dst-fall-100";
  if (slotCount === 92) return "dst-spring-92";
  return "other";
}

/** Monotonic X: one quarter-hour slot → position (no wall-clock rewind on DST). */
export function plotXFromSlotIndex(
  index: number,
  slotCount: number,
  padLeft: number,
  plotW: number
): number {
  if (slotCount <= 1) return padLeft;
  const t = Math.min(1, Math.max(0, index / (slotCount - 1)));
  return padLeft + t * plotW;
}

function wallClockKey(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** First slot index at local hh:00 (for axis ticks; fall-DST: erste 02:00). */
export function slotIndexAtLocalHour(slots: ResidualSlot[], hour: number): number {
  if (hour >= 24) return Math.max(0, slots.length - 1);
  if (hour === 0) return 0;
  const idx = slots.findIndex((s) => s.hourBerlin === hour && s.minuteBerlin === 0);
  if (idx >= 0) return idx;
  const fallback = slots.findIndex((s) => s.hourBerlin === hour);
  return fallback >= 0 ? fallback : Math.round((hour / 24) * (slots.length - 1));
}

/** Axis/grid hour tick: label hour 0…24 auf derselben Slot-Index-Basis wie die Kurve. */
export function plotXForAxisHour(
  hour: number,
  slots: ResidualSlot[],
  padLeft: number,
  plotW: number
): number {
  return plotXFromSlotIndex(slotIndexAtLocalHour(slots, hour), slots.length, padLeft, plotW);
}

/** Peak marker: letzte passende Viertelstunde (wichtig bei doppelter Herbst-02). */
export function slotIndexForPeakAt(slots: ResidualSlot[], peakAt: string | null): number {
  if (!peakAt) return 0;
  let idx = -1;
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    const s = slots[i];
    if (wallClockKey(s.hourBerlin, s.minuteBerlin) === peakAt) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) return idx;
  return slots.findIndex((s) => wallClockKey(s.hourBerlin, s.minuteBerlin) === peakAt);
}

export function plotXFromPeakAt(
  slots: ResidualSlot[],
  peakAt: string | null,
  padLeft: number,
  plotW: number
): number {
  return plotXFromSlotIndex(slotIndexForPeakAt(slots, peakAt), slots.length, padLeft, plotW);
}

/** @deprecated use plotXFromSlotIndex — nur noch für Tests Standardtag */
export function plotXFromHour(hour: number, padLeft: number, plotW: number): number {
  return padLeft + (hour / 24) * plotW;
}

export function assertMonotonicSlotXs(
  slots: ResidualSlot[],
  padLeft: number,
  plotW: number
): { monotonic: boolean; xs: number[] } {
  const xs = slots.map((_, i) => plotXFromSlotIndex(i, slots.length, padLeft, plotW));
  let monotonic = true;
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] <= xs[i - 1]) {
      monotonic = false;
      break;
    }
  }
  return { monotonic, xs };
}
