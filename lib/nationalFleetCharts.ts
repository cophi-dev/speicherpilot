import type { NationalFleetRunSeries } from "@/lib/nationalMonthFleetModel";
import { formatQuantity } from "@/lib/formatQuantity";

export const REF_RESIDUAL_PEAK_GW = 64.4059;

export type FleetChartPoint = {
  i: number;
  ts: string;
  label: string;
  rGw: number;
  rpGw: number;
  cMw: number;
  dMw: number;
  socGwh: number;
};

export function berlinShortTick(ts: string): string {
  if (ts.includes("T")) {
    const d = ts.slice(8, 10);
    const hm = ts.slice(11, 16);
    return hm === "00:00" ? `${d}.` : hm;
  }
  return ts;
}

/** Peak-preserving buckets for overview strips (daily min/max SoC only — not for R maxima). */
export function bucketPeaks(values: number[], bucketSize: number, mode: "max" | "min" | "last"): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i += bucketSize) {
    const slice = values.slice(i, i + bucketSize);
    if (slice.length === 0) {
      continue;
    }
    if (mode === "max") {
      out.push(Math.max(...slice));
    } else if (mode === "min") {
      out.push(Math.min(...slice));
    } else {
      out.push(slice[slice.length - 1]);
    }
  }
  return out;
}

export function fleetChartPoints(run: NationalFleetRunSeries): FleetChartPoint[] {
  return fleetChartPointsForIndices(run);
}

export type FleetChartSeries = Pick<
  NationalFleetRunSeries,
  "timestamp_berlin" | "r_mw" | "r_prime_mw" | "c_mw" | "d_mw" | "e_start_mwh"
>;

export function fleetChartPointsForIndices(run: FleetChartSeries, indices?: number[]): FleetChartPoint[] {
  const idx = indices ?? run.timestamp_berlin.map((_, i) => i);
  return idx.map((i) => {
    const ts = run.timestamp_berlin[i];
    return {
      i,
      ts,
      label: berlinShortTick(ts),
      rGw: run.r_mw[i] / 1000,
      rpGw: run.r_prime_mw[i] / 1000,
      cMw: run.c_mw[i],
      dMw: run.d_mw[i],
      socGwh: run.e_start_mwh[i] / 1000,
    };
  });
}

export function formatPeakKpi(afterGw: number, reductionGw: number, reductionPct: number): string {
  const after = formatQuantity(afterGw, "de", 2);
  const pct = formatQuantity(Math.abs(reductionPct), "de", 1);
  const delta = formatQuantity(Math.abs(reductionGw), "de", 2);
  if (reductionGw >= 0.0005) {
    return `${after} GW (Senkung ${delta} GW, ${pct} % zur Referenzspitze 64,41 GW)`;
  }
  if (reductionGw <= -0.0005) {
    return `${after} GW (${delta} GW höher als ohne dieses Szenario, ${pct} % zur Referenzspitze 64,41 GW)`;
  }
  return `${after} GW (keine Änderung der Monatsspitze)`;
}

export function peakIndexRp(run: FleetChartSeries): number {
  let best = 0;
  for (let i = 1; i < run.r_prime_mw.length; i += 1) {
    if (run.r_prime_mw[i] > run.r_prime_mw[best]) {
      best = i;
    }
  }
  return best;
}

export function scaleLinear(values: number[], height: number, pad: number, minOverride?: number, maxOverride?: number): {
  min: number;
  max: number;
  y: (v: number) => number;
} {
  const min = minOverride ?? Math.min(...values);
  const max = maxOverride ?? Math.max(...values);
  const span = max - min || 1;
  return {
    min,
    max,
    y: (v) => pad + ((max - v) / span) * (height - 2 * pad),
  };
}

export function polylinePoints(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${x},${ys[i]}`).join(" ");
}

export function formatPeakEffectLine(
  afterGw: number,
  reductionGw: number,
  reductionPct: number,
): string {
  const after = formatQuantity(afterGw, "de", 2);
  const delta = formatQuantity(Math.abs(reductionGw), "de", 2);
  const pct = formatQuantity(Math.abs(reductionPct), "de", 1);
  if (reductionGw >= 0.0005) {
    return `Höchste Restlast mit Speicher: ${after} GW (Senkung um ${delta} GW, ${pct} % bezogen auf Referenzspitze ${formatQuantity(REF_RESIDUAL_PEAK_GW, "de", 2)} GW)`;
  }
  if (reductionGw <= -0.0005) {
    return `Höchste Restlast mit Speicher: ${after} GW (${delta} GW höher als ohne dieses Szenario, ${pct} % bezogen auf Referenzspitze ${formatQuantity(REF_RESIDUAL_PEAK_GW, "de", 2)} GW)`;
  }
  return `Höchste Restlast mit Speicher: ${after} GW (unverändert zur beobachteten Spitze)`;
}

