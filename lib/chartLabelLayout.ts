export type LabelAnchor = "start" | "middle" | "end";

export type ChartLabel = {
  text: string;
  x: number;
  y: number;
  anchor: LabelAnchor;
  /** Which way to step first when the preferred spot is taken. */
  prefers: "up" | "down";
};

export type LabelFrame = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type PlacedLabel = {
  x: number;
  y: number;
  anchor: LabelAnchor;
};

const CHAR_W = 7.3;
const ASCENT = 12;
const DESCENT = 4;
const GAP = 6;

export function labelWidth(text: string) {
  return Math.max(text.length, 1) * CHAR_W;
}

export function labelBox(x: number, y: number, anchor: LabelAnchor, text: string) {
  const width = labelWidth(text);
  const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  return { left, right: left + width, top: y - ASCENT, bottom: y + DESCENT };
}

function intersects(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
) {
  return a.left < b.right + GAP && a.right + GAP > b.left && a.top < b.bottom + GAP && a.bottom + GAP > b.top;
}

function contain(x: number, y: number, anchor: LabelAnchor, text: string, frame: LabelFrame) {
  let box = labelBox(x, y, anchor, text);
  if (box.right > frame.maxX) {
    x -= box.right - frame.maxX;
    box = labelBox(x, y, anchor, text);
  }
  if (box.left < frame.minX) {
    x += frame.minX - box.left;
    box = labelBox(x, y, anchor, text);
  }
  if (box.top < frame.minY) {
    y += frame.minY - box.top;
  }
  box = labelBox(x, y, anchor, text);
  if (box.bottom > frame.maxY) {
    y -= box.bottom - frame.maxY;
    box = labelBox(x, y, anchor, text);
  }
  return { x, y, anchor, box };
}

/** Keep each label inside the plot and clear of the labels already placed. */
export function layoutChartLabels(labels: ChartLabel[], frame: LabelFrame): PlacedLabel[] {
  const placed: Array<PlacedLabel & { box: ReturnType<typeof labelBox> }> = [];
  for (const label of labels) {
    const ySteps = label.prefers === "down" ? [0, 18, 36, 54, 72, -18, -36] : [0, -18, -36, -54, -72, 18, 36];
    const xSteps = [0, -32, 32, -64, 64, -96, 96, -128, 128];
    let chosen = contain(label.x, label.y, label.anchor, label.text, frame);
    let found = false;
    for (const dy of ySteps) {
      for (const dx of xSteps) {
        const trial = contain(label.x + dx, label.y + dy, label.anchor, label.text, frame);
        if (placed.every((item) => !intersects(trial.box, item.box))) {
          chosen = trial;
          found = true;
          break;
        }
      }
      if (found) {
        break;
      }
    }
    placed.push(chosen);
  }
  return placed.map(({ x, y, anchor }) => ({ x, y, anchor }));
}

/** Clamp a single annotation so its estimated box stays inside horizontal plot bounds. */
export type PeakPointLabelPlacement = PlacedLabel & { above: boolean };

const PEAK_LABEL_GAP_ABOVE = 10;
const PEAK_LABEL_GAP_BELOW = 14;
/** Past end-anchored y-tick numbers at x≈32. */
const Y_TICK_LABEL_MAX_X = 46;

/**
 * Peak marker callout: default above the point (legacy Messer layout), clamped into the plot,
 * flipped below when the box would hit the top y-tick band or plot top.
 */
export function placePeakPointLabel(params: {
  pointX: number;
  pointY: number;
  text: string;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  /** Baseline of the highest y-axis tick label (collision band on the left). */
  topTickLabelBaselineY?: number;
  gapAbove?: number;
  gapBelow?: number;
}): PeakPointLabelPlacement {
  const gapAbove = params.gapAbove ?? PEAK_LABEL_GAP_ABOVE;
  const gapBelow = params.gapBelow ?? PEAK_LABEL_GAP_BELOW;
  const anchor: LabelAnchor = "end";
  const x0 = params.pointX - 4;

  const labelCollidesTopBand = (placed: PlacedLabel) => {
    const box = labelBox(placed.x, placed.y, placed.anchor, params.text);
    if (box.top < params.plotTop) {
      return true;
    }
    if (params.pointY - gapAbove - ASCENT < params.plotTop) {
      return true;
    }
    if (params.topTickLabelBaselineY != null && box.left < Y_TICK_LABEL_MAX_X) {
      const tickTop = params.topTickLabelBaselineY - ASCENT;
      return box.top < tickTop + GAP;
    }
    return false;
  };

  const aboveY = params.pointY - gapAbove;
  const belowY = params.pointY + gapBelow;
  let placed = clampChartAnnotationInPlot(x0, aboveY, anchor, params.text, params.plotLeft, params.plotRight);
  let above = true;
  if (labelCollidesTopBand(placed)) {
    above = false;
    placed = clampChartAnnotationInPlot(x0, belowY, anchor, params.text, params.plotLeft, params.plotRight);
  }
  return { ...placed, above };
}

export function clampChartAnnotationInPlot(
  x: number,
  y: number,
  anchor: LabelAnchor,
  text: string,
  plotLeft: number,
  plotRight: number
): PlacedLabel {
  const width = labelWidth(text);
  let nextX = x;
  let nextAnchor = anchor;
  const rightEdge = (ax: number, anc: LabelAnchor) => labelBox(ax, y, anc, text).right;
  const leftEdge = (ax: number, anc: LabelAnchor) => labelBox(ax, y, anc, text).left;
  if (rightEdge(nextX, nextAnchor) > plotRight) {
    if (nextAnchor === "start") {
      nextX = plotRight - width;
    } else if (nextAnchor === "middle") {
      nextX = plotRight - width / 2;
    } else {
      nextX = plotRight;
    }
  }
  if (leftEdge(nextX, nextAnchor) < plotLeft) {
    if (nextAnchor === "end") {
      nextX = plotLeft + width;
    } else if (nextAnchor === "middle") {
      nextX = plotLeft + width / 2;
    } else {
      nextX = plotLeft;
    }
  }
  if (rightEdge(nextX, nextAnchor) > plotRight) {
    nextAnchor = "end";
    nextX = plotRight;
  }
  if (leftEdge(nextX, nextAnchor) < plotLeft) {
    nextAnchor = "start";
    nextX = plotLeft;
  }
  return { x: nextX, y, anchor: nextAnchor };
}
