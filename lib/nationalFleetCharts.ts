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

/** Tages-Restlast: Skala nur aus beobachteten, mit-Speicher- und Vergleichswerten — ohne Zwang auf 0. */
export function dayResidualLoadScale(
  points: { rGw: number; rpGw: number }[],
  _compareRpMw: number[] | null,
  height: number,
  pad: number,
): ReturnType<typeof scaleLinear> {
  const vals: number[] = [];
  for (const p of points) {
    vals.push(p.rGw, p.rpGw);
  }
  if (vals.length === 0) {
    return scaleLinear([0, 1], height, pad, 0, 1);
  }
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = hi - lo || 1;
  const margin = Math.max(span * 0.06, 0.15);
  lo -= margin;
  hi += margin;
  return scaleLinear(vals, height, pad, lo, hi);
}

export function yAxisTicks(min: number, max: number, count = 4): number[] {
  if (count < 2 || max <= min) {
    return [min, max];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export function polylinePoints(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${x},${ys[i]}`).join(" ");
}

export function formatPeakEffectLine(
  afterGw: number,
  reductionGw: number,
  reductionPct: number,
  refPeakGw = REF_RESIDUAL_PEAK_GW,
): string {
  const after = formatQuantity(afterGw, "de", 2);
  const delta = formatQuantity(Math.abs(reductionGw), "de", 2);
  const pct = formatQuantity(Math.abs(reductionPct), "de", 1);
  if (reductionGw >= 0.0005) {
    return `Höchste Restlast mit Speicher: ${after} GW (Senkung um ${delta} GW, ${pct} % bezogen auf Referenzspitze ${formatQuantity(refPeakGw, "de", 2)} GW)`;
  }
  if (reductionGw <= -0.0005) {
    return `Höchste Restlast mit Speicher: ${after} GW (${delta} GW höher als ohne dieses Szenario, ${pct} % bezogen auf Referenzspitze ${formatQuantity(refPeakGw, "de", 2)} GW)`;
  }
  return `Höchste Restlast mit Speicher: ${after} GW (ohne nennenswerte Spitzensenkung in diesem Ausschnitt)`;
}

/** Tages-Chart: nur Tages-Spitze; Monatswirkung separat. */
export function formatPeakCaptionDay(peakWithStorageGw: number, reductionDayGw: number, observedPeakGw: number): string {
  const after = formatQuantity(peakWithStorageGw, "de", 2);
  const obs = formatQuantity(observedPeakGw, "de", 2);
  if (Math.abs(reductionDayGw) < 0.0005) {
    return `Tages-Spitze Restlast mit Speicher: ${after} GW (beobachtete Restlast am Tag: ${obs} GW — ohne nennenswerte Tages-Senkung)`;
  }
  const delta = formatQuantity(Math.abs(reductionDayGw), "de", 2);
  if (reductionDayGw >= 0) {
    return `Tages-Spitze Restlast mit Speicher: ${after} GW (beobachtet am Tag: ${obs} GW, Tages-Senkung ${delta} GW)`;
  }
  return `Tages-Spitze Restlast mit Speicher: ${after} GW (beobachtet am Tag: ${obs} GW, am Tag ${delta} GW höher)`;
}

export function formatPeakCaptionMonthContext(
  reductionGw: number,
  reductionPct: number,
): string {
  const delta = formatQuantity(Math.abs(reductionGw), "de", 2);
  const pct = formatQuantity(Math.abs(reductionPct), "de", 1);
  return `Zum Vergleich — Monatslauf gesamt: Spitzensenkung ${delta} GW (${pct} % ggü. Referenz ${formatQuantity(REF_RESIDUAL_PEAK_GW, "de", 2)} GW)`;
}

export type FleetChartTick = { index: number; label: string; align?: "start" | "end" };

export function fleetChartTickIndices(
  points: FleetChartPoint[],
  mode: "day" | "month",
): FleetChartTick[] {
  if (points.length === 0) {
    return [{ index: 0, label: "" }];
  }
  if (mode === "day") {
    const hours = [0, 6, 12, 18];
    const ticks: Array<{ index: number; label: string }> = [];
    for (const h of hours) {
      const idx = h * 4;
      if (idx < points.length) {
        const hm = String(h).padStart(2, "0");
        ticks.push({ index: idx, label: `${hm}:00` });
      }
    }
    const last = points.length - 1;
    if (ticks[ticks.length - 1]?.index !== last) {
      ticks.push({ index: last, label: "24:00" });
    }
    return ticks;
  }
  const wantDays = new Set(["01", "08", "15", "22", "29"]);
  const seen = new Set<string>();
  const ticks: FleetChartTick[] = [];
  for (let j = 0; j < points.length; j += 1) {
    const ts = points[j].ts;
    const day = ts.slice(8, 10);
    const hm = ts.includes("T") ? ts.slice(11, 16) : "";
    if (hm !== "00:00" && !ts.endsWith(" 00:00")) {
      continue;
    }
    if (!wantDays.has(day) || seen.has(day)) {
      continue;
    }
    seen.add(day);
    ticks.push({ index: j, label: `${Number(day)}.`, align: "start" });
  }
  if (ticks.length === 0) {
    ticks.push({ index: 0, label: berlinShortTick(points[0].ts), align: "start" });
  }
  const last = points.length - 1;
  const lastDay = points[last].ts.slice(8, 10);
  const lastNum = Number(lastDay);
  if (ticks[ticks.length - 1]?.index !== last) {
    ticks.push({ index: last, label: `${lastNum}.`, align: "end" });
  } else if (ticks[ticks.length - 1]) {
    ticks[ticks.length - 1] = { ...ticks[ticks.length - 1]!, align: "end" };
  }
  return ticks;
}

