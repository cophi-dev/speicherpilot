import type { NationalFleetDaySlice } from "@/lib/nationalMonthFleetModel";

export const FLEET_SATURATION_HINT_DE =
  "Ab ×5 ist der Abendberg schon flach. Weiteres Entladen braucht mehr Stunden, nicht mehr GW.";

/** Mindest-Zusatzsenkung ×1→×5, sonst ist die Regel nicht anwendbar (GW). */
export const FLEET_SATURATION_MIN_GAIN_15_GW = 0.001;

/** Sättigung, wenn ×5→×10 weniger als dieser Anteil von ×1→×5 ausmacht. */
export const FLEET_SATURATION_GAIN510_RATIO = 0.1;

/** Tages-Spitzensenkung = beobachtete Restlast-Spitze minus gefahrene R′-Spitze (GW). */
export function dayPeakReductionGw(slice: NationalFleetDaySlice): number {
  return (slice.maxRMw - slice.maxRPrimeMw) / 1000;
}

/**
 * Sättigungssatz nur, wenn die zusätzliche Senkung ×5→×10 am Tag
 * weniger als 10 % der zusätzlichen Senkung ×1→×5 ausmacht.
 */
export function shouldShowFleetSaturationHint(
  sliceX1: NationalFleetDaySlice | null | undefined,
  sliceX5: NationalFleetDaySlice | null | undefined,
  sliceX10: NationalFleetDaySlice | null | undefined,
): boolean {
  if (!sliceX1 || !sliceX5 || !sliceX10) {
    return false;
  }
  const red1 = dayPeakReductionGw(sliceX1);
  const red5 = dayPeakReductionGw(sliceX5);
  const red10 = dayPeakReductionGw(sliceX10);
  const gain15 = red5 - red1;
  const gain510 = red10 - red5;
  if (gain15 < FLEET_SATURATION_MIN_GAIN_15_GW) {
    return false;
  }
  return gain510 < FLEET_SATURATION_GAIN510_RATIO * gain15;
}