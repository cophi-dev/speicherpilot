import type { ResidualSlot } from "@/lib/windSolarResidual";

export const LUECKE_QUARTER_MINUTES = 15;

/** Shared with the price strip so both x-axes land on the same pixels. */
export const LUECKE_DESKTOP = { w: 1152, h: 360, pad: { top: 40, right: 24, bottom: 36, left: 56 } };
export const LUECKE_MOBILE_H = 240;
export const LUECKE_MOBILE_PAD = { top: 8, right: 14, bottom: 22, left: 36 };

export type LueckeDayKind = "standard-96" | "dst-fall-100" | "dst-spring-92" | "other";

export function lueckeDayKind(slotCount: number): LueckeDayKind {
  if (slotCount === 96) return "standard-96";
  if (slotCount === 100) return "dst-fall-100";
  if (slotCount === 92) return "dst-spring-92";
  return "other";
}

/** Kalendertag in Berlin: N Viertelstunden → N×15 Minuten bis Mitternacht (24:00). */
export function lueckeDayDurationMinutes(slotCount: number): number {
  return slotCount * LUECKE_QUARTER_MINUTES;
}

/** Anteil [0,1]: Intervallbeginn des Slots i (23:45 < 1; 24:00 = 1 nur an Achsentick). */
export function slotElapsedFraction(index: number, slotCount: number): number {
  const dayMin = lueckeDayDurationMinutes(slotCount);
  if (dayMin <= 0) return 0;
  return Math.min(1, Math.max(0, (index * LUECKE_QUARTER_MINUTES) / dayMin));
}

export function plotXFromSlotIndex(
  index: number,
  slotCount: number,
  padLeft: number,
  plotW: number
): number {
  return padLeft + slotElapsedFraction(index, slotCount) * plotW;
}

function wallClockKey(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Erste hh:00-Stelle in Zeitreihenfolge (Herbst: erste 02:00 vor zweiter). */
export function slotIndexAtLocalHour(slots: ResidualSlot[], hour: number): number {
  if (hour === 0) return 0;
  const idx = slots.findIndex((s) => s.hourBerlin === hour && s.minuteBerlin === 0);
  if (idx >= 0) return idx;
  const fallback = slots.findIndex((s) => s.hourBerlin === hour);
  return fallback >= 0 ? fallback : Math.round((hour / 24) * (slots.length - 1));
}

/** Gitter 00…23 = Intervallbeginn; 24 = nächste Mitternacht (Fraktion 1), nicht letzter Slot. */
export function plotXForAxisHour(
  hour: number,
  slots: ResidualSlot[],
  padLeft: number,
  plotW: number
): number {
  if (hour >= 24) return padLeft + plotW;
  return plotXFromSlotIndex(slotIndexAtLocalHour(slots, hour), slots.length, padLeft, plotW);
}

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
  return Math.max(0, slots.findIndex((s) => wallClockKey(s.hourBerlin, s.minuteBerlin) === peakAt));
}

export function plotXFromPeakAt(
  slots: ResidualSlot[],
  peakAt: string | null,
  padLeft: number,
  plotW: number
): number {
  return plotXFromSlotIndex(slotIndexForPeakAt(slots, peakAt), slots.length, padLeft, plotW);
}

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

/** Indizes der ersten Viertelstunde in jeder lokalen hh:00 (zwei für Herbst-02). */
export function localHourZeroIndices(slots: ResidualSlot[], hour: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    const s = slots[i];
    if (s.hourBerlin === hour && s.minuteBerlin === 0) {
      out.push(i);
    }
  }
  return out;
}
