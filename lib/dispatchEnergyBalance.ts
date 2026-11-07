import type { SurplusDayQuarter } from "@/lib/surplusDaySimulation";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

const DT_H = 0.25;

export type EnergyBalanceRow = {
  index: number;
  timestampIso: string;
  chargeMw: number;
  dischargeMw: number;
  socMwhObserved: number;
  socMwhExpected: number;
  residualMwh: number;
};

export type EnergyBalanceReport = {
  etaDischarge: number;
  dtHours: number;
  rows: EnergyBalanceRow[];
  maxResidualMwh: number;
  convention: string;
};

/**
 * Independent SoC walk: charge adds energy at unity; discharge removes battery-side MWh / eta.
 * Matches `evaluateSurplusDayFactor` in surplusDaySimulation.ts (RTE only on discharge).
 */
export function verifySurplusDispatchEnergyBalance(quarters: SurplusDayQuarter[]): EnergyBalanceReport {
  let soc = 0;
  const rows: EnergyBalanceRow[] = [];
  let maxResidual = 0;

  for (let index = 0; index < quarters.length; index += 1) {
    const q = quarters[index];
    const chargeMwh = q.chargeMw * DT_H;
    const dischargeGridMwh = q.dischargeMw * DT_H;
    const fromBatteryMwh = dischargeGridMwh / ROUND_TRIP_EFFICIENCY;
    soc = Math.max(0, soc + chargeMwh - fromBatteryMwh);
    const residual = Math.abs(soc - q.socMwh);
    maxResidual = Math.max(maxResidual, residual);
    rows.push({
      index,
      timestampIso: q.timestampIso,
      chargeMw: q.chargeMw,
      dischargeMw: q.dischargeMw,
      socMwhObserved: q.socMwh,
      socMwhExpected: soc,
      residualMwh: residual,
    });
  }

  return {
    etaDischarge: ROUND_TRIP_EFFICIENCY,
    dtHours: DT_H,
    rows,
    maxResidualMwh: maxResidual,
    convention: `E0=0; E += c*${DT_H}h; E -= (d*${DT_H}h)/${ROUND_TRIP_EFFICIENCY}`,
  };
}
