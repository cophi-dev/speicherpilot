import type { AppLanguage } from "@/components/language-context";
import type { NationalFleetRunSeries } from "@/lib/nationalMonthFleetModel";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";

function unitCopy(text: string): string {
  return insertDisplayUnitNbsp(text);
}

export const REF_RESIDUAL_PEAK_GW = 64.4059;

export const REFERENCE_PEAK_MONTH_DE = "Oktober 2026";
export const REFERENCE_PEAK_MONTH_EN = "October 2026";

export type PeakReference =
  | { kind: "month"; refPeakGw?: number }
  | { kind: "day"; dateKey: string; refPeakGw: number };

export function defaultMonthPeakReference(): PeakReference {
  return { kind: "month", refPeakGw: REF_RESIDUAL_PEAK_GW };
}

export function peakReductionPctVsReference(refPeakGw: number, afterGw: number): number {
  if (refPeakGw <= 0) {
    return 0;
  }
  return ((refPeakGw - afterGw) / refPeakGw) * 100;
}

export function formatReferencePeakCaption(reference: PeakReference, language: AppLanguage = "de"): string {
  if (reference.kind === "day") {
    const dateLabel = formatBerlinDayLabel(reference.dateKey);
    const gw = formatQuantityUnit(reference.refPeakGw, language, 2, "GW");
    return unitCopy(
      language === "de"
        ? `Höchste Restlast am ${dateLabel}: ${gw}, Verbrauch minus Wind und Sonne`
        : `Highest residual load on ${dateLabel}: ${gw}, consumption minus wind and solar`,
    );
  }
  const refGw = reference.refPeakGw ?? REF_RESIDUAL_PEAK_GW;
  const gw = formatQuantityUnit(refGw, language, 2, "GW");
  const month = language === "de" ? REFERENCE_PEAK_MONTH_DE : REFERENCE_PEAK_MONTH_EN;
  return unitCopy(
    language === "de" ? `Höchste Restlast ${month}: ${gw}` : `Highest residual load ${month}: ${gw}`,
  );
}

type PeakCopyOptions = {
  reference?: PeakReference;
  language?: AppLanguage;
};

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

export function formatPeakKpiParts(
  afterGw: number,
  reductionGw: number,
  reductionPct: number,
  options?: PeakCopyOptions,
): { value: string; note: string; noteEn: string } {
  const language = options?.language ?? "de";
  const reference = options?.reference ?? defaultMonthPeakReference();
  const refCaption = formatReferencePeakCaption(reference, language);
  const refCaptionEn = formatReferencePeakCaption(reference, "en");
  const after = formatQuantityUnit(afterGw, language, 2, "GW");
  const pct = formatQuantityUnit(Math.abs(reductionPct), language, 1, "%");
  const delta = formatQuantityUnit(Math.abs(reductionGw), language, 2, "GW");
  const value = after;
  if (reductionGw >= 0.0005) {
    const note = unitCopy(
      language === "de"
        ? `(Senkung ${delta}, ${pct} bezogen auf ${refCaption})`
        : `(Reduction ${delta}, ${pct} vs. ${refCaption})`,
    );
    const noteEn = unitCopy(
      `(Reduction ${formatQuantityUnit(Math.abs(reductionGw), "en", 2, "GW")}, ${formatQuantityUnit(Math.abs(reductionPct), "en", 1, "%")} vs. ${refCaptionEn})`,
    );
    return { value, note, noteEn };
  }
  if (reductionGw <= -0.0005) {
    const note = unitCopy(
      language === "de"
        ? `(${delta} höher als ohne dieses Szenario, ${pct} bezogen auf ${refCaption})`
        : `(${delta} above this scenario baseline, ${pct} vs. ${refCaption})`,
    );
    const noteEn = unitCopy(
      `(${formatQuantityUnit(Math.abs(reductionGw), "en", 2, "GW")} above this scenario baseline, ${formatQuantityUnit(Math.abs(reductionPct), "en", 1, "%")} vs. ${refCaptionEn})`,
    );
    return { value, note, noteEn };
  }
  const flat =
    language === "de" ? "(keine Änderung der Monatsspitze)" : "(no change to the monthly peak)";
  return { value, note: flat, noteEn: "(no change to the monthly peak)" };
}

export function formatPeakKpi(
  afterGw: number,
  reductionGw: number,
  reductionPct: number,
  options?: PeakCopyOptions,
): string {
  const { value, note } = formatPeakKpiParts(afterGw, reductionGw, reductionPct, options);
  return `${value} ${note}`;
}

export function formatPeakKpiBilingual(
  afterGw: number,
  reductionGw: number,
  reductionPct: number,
  options?: Omit<PeakCopyOptions, "language">,
): { de: string; en: string } {
  const de = formatPeakKpi(afterGw, reductionGw, reductionPct, { ...options, language: "de" });
  const en = formatPeakKpi(afterGw, reductionGw, reductionPct, { ...options, language: "en" });
  return { de, en };
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
  options?: PeakCopyOptions,
): string {
  const language = options?.language ?? "de";
  const reference = options?.reference ?? defaultMonthPeakReference();
  const refCaption = formatReferencePeakCaption(reference, language);
  const after = formatQuantityUnit(afterGw, language, 2, "GW");
  const delta = formatQuantityUnit(Math.abs(reductionGw), language, 2, "GW");
  const pct = formatQuantityUnit(Math.abs(reductionPct), language, 1, "%");
  if (reductionGw >= 0.0005) {
    return unitCopy(
      language === "de"
        ? `Höchste Restlast mit Speicher: ${after} (Senkung um ${delta}, ${pct} bezogen auf ${refCaption})`
        : `Highest residual load with storage: ${after} (reduction of ${delta}, ${pct} vs. ${refCaption})`,
    );
  }
  if (reductionGw <= -0.0005) {
    return unitCopy(
      language === "de"
        ? `Höchste Restlast mit Speicher: ${after} (${delta} höher als ohne dieses Szenario, ${pct} bezogen auf ${refCaption})`
        : `Highest residual load with storage: ${after} (${delta} above this scenario baseline, ${pct} vs. ${refCaption})`,
    );
  }
  return unitCopy(
    language === "de"
      ? `Höchste Restlast mit Speicher: ${after} (ohne nennenswerte Spitzensenkung in diesem Ausschnitt)`
      : `Highest residual load with storage: ${after} (no meaningful peak reduction in this window)`,
  );
}

/** Tages-Chart: nur Tagesspitze; Monatswirkung separat. */
export function formatPeakCaptionDay(peakWithStorageGw: number, reductionDayGw: number, observedPeakGw: number): string {
  const after = formatQuantityUnit(peakWithStorageGw, "de", 2, "GW");
  const obs = formatQuantityUnit(observedPeakGw, "de", 2, "GW");
  if (Math.abs(reductionDayGw) < 0.0005) {
    return unitCopy(
      `Tagesspitze Restlast mit Speicher: ${after} (beobachtete Restlast am Tag: ${obs} — ohne nennenswerte Tages-Senkung)`,
    );
  }
  const delta = formatQuantityUnit(Math.abs(reductionDayGw), "de", 2, "GW");
  if (reductionDayGw >= 0) {
    return unitCopy(
      `Tagesspitze Restlast mit Speicher: ${after} (beobachtet am Tag: ${obs}, Tages-Senkung ${delta})`,
    );
  }
  return unitCopy(
    `Tagesspitze Restlast mit Speicher: ${after} (beobachtet am Tag: ${obs}, am Tag ${delta} höher)`,
  );
}

export function formatPeakCaptionMonthContext(
  reductionGw: number,
  reductionPct: number,
  options?: PeakCopyOptions,
): string {
  const language = options?.language ?? "de";
  const refCaption = formatReferencePeakCaption(options?.reference ?? defaultMonthPeakReference(), language);
  const delta = formatQuantityUnit(Math.abs(reductionGw), language, 2, "GW");
  const pct = formatQuantityUnit(Math.abs(reductionPct), language, 1, "%");
  return unitCopy(
    language === "de"
      ? `Zum Vergleich — Monatslauf gesamt: Spitzensenkung ${delta} (${pct} ggü. ${refCaption})`
      : `For comparison — full month run: peak reduction ${delta} (${pct} vs. ${refCaption})`,
  );
}

export function formatDayPeakKpiFromSlice(
  peakRpGw: number,
  peakObservedGw: number,
  dateKey: string,
): { reductionGw: number; reductionPct: number; reference: PeakReference } {
  const reductionGw = peakObservedGw - peakRpGw;
  const reductionPct = peakReductionPctVsReference(peakObservedGw, peakRpGw);
  return {
    reductionGw,
    reductionPct,
    reference: { kind: "day", dateKey, refPeakGw: peakObservedGw },
  };
}

const TAG_DAY_PEAK_NBSP = "\u00a0";

/** Kopfzeile „03 · Tageshorizont“ am Tag: eine Zeile ohne doppelte GW-Wiederholung. */
export function formatTagDayPeakHeadline(
  observedGw: number,
  afterGw: number,
  reductionGw: number,
  reductionPct: number,
): string {
  const obs = formatQuantity(observedGw, "de", 2);
  const aft = formatQuantity(afterGw, "de", 2);
  const pct = formatQuantity(Math.abs(reductionPct), "de", 1);
  if (reductionGw >= 0.0005) {
    const delta = formatQuantity(Math.abs(reductionGw), "de", 2);
    return `Tagesspitze ${obs} → ${aft}${TAG_DAY_PEAK_NBSP}GW (−${delta}${TAG_DAY_PEAK_NBSP}GW, −${pct}${TAG_DAY_PEAK_NBSP}%)`;
  }
  if (reductionGw <= -0.0005) {
    const delta = formatQuantity(Math.abs(reductionGw), "de", 2);
    return `Tagesspitze ${obs} → ${aft}${TAG_DAY_PEAK_NBSP}GW (+${delta}${TAG_DAY_PEAK_NBSP}GW, +${pct}${TAG_DAY_PEAK_NBSP}%)`;
  }
  return `Tagesspitze ${obs} → ${aft}${TAG_DAY_PEAK_NBSP}GW (ohne nennenswerte Tages-Senkung)`;
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

