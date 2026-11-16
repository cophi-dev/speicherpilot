import type { LabelAnchor } from "@/lib/chartLabelLayout";

export type PlotPoint = { x: number; y: number };

export type PlacedLineLabel = {
  x: number;
  y: number;
  anchor: LabelAnchor;
  leader?: { x1: number; y1: number; x2: number; y2: number };
};

export function linesWithinPx(yA: number, yB: number, px = 3): boolean {
  return Math.abs(yA - yB) < px;
}

export function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(text.length, 1) * fontSize * 0.61;
}

export function labelBoxPx(
  x: number,
  y: number,
  anchor: LabelAnchor,
  text: string,
  fontSize = 12,
): { left: number; right: number; top: number; bottom: number } {
  const width = estimateTextWidth(text, fontSize);
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

export function gutterReserveWidth(texts: string[], fontSize: number, sliderCol = 48, pad = 14): number {
  const maxText = texts.reduce((m, t) => Math.max(m, estimateTextWidth(t, fontSize)), 0);
  return Math.ceil(maxText + pad + sliderCol);
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
  gutterX?: number;
}): PlacedLineLabel {
  const gutterX = args.gutterX ?? args.plotRight + 22;
  const ySteps = [-12, -24, 12, 24, -36, 36, -48, 48];
  const useEnd = args.gutterX !== undefined;
  const anchorPrimary: LabelAnchor = useEnd ? "end" : "middle";
  for (const dy of ySteps) {
    const y = Math.min(args.plotBottom - 6, Math.max(args.plotTop + args.fontSize, args.lineY + dy));
    const box = labelBoxPx(gutterX, y, anchorPrimary, args.text, args.fontSize);
    if (freePlacement(box, args.path)) {
      return {
        x: gutterX,
        y,
        anchor: anchorPrimary,
        leader: {
          x1: args.plotRight - 2,
          y1: args.lineY,
          x2: gutterX - 4,
          y2: y - args.fontSize / 3,
        },
      };
    }
  }

  if (!useEnd) {
    const anchorEnd: LabelAnchor = "end";
    for (const dy of ySteps) {
      const y = Math.min(args.plotBottom - 6, Math.max(args.plotTop + args.fontSize, args.lineY + dy));
      const box = labelBoxPx(args.x, y, anchorEnd, args.text, args.fontSize);
      if (freePlacement(box, args.path)) {
        return { x: args.x, y, anchor: anchorEnd };
      }
    }
  }

  const y = Math.max(args.plotTop + args.fontSize, args.lineY - 36);
  return {
    x: gutterX,
    y,
    anchor: anchorPrimary,
    leader: {
      x1: args.plotRight - 2,
      y1: args.lineY,
      x2: gutterX - 4,
      y2: y - args.fontSize / 3,
    },
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

export type GutterLabelCandidate = {
  key: string;
  text: string;
  preferredY: number;
  fontSize: number;
  fill: string;
  lineY?: number;
  isBold?: boolean;
};

export type StackedGutterLabel = GutterLabelCandidate & {
  x: number;
  y: number;
  anchor: LabelAnchor;
  leader?: PlacedLineLabel["leader"];
};

/** Greedy vertical stack in the gutter column; minGap is typographic px converted to SVG units. */
export function stackGutterLabels(
  items: GutterLabelCandidate[],
  gutterX: number,
  minGapTypoPx: number,
  typographicScale: number,
  plotRight: number,
  plotBottom?: number,
): StackedGutterLabel[] {
  const minGap = minGapTypoPx / Math.max(typographicScale, 0.01);
  const sorted = [...items].sort((a, b) => a.preferredY - b.preferredY);
  const out: StackedGutterLabel[] = [];
  let lastBottom = -Infinity;
  for (const item of sorted) {
    let y = item.preferredY;
    let box = labelBoxPx(gutterX, y, "end", item.text, item.fontSize);
    if (box.top < lastBottom + minGap) {
      y += lastBottom + minGap - box.top;
      box = labelBoxPx(gutterX, y, "end", item.text, item.fontSize);
    }
    if (plotBottom !== undefined) {
      const maxY = plotBottom - 4;
      if (y > maxY) {
        y = maxY;
        box = labelBoxPx(gutterX, y, "end", item.text, item.fontSize);
      }
    }
    out.push({
      ...item,
      x: gutterX,
      y,
      anchor: "end",
      leader:
        item.lineY !== undefined
          ? { x1: plotRight - 2, y1: item.lineY, x2: gutterX - 4, y2: y - item.fontSize / 3 }
          : undefined,
    });
    lastBottom = box.bottom;
  }
  return out;
}