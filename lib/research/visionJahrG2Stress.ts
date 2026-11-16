import type { VisionJahrModel } from "@/lib/research/visionJahrTypes";

export const G2_Y_AXIS_MAX_GW = 100;

/** Stresstest aus JSON ist an mindestens einer Stufe klar über der beobachteten Spitze. */
export function visionG2StressDistinctFromPeak(model: VisionJahrModel): boolean {
  const peak = model.peakGw;
  return Object.values(model.marktStressTestGw).some((gw) => gw > peak + 0.5);
}