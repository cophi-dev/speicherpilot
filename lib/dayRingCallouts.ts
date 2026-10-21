import { ringRadius } from "@/lib/dayRingScale";

export type CalloutBox = { x: number; y: number; w: number; h: number };

type ViewBox = { x: number; y: number; w: number; h: number };

/** Outer reach of the segments and the hour labels, in the same units as the ring. */
export function ringClearRadius(maxGw: number): number {
  const tickLabelRadius = ringRadius(Math.max(52, maxGw + 6)) + 28 + 22;
  const segmentEdge = ringRadius(Math.max(0, maxGw)) + 22;
  return Math.max(tickLabelRadius, segmentEdge);
}

/** Distance from the origin to the nearest point on the rectangle. Zero when the origin is inside. */
export function rectDistanceToOrigin(box: CalloutBox): number {
  const x = box.x > 0 ? box.x : box.x + box.w < 0 ? box.x + box.w : 0;
  const y = box.y > 0 ? box.y : box.y + box.h < 0 ? box.y + box.h : 0;
  return Math.hypot(x, y);
}

function overlaps(a: CalloutBox, b: CalloutBox, gap: number): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function insideView(box: CalloutBox, view: ViewBox, pad: number): boolean {
  return (
    box.x >= view.x + pad &&
    box.y >= view.y + pad &&
    box.x + box.w <= view.x + view.w - pad &&
    box.y + box.h <= view.y + view.h - pad
  );
}

/**
 * Park each label outside the ring. The search walks outward along the hour,
 * then a few degrees either side, and keeps the first box that clears the ring,
 * the ticks, the view edge, and the labels already placed.
 */
export function placeCalloutBoxes(
  items: Array<{ angleDeg: number; w: number; h: number }>,
  clearRadius: number,
  view: ViewBox
): CalloutBox[] {
  const placed: CalloutBox[] = [];
  for (const item of items) {
    placed.push(placeOne(item, clearRadius, view, placed));
  }
  return placed;
}

function placeOne(
  item: { angleDeg: number; w: number; h: number },
  clearRadius: number,
  view: ViewBox,
  placed: CalloutBox[]
): CalloutBox {
  const pad = 12;
  const offsets = [0];
  for (let step = 8; step <= 96; step += 8) {
    offsets.push(step, -step);
  }
  for (const offset of offsets) {
    const angle = ((item.angleDeg + offset) * Math.PI) / 180;
    const ux = Math.sin(angle);
    const uy = -Math.cos(angle);
    const support = (item.w / 2) * Math.abs(ux) + (item.h / 2) * Math.abs(uy);
    const dist = clearRadius + support + 16;
    const cx = ux * dist;
    const cy = uy * dist;
    const minX = view.x + pad;
    const minY = view.y + pad;
    const maxX = view.x + view.w - pad - item.w;
    const maxY = view.y + view.h - pad - item.h;
    const box = {
      x: Math.min(maxX, Math.max(minX, cx - item.w / 2)),
      y: Math.min(maxY, Math.max(minY, cy - item.h / 2)),
      w: item.w,
      h: item.h,
    };
    if (rectDistanceToOrigin(box) < clearRadius) {
      continue;
    }
    if (!insideView(box, view, pad)) {
      continue;
    }
    if (placed.some((other) => overlaps(box, other, 10))) {
      continue;
    }
    return box;
  }
  const angle = (item.angleDeg * Math.PI) / 180;
  const ux = Math.sin(angle);
  const uy = -Math.cos(angle);
  return {
    x: ux >= 0 ? view.x + view.w - pad - item.w : view.x + pad,
    y: uy >= 0 ? view.y + view.h - pad - item.h : view.y + pad,
    w: item.w,
    h: item.h,
  };
}

/** Leader lines stay within 24 screen pixels. Longer labels move to the numbered list. */
export const MAX_LEADER_PX = 24;

export function leaderLength(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * Park a label just outside its marker.
 * Returns null when the leader would exceed `maxLeader` or the box would cover the disk, another label, or the frame.
 */
export function placeLabelBeside(
  item: { angleDeg: number; w: number; h: number },
  marker: { x: number; y: number },
  maxLeader: number,
  diskRadius: number,
  view: ViewBox,
  placed: readonly CalloutBox[]
): CalloutBox | null {
  const angle = (item.angleDeg * Math.PI) / 180;
  const ux = Math.sin(angle);
  const uy = -Math.cos(angle);
  const support = (item.w / 2) * Math.abs(ux) + (item.h / 2) * Math.abs(uy);
  const markerR = Math.hypot(marker.x, marker.y);
  const gap = Math.min(maxLeader, Math.max(4, maxLeader * 0.45));
  const dist = markerR + gap + support;
  const box = {
    x: ux * dist - item.w / 2,
    y: uy * dist - item.h / 2,
    w: item.w,
    h: item.h,
  };
  if (!insideView(box, view, 2)) {
    return null;
  }
  if (rectDistanceToOrigin(box) < diskRadius) {
    return null;
  }
  if (placed.some((other) => overlaps(box, other, 8))) {
    return null;
  }
  const end = leaderEnd(box, marker);
  if (leaderLength(marker, end) > maxLeader + 0.5) {
    return null;
  }
  return box;
}

/** Point on the label edge nearest the marker, where the leader line ends. */
export function leaderEnd(box: CalloutBox, from: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.min(box.x + box.w, Math.max(box.x, from.x)),
    y: Math.min(box.y + box.h, Math.max(box.y, from.y)),
  };
}
