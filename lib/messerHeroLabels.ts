import type { LabelAnchor } from "@/lib/chartLabelLayout";

const CHAR_W = 7.3;
const LINE_H = 14;

export type PlotPoint = { x: number; y: number };

export type LineEndLabel = {
  text: string;
  lineY: number;
  anchor: LabelAnchor;
  x: number;
  fill: string;
  hideSliderFactor?: number;
};

export function linesWithinPx(yA: number, yB: number, px = 3): boolean {
  return Math.abs(yA - yB) < px;
}

export function labelBoxPx(
  x: number,
  y: number,
  anchor: LabelAnchor,
  text: string,
  fontSize = 12,
): { left: number; right: number; top: number; bottom: number } {
  const charW = fontSize * 0.61;
  const width = Math.max(text.length, 1) * charW;
  const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  return { left, right: left + width, top: y - fontSize, bottom: y + 4 };
}

export function collidesWithPath(
  box: { left: number; right: number; top: number; bottom: number },
  path: PlotPoint[],
  pad = 4,
): boolean {
  return path.some(
    (p) =>
      p.x >= box.left - pad &&
      p.x <= box.right + pad &&
      p.y >= box.top - pad &&
      p.y <= box.bottom + pad,
  );
}

export function placeLineEndLabel(args: {
  text: string;
  lineY: number;
  x: number;
  path: PlotPoint[];
  plotTop: number;
  plotBottom: number;
  fontSize: number;
}): { x: number; y: number; anchor: LabelAnchor } {
  const anchor: LabelAnchor = "end";
  const ySteps = [ -10, -22, 10, 22, -34, 34 ];
  for (const dy of ySteps) {
    const y = Math.min(args.plotBottom - 4, Math.max(args.plotTop + args.fontSize, args.lineY + dy));
    const box = labelBoxPx(args.x, y, anchor, args.text, args.fontSize);
    if (!collidesWithPath(box, args.path)) {
      return { x: args.x, y, anchor };
    }
  }
  return { x: args.x - 8, y: args.lineY - 22, anchor: "end" };
}

export function stackLineEndLabels(
  labels: Array<{ text: string; lineY: number }>,
  x: number,
  fontSize: number,
  minGap = 4,
): Array<{ text: string; y: number }> {
  const sorted = [...labels].sort((a, b) => a.lineY - b.lineY);
  const out: Array<{ text: string; y: number }> = [];
  let lastBottom = -Infinity;
  for (const item of sorted) {
    let y = item.lineY - 10;
    const box = labelBoxPx(x, y, "end", item.text, fontSize);
    if (box.top < lastBottom + minGap) {
      y += lastBottom + minGap - box.top;
    }
    out.push({ text: item.text, y });
    lastBottom = labelBoxPx(x, y, "end", item.text, fontSize).bottom;
  }
  return out;
}