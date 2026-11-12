import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

/** ×k = k-mal die heutige Flotte insgesamt; ×1 = Ist-Zustand ((k−1) zusätzlich ab ×2). */
export const FLEET_XK_FOOTNOTE_DE =
  "×k = k-mal die heutige Flotte insgesamt; ×1 = beobachteter Ist-Zustand im Modell.";

export function totalFleetAtFactor(factor: number): { powerMw: number; energyMwh: number } {
  return {
    powerMw: NATIONAL_BASE_FLEET.powerMw * factor,
    energyMwh: NATIONAL_BASE_FLEET.energyMwh * factor,
  };
}

export function additionalFleetAtFactor(factor: number): { powerMw: number; energyMwh: number } {
  const add = Math.max(0, factor - 1);
  return {
    powerMw: NATIONAL_BASE_FLEET.powerMw * add,
    energyMwh: NATIONAL_BASE_FLEET.energyMwh * add,
  };
}

export function fleetPowerGwLabel(factor: number, decimals = 1): string {
  const gw = (NATIONAL_BASE_FLEET.powerMw * factor) / 1000;
  return gw.toFixed(decimals).replace(".", ",");
}
