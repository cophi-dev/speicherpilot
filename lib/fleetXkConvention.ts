import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

/** ×k Anzeige = k-mal die heutige Flotte; im Modell zusätzlich (k−1)× Basis, ×1 = Ist ohne Zusatz. */
export const FLEET_XK_FOOTNOTE_DE =
  "×k = k-mal die heutige Flotte insgesamt (Unterzeile); im Modell: Zusatzflotte = (k−1)× Basis, ×1 = beobachteter Ist-Zustand.";

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
