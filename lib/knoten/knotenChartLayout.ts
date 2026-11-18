import type { KnotenCurvePayload } from "@/lib/knoten/knotenTypes";

export function knotenFormatMwTick(value: number, narrow: boolean): string {
  if (narrow) {
    return Math.round(value).toLocaleString("de-DE");
  }
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

export function knotenPlotMetrics(width: number) {
  const narrow = width < 480;
  const left = narrow ? 44 : 52;
  const right = narrow ? 10 : 16;
  const top = 12;
  const bottom = narrow ? 28 : 32;
  const height = narrow ? 240 : 300;
  const plotW = Math.max(200, width - left - right);
  const plotH = height - top - bottom;
  return { narrow, left, right, top, bottom, height, plotW, plotH, width: left + plotW + right };
}