import type { KnotenCurvePayload, KnotenTyp } from "@/lib/knoten/knotenTypes";

const MINUS = "\u2212";

function formatSignedDeNumber(value: number, narrow: boolean): string {
  const abs = Math.abs(value);
  const body = narrow
    ? Math.round(abs).toLocaleString("de-DE")
    : abs.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return value < 0 ? `${MINUS}${body}` : body;
}

export function knotenFormatMwTick(value: number, narrow: boolean): string {
  return formatSignedDeNumber(value, narrow);
}

export function knotenYTicks(min: number, max: number, narrow: boolean): number[] {
  const span = max - min || 1;
  const target = narrow ? 4 : 6;
  const rawStep = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const candidates = [1, 2, 5, 10].map((m) => m * magnitude);
  const step = candidates.find((s) => span / s <= target + 1) ?? candidates[candidates.length - 1]!;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + step * 0.01; t += step) {
    ticks.push(Math.round(t * 1000) / 1000);
  }
  if (!ticks.includes(0) && min < 0 && max > 0) {
    ticks.push(0);
    ticks.sort((a, b) => a - b);
  }
  return ticks;
}

export function knotenYDomain(curve: KnotenCurvePayload, lim: number): { min: number; max: number } {
  const vals = [...curve.base, ...curve.fm, ...curve.fk];
  const nearLim = vals.some((v) => Math.abs(Math.abs(v) - Math.abs(lim)) < Math.abs(lim) * 0.2);
  if (nearLim) {
    vals.push(lim);
  }
  const dataMin = Math.min(...vals);
  const dataMax = Math.max(...vals);
  const span = Math.max(dataMax - dataMin, 12);
  const pad = Math.max(span * 0.02, 2);
  let min = dataMin - pad;
  let max = dataMax + pad;
  if (min < 0 && max > 0 && dataMin >= 0) {
    min = 0;
  }
  if (max > 0 && dataMax <= 0) {
    max = Math.min(max, dataMax + pad);
  }
  if (min < 0 && dataMin < 0) {
    min = Math.min(min, lim < 0 ? lim - pad : min);
  }
  return { min, max };
}

export function knotenLimitLabelLayout(
  typ: KnotenTyp,
  layout: ReturnType<typeof knotenPlotMetrics>,
  yAtLim: number,
): { x: number; y: number; anchor: "start" | "end" } {
  const isStadt = typ === "stadt";
  if (layout.narrow && !isStadt) {
    return {
      x: layout.left + layout.plotW - 6,
      y: Math.max(11, layout.top - layout.labelBand + 10),
      anchor: "end",
    };
  }
  const y = yAtLim + (yAtLim <= layout.top + layout.plotH * 0.4 ? 14 : -8);
  return {
    x: layout.left + layout.plotW - 10,
    y,
    anchor: "end",
  };
}

export function knotenPlotMetrics(width: number, typ?: KnotenTyp) {
  const narrow = width < 480;
  const isStadt = typ === "stadt";
  const labelBand = narrow && typ != null && !isStadt ? 22 : 0;
  const left = narrow ? 52 : 56;
  const right = narrow ? 14 : 18;
  const top = 12 + labelBand;
  const bottom = narrow ? 28 : 32;
  const height = (narrow ? 240 : 300) + labelBand;
  const plotW = Math.max(200, width - left - right);
  const plotH = height - top - bottom;
  return { narrow, left, right, top, bottom, height, plotW, plotH, labelBand, width: left + plotW + right };
}