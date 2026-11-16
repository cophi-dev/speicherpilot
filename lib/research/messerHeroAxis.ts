import { niceAxis } from "@/lib/niceTicks";
import type { ResearchDayModel, ResearchFactor } from "@/lib/research/researchTypes";

export const MESSER_HERO_PLOT_TOP = 26;
export const MESSER_HERO_PLOT_BOTTOM_PAD = 40;

/** GW values that must fit in the hero y-range (line, caps, peak, 4-h ghost). */
export function messerHeroYValues(model: ResearchDayModel, factor: ResearchFactor): number[] {
  const active = model.stages.find((s) => s.factor === factor);
  if (!active) {
    return [];
  }
  const ghost4hGw = model.peakGw - active.reduction4hGw;
  return [
    ...model.series.map((p) => p.residualGw),
    ...model.stages.map((s) => s.capGw),
    model.peakGw,
    ghost4hGw,
  ].filter((v) => Number.isFinite(v));
}

export function messerHeroAxis(model: ResearchDayModel, factor: ResearchFactor) {
  const vals = messerHeroYValues(model, factor);
  if (vals.length === 0) {
    return niceAxis(0, 1, 4);
  }
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = hi - lo || 1;
  const margin = Math.max(span * 0.08, 0.5);
  lo -= margin;
  hi += margin;
  return niceAxis(lo, hi, 5);
}

export function messerHeroYMap(value: number, yMin: number, yMax: number, height: number): number {
  const inner = height - 66;
  const span = yMax - yMin || 1;
  return MESSER_HERO_PLOT_TOP + ((yMax - value) / span) * inner;
}

export function messerHeroPlotBounds(height: number): { top: number; bottom: number } {
  return { top: MESSER_HERO_PLOT_TOP, bottom: height - MESSER_HERO_PLOT_BOTTOM_PAD };
}

export function messerHeroValueInPlot(
  value: number,
  yMin: number,
  yMax: number,
  height: number,
): boolean {
  const { top, bottom } = messerHeroPlotBounds(height);
  const y = messerHeroYMap(value, yMin, yMax, height);
  return y >= top && y <= bottom;
}