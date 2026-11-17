import type { LabelAnchor } from "@/lib/chartLabelLayout";
import { labelBox } from "@/lib/chartLabelLayout";
import { collidesWithPolyline, estimateTextWidth, labelBoxPx, type PlotPoint } from "@/lib/messerHeroLabels";

/** Y-Achsen-Einheit „GW“: neben/oben dem obersten Tick, nicht in der Tick-Spalte. */
export function yAxisGwUnitPosition(params: {
  padL: number;
  plotTop: number;
  topTickBaselineY: number;
}): { x: number; y: number; anchor: LabelAnchor } {
  const y = Math.min(params.plotTop - 4, params.topTickBaselineY - 18);
  return { x: params.padL + 6, y, anchor: "start" };
}

export function topYTickBaselineY(
  yTicks: number[],
  yMinGw: number,
  yMaxGw: number,
  plotH: number,
  padT: number,
  yGw: (gw: number) => number,
): number {
  const tick = yTicks.length > 0 ? Math.max(...yTicks) : yMaxGw;
  return yGw(tick) + 4;
}

export function boxesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
  gap = 2,
): boolean {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

export function textBoxesCollide(
  specs: Array<{ x: number; y: number; anchor: LabelAnchor; text: string; fontSize: number }>,
): boolean {
  const boxes = specs.map((s) => labelBoxPx(s.x, s.y, s.anchor, s.text, s.fontSize));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i]!, boxes[j]!)) return true;
    }
  }
  return false;
}

export function labelHitsPolyline(
  x: number,
  y: number,
  anchor: LabelAnchor,
  text: string,
  fontSize: number,
  path: PlotPoint[],
): boolean {
  return collidesWithPolyline(labelBoxPx(x, y, anchor, text, fontSize), path, 2);
}

export function estimateSvgTextWidth(text: string, fontSize: number): number {
  return estimateTextWidth(text, fontSize);
}

export function svgLabelBox(
  x: number,
  y: number,
  anchor: LabelAnchor,
  text: string,
  fontSize: number,
) {
  return labelBoxPx(x, y, anchor, text, fontSize);
}

/** Prüft ob eine ViewBox-Box die linke Tick-Spalte (x < padL) überlappt. */
export function overlapsYTickColumn(
  box: { left: number; right: number },
  padL: number,
  tickColumnRight = 46,
): boolean {
  return box.left < tickColumnRight && box.right > padL - 28;
}

export { labelBox };