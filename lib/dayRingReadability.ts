import { polarPoint, RING_GAP_DEG, RING_R0, segmentAngles, segmentIndexForHour } from "@/lib/dayRingScale";
import { quarterCenterForHour } from "@/lib/dayRingSmooth";

/** Peak-to-trough below this leaves the GW ring nearly round. */
export const QUIET_SPAN_GW = 8;
/** A twitch this small has no form worth stretching. */
export const SHAPE_MIN_SPAN_GW = 0.4;
/** Unpublished hours before this clock hour are still most of the day. */
export const OPEN_TAIL_FROM_HOUR = 22;
const SHAPE_LIFT = 36;
const SHAPE_SPAN_USER = 88;

export type OpenTail = {
  fromHour: number;
  startDeg: number;
  endDeg: number;
  midDeg: number;
};

export type DayContrast = {
  quiet: boolean;
  spanGw: number;
  minGw: number;
  maxGw: number;
};

/** How much the published residual actually moves. Null when there is too little to judge. */
export function dayContrast(valuesGw: readonly number[]): DayContrast | null {
  if (valuesGw.length < 4) {
    return null;
  }
  const minGw = Math.min(...valuesGw);
  const maxGw = Math.max(...valuesGw);
  const spanGw = maxGw - minGw;
  return { quiet: spanGw < QUIET_SPAN_GW, spanGw, minGw, maxGw };
}

/**
 * The clock after the last published quarter, when that still leaves a visible gap.
 * A day that already reaches 22:00 is not marked open.
 */
export function openTail(hours: readonly number[]): OpenTail | null {
  if (hours.length === 0) {
    return null;
  }
  const last = Math.max(...hours);
  if (last >= OPEN_TAIL_FROM_HOUR) {
    return null;
  }
  const fromHour = Math.round((last + 0.25) * 4) / 4;
  const startDeg = segmentAngles(segmentIndexForHour(fromHour)).start;
  const endDeg = 360 - RING_GAP_DEG / 2;
  if (endDeg - startDeg < 6) {
    return null;
  }
  return { fromHour, startDeg, endDeg, midDeg: (startDeg + endDeg) / 2 };
}

export function hourClock(hour: number): string {
  const whole = Math.floor(hour);
  const minute = Math.round((hour - whole) * 60) % 60;
  return `${String(whole % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Clockwise arc in the ring's own angle system. */
export function clockwiseArc(radius: number, startDeg: number, endDeg: number): string {
  const start = polarPoint(0, 0, radius, startDeg);
  const end = polarPoint(0, 0, radius, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const r = radius.toFixed(2);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** Placeholder wedge for hours that are not published yet. It is not a residual value. */
export function openWedge(radius: number, startDeg: number, endDeg: number): string {
  const from = polarPoint(0, 0, radius, startDeg);
  const to = polarPoint(0, 0, radius, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const r = radius.toFixed(2);
  return `M 0 0 L ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)} Z`;
}

export type ShapePoint = { hour: number; gw: number };

/**
 * A quiet day's form, stretched across a fixed radial span.
 * The filled GW ring is unchanged. Returns null when the day already has enough swing,
 * or when the series is flat.
 */
export function shapeStroke(points: readonly ShapePoint[]): { d: string; minGw: number; maxGw: number } | null {
  if (points.length < 4) {
    return null;
  }
  const minGw = Math.min(...points.map((point) => point.gw));
  const maxGw = Math.max(...points.map((point) => point.gw));
  const span = maxGw - minGw;
  if (span < SHAPE_MIN_SPAN_GW || span >= QUIET_SPAN_GW) {
    return null;
  }
  const ordered = [...points].sort((left, right) => left.hour - right.hour);
  let path = "";
  let drawing = false;
  let previousHour = Number.NEGATIVE_INFINITY;
  for (const point of ordered) {
    if (point.hour - previousHour > 0.26) {
      drawing = false;
    }
    const radius = RING_R0 + SHAPE_LIFT + ((point.gw - minGw) / span) * SHAPE_SPAN_USER;
    const at = polarPoint(0, 0, radius, quarterCenterForHour(point.hour));
    path += `${drawing ? "L" : "M"} ${at.x.toFixed(2)} ${at.y.toFixed(2)} `;
    drawing = true;
    previousHour = point.hour;
  }
  return { d: path.trim(), minGw, maxGw };
}

/** Line scaled to the series itself, so a small swing still fills the sparkline. */
export function sparklinePath(values: readonly number[], width = 112, height = 28): string {
  if (values.length < 2) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.05, max - min);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = 2 + (height - 4) * (1 - (value - min) / span);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
