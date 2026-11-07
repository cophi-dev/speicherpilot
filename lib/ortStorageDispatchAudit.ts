import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

const DT_H = 0.25;
const ETA = Math.sqrt(ROUND_TRIP_EFFICIENCY);

export type OrtDispatchAuditInput = {
  chargeMw: number[];
  dischargeMw: number[];
  /** SoC at start of each quarter-hour (MWh). */
  socStartMwh: number[];
  energyMwh: number;
  powerMw: number;
};

export type OrtDispatchAuditReport = {
  simultaneousIntervals: number;
  socMinMwh: number;
  socMaxMwh: number;
  socEndMwh: number;
  socBounds: { min: number; max: number };
  maxEnergyResidualMwh: number;
  maxPowerViolationMw: number;
  ok: boolean;
  violations: string[];
};

export function auditOrtStorageDispatch(input: OrtDispatchAuditInput): OrtDispatchAuditReport {
  const n = Math.min(input.chargeMw.length, input.dischargeMw.length, input.socStartMwh.length);
  const socMin = 0.1 * input.energyMwh;
  const socMax = 0.9 * input.energyMwh;
  const violations: string[] = [];
  let simultaneous = 0;
  let maxResidual = 0;
  let maxPower = 0;
  let socMinObs = Number.POSITIVE_INFINITY;
  let socMaxObs = Number.NEGATIVE_INFINITY;

  for (let t = 0; t < n; t += 1) {
    const c = input.chargeMw[t] ?? 0;
    const d = input.dischargeMw[t] ?? 0;
    if (c > 1e-4 && d > 1e-4) {
      simultaneous += 1;
    }
    maxPower = Math.max(maxPower, Math.max(0, c - input.powerMw), Math.max(0, d - input.powerMw));
    const soc0 = input.socStartMwh[t];
    socMinObs = Math.min(socMinObs, soc0);
    socMaxObs = Math.max(socMaxObs, soc0);
    const soc1 = soc0 + ETA * DT_H * c - (DT_H / ETA) * d;
    if (t + 1 < n) {
      const residual = Math.abs(soc1 - input.socStartMwh[t + 1]);
      maxResidual = Math.max(maxResidual, residual);
    }
    if (soc0 < socMin - 1e-4 || soc0 > socMax + 1e-4) {
      violations.push(`qh${t}: SoC start ${soc0.toFixed(3)} außerhalb [${socMin}, ${socMax}]`);
    }
  }

  const socEnd =
    n > 0
      ? input.socStartMwh[n - 1] +
        ETA * DT_H * (input.chargeMw[n - 1] ?? 0) -
        (DT_H / ETA) * (input.dischargeMw[n - 1] ?? 0)
      : 0.5 * input.energyMwh;
  socMinObs = Math.min(socMinObs, socEnd);
  socMaxObs = Math.max(socMaxObs, socEnd);

  if (socEnd < socMin - 1e-4 || socEnd > socMax + 1e-4) {
    violations.push(`terminal: SoC ${socEnd.toFixed(3)} außerhalb [${socMin}, ${socMax}]`);
  }
  if (simultaneous > 0) {
    violations.push(`${simultaneous} Intervalle mit gleichzeitigem c/d`);
  }

  return {
    simultaneousIntervals: simultaneous,
    socMinMwh: socMinObs,
    socMaxMwh: socMaxObs,
    socEndMwh: socEnd,
    socBounds: { min: socMin, max: socMax },
    maxEnergyResidualMwh: maxResidual,
    maxPowerViolationMw: maxPower,
    ok: violations.length === 0 && maxResidual < 1e-3,
    violations: violations.slice(0, 12),
  };
}
