import type { LabelAnchor } from "@/lib/chartLabelLayout";

export type PlotPoint = { x: number; y: number };

export type LineEndLabel = {
  text: string;
  lineY: number;
  anchor: LabelAnchor;
  x: number;
  fill: string;
  hideSliderFactor?: number;
};

export type PlacedLineLabel = {
  x: number;
  y: number;
  anchor: LabelAnchor;
  leader?: { x1: number; y1: number; x2: number; y2: number };
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

function pointInBox(
  px: number,
  py: number,
  box: { left: number; right: number; top: number; bottom: number },
  pad = 0,
): boolean {
  return px >= box.left - pad && px <= box.right + pad && py >= box.top - pad && py <= box.bottom + pad;
}

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(den) < 1e-9) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentIntersectsBox(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  box: { left: number; right: number; top: number; bottom: number },
  pad = 0,
): boolean {
  if (pointInBox(ax, ay, box, pad) || pointInBox(bx, by, box, pad)) return true;
  const { left, right, top, bottom } = box;
  const edges: Array<[number, number, number, number]> = [
    [left - pad, top - pad, right + pad, top - pad],
    [left - pad, bottom + pad, right + pad, bottom + pad],
    [left - pad, top - pad, left - pad, bottom + pad],
    [right + pad, top - pad, right + pad, bottom + pad],
  ];
  return edges.some(([x1, y1, x2, y2]) => segmentsIntersect(ax, ay, bx, by, x1, y1, x2, y2));
}

export function collidesWithPolyline(
  box: { left: number; right: number; top: number; bottom: number },
  path: PlotPoint[],
  pad = 2,
): boolean {
  if (path.length === 0) return false;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    if (pointInBox(p.x, p.y, box, pad)) return true;
  }
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    if (segmentIntersectsBox(a.x, a.y, b.x, b.y, box, pad)) return true;
  }
  return false;
}

/** @deprecated use collidesWithPolyline */
export function collidesWithPath(
  box: { left: number; right: number; top: number; bottom: number },
  path: PlotPoint[],
  pad = 4,
): boolean {
  return collidesWithPolyline(box, path, pad);
}

function freePlacement(
  box: { left: number; right: number; top: number; bottom: number },
  path: PlotPoint[],
): boolean {
  return !collidesWithPolyline(box, path, 2);
}

export function placeLineEndLabel(args: {
  text: string;
  lineY: number;
  x: number;
  path: PlotPoint[];
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  fontSize: number;
}): PlacedLineLabel {
  const ySteps = [-12, -24, 12, 24, -36, 36, -48, 48];
  const gutterX = args.plotRight + 22;
  const anchorMid: LabelAnchor = "middle";
  for (const dy of ySteps) {
    const y = Math.min(args.plotBottom - 6, Math.max(args.plotTop + args.fontSize, args.lineY + dy));
    const box = labelBoxPx(gutterX, y, anchorMid, args.text, args.fontSize);
    if (freePlacement(box, args.path)) {
      return {
        x: gutterX,
        y,
        anchor: anchorMid,
        leader: { x1: args.plotRight - 2, y1: args.lineY, x2: gutterX - 6, y2: y - args.fontSize / 3 },
      };
    }
  }

  const anchorEnd: LabelAnchor = "end";
  for (const dy of ySteps) {
    const y = Math.min(args.plotBottom - 6, Math.max(args.plotTop + args.fontSize, args.lineY + dy));
    const box = labelBoxPx(args.x, y, anchorEnd, args.text, args.fontSize);
    if (freePlacement(box, args.path)) {
      return { x: args.x, y, anchor: anchorEnd };
    }
  }

  const y = Math.max(args.plotTop + args.fontSize, args.lineY - 36);
  return {
    x: gutterX,
    y,
    anchor: anchorMid,
    leader: { x1: args.plotRight - 2, y1: args.lineY, x2: gutterX - 6, y2: y - args.fontSize / 3 },
  };
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