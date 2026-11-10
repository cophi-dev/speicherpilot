import {
  additionalFleetMw,
  RESEARCH_DISPATCH_ETA,
  RESEARCH_FLEET_DURATION_H,
  RESEARCH_FLEET_POWER_MW,
  RESEARCH_QUARTER_H,
  type ResearchFactor,
} from "@/lib/research/fleetBasis";

const SOC_START = 0.5;
const SOC_MIN = 0.1;
const SOC_MAX = 0.9;

function feasible(residualMw: number[], capMw: number, powerMw: number, energyMwh: number): boolean {
  let socMwh = SOC_START * energyMwh;
  const lo = SOC_MIN * energyMwh;
  const hi = SOC_MAX * energyMwh;
  const endMin = SOC_START * energyMwh;

  for (const r of residualMw) {
    if (r > capMw) {
      const discharge = r - capMw;
      if (discharge > powerMw + 1e-6) return false;
      socMwh -= (discharge * RESEARCH_QUARTER_H) / RESEARCH_DISPATCH_ETA;
      if (socMwh < lo - 1e-4) return false;
    } else {
      const chargeMw = Math.min(powerMw, capMw - r);
      socMwh = Math.min(hi, socMwh + chargeMw * RESEARCH_QUARTER_H * RESEARCH_DISPATCH_ETA);
    }
  }
  return socMwh >= endMin - 1e-4;
}

export function minPeakMw(
  residualMw: number[],
  powerMw: number,
  energyMwh: number,
  iterations = 50
): number {
  if (powerMw <= 0 || energyMwh <= 0 || residualMw.length === 0) {
    return Math.max(...residualMw, 0);
  }
  let lo = Math.min(...residualMw);
  let hi = Math.max(...residualMw);
  for (let i = 0; i < iterations; i += 1) {
    const mid = (lo + hi) / 2;
    if (feasible(residualMw, mid, powerMw, energyMwh)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return hi;
}

export function peakReductionGw(
  residualMw: number[],
  powerMw: number,
  energyMwh: number
): { peakBeforeGw: number; peakAfterGw: number; reductionGw: number; capMw: number } {
  const peakBeforeMw = Math.max(...residualMw);
  const capMw = minPeakMw(residualMw, powerMw, energyMwh);
  const reductionGw = (peakBeforeMw - capMw) / 1000;
  return {
    peakBeforeGw: peakBeforeMw / 1000,
    peakAfterGw: capMw / 1000,
    reductionGw,
    capMw,
  };
}

export function factorReductionGw(
  residualMw: number[],
  factor: ResearchFactor,
  durationH = RESEARCH_FLEET_DURATION_H
): number {
  const { powerMw, energyMwh } = additionalFleetMw(factor, durationH);
  return peakReductionGw(residualMw, powerMw, energyMwh).reductionGw;
}

export function cappedResidualSeriesGw(residualMw: number[], capMw: number): number[] {
  return residualMw.map((r) => Math.min(r, capMw) / 1000);
}

export function saturationCurveGw(
  residualMw: number[],
  maxFactor = 10,
  durationH = RESEARCH_FLEET_DURATION_H
): Array<{ factor: number; reductionGw: number; marginalGwPerGw: number | null }> {
  const points: Array<{ factor: number; reductionGw: number; marginalGwPerGw: number | null }> = [];
  let prev: { factor: number; reductionGw: number; fleetGw: number } | null = null;
  for (let k = 1; k <= maxFactor; k += 1) {
    const { powerMw } = additionalFleetMw(k, durationH);
    const fleetGw = (RESEARCH_FLEET_POWER_MW * k) / 1000;
    const { reductionGw } = peakReductionGw(residualMw, powerMw, additionalFleetMw(k, durationH).energyMwh);
    const marginal =
      prev === null
        ? null
        : (reductionGw - prev.reductionGw) / Math.max(1e-9, fleetGw - prev.fleetGw);
    points.push({ factor: k, reductionGw, marginalGwPerGw: marginal });
    prev = { factor: k, reductionGw, fleetGw };
  }
  return points;
}
