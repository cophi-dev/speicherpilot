import { additionalFleetAtFactor } from "@/lib/fleetXkConvention";
import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";

const USABLE = CHAIN_SOC_MAX - CHAIN_SOC_MIN;

export type NationalFactorRunLike = {
  factor: number;
  nameplateEnergyMwh: number;
  nameplatePowerMw: number;
  usableEnergyCapMwh: number;
  maxSocMwhObserved: number;
  quarters: Array<{ chargeMw: number; dischargeMw: number }>;
};

export function expectedNationalCaps(factor: number): { energyMwh: number; powerMw: number; usableMwh: number } {
  const { energyMwh, powerMw } = additionalFleetAtFactor(factor);
  return {
    energyMwh,
    powerMw,
    usableMwh: energyMwh * USABLE,
  };
}

export function auditNationalFactorRun(run: NationalFactorRunLike): string[] {
  const errors: string[] = [];
  const expected = expectedNationalCaps(run.factor);
  const tol = 1e-3;
  if (Math.abs(run.nameplateEnergyMwh - expected.energyMwh) > tol) {
    errors.push(`energyMwh ${run.nameplateEnergyMwh} != ${expected.energyMwh}`);
  }
  if (Math.abs(run.nameplatePowerMw - expected.powerMw) > tol) {
    errors.push(`powerMw ${run.nameplatePowerMw} != ${expected.powerMw}`);
  }
  if (Math.abs(run.usableEnergyCapMwh - expected.usableMwh) > tol) {
    errors.push(`usableCap ${run.usableEnergyCapMwh} != ${expected.usableMwh}`);
  }
  if (run.maxSocMwhObserved > expected.usableMwh + 0.05) {
    errors.push(`maxSoc ${run.maxSocMwhObserved} > usable ${expected.usableMwh}`);
  }
  for (const q of run.quarters) {
    if (q.chargeMw > expected.powerMw + 1e-4) {
      errors.push(`charge ${q.chargeMw} > P ${expected.powerMw}`);
    }
    if (q.dischargeMw > expected.powerMw + 1e-4) {
      errors.push(`discharge ${q.dischargeMw} > P ${expected.powerMw}`);
    }
  }
  return errors;
}
