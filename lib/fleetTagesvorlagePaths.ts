import type { FleetChartPoint } from "@/lib/nationalFleetCharts";

const CHARGE_EPS_MW = 0.05;
const DISCHARGE_EPS_MW = 0.05;

export function fleetBandPaths(
  points: FleetChartPoint[],
  xs: number[],
  yR: (v: number) => number,
  yRp: (v: number) => number,
  halfStep: number,
): { charge: string; discharge: string } {
  const chargeParts: string[] = [];
  const dischargeParts: string[] = [];

  for (let j = 0; j < points.length; j += 1) {
    const p = points[j];
    const x0 = xs[j] - halfStep;
    const x1 = xs[j] + halfStep;
    const rY = yR(p.rGw);
    const rpY = yRp(p.rpGw);
    if (p.cMw > CHARGE_EPS_MW && p.rpGw > p.rGw + 1e-6) {
      chargeParts.push(`M ${x0} ${rY} L ${x1} ${rY} L ${x1} ${rpY} L ${x0} ${rpY} Z`);
    }
    if (p.dMw > DISCHARGE_EPS_MW && p.rGw > p.rpGw + 1e-6) {
      dischargeParts.push(`M ${x0} ${rpY} L ${x1} ${rpY} L ${x1} ${rY} L ${x0} ${rY} Z`);
    }
  }

  return {
    charge: chargeParts.join(" "),
    discharge: dischargeParts.join(" "),
  };
}