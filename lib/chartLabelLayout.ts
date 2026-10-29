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
