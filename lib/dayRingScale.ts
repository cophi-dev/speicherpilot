/** Fixed polar scale for one page. Radius is linear in GW. Colour stops match the Richtung scale. */

export const RING_R0 = 220;
export const RING_K = 4.2;
export const RING_GAP_DEG = 2;
export const RING_SLOTS = 96;

/** Geometry that fits a 50 GW day plus the midnight label. Same box on every day. */
export const RING_VIEW = { x: -520, y: -520, w: 1040, h: 1040 } as const;

/** Step-line domain. Fixed per page, wide enough for a day above the colour clamp. */
export const LINE_GW_MIN = -10;
export const LINE_GW_MAX = 50;

export const COLOR_STOPS: ReadonlyArray<{ gw: number; color: string }> = [
  { gw: -7, color: "#9BF6E6" },
  { gw: -3, color: "#2CC8B8" },
  { gw: 0, color: "#1E9CB0" },
  { gw: 8, color: "#2F6FC0" },
  { gw: 18, color: "#5E62C8" },
  { gw: 27, color: "#C06FA8" },
  { gw: 33, color: "#F2A25C" },
  { gw: 38, color: "#FF6655" },
];

const SPAN_DEG = (360 - RING_GAP_DEG) / RING_SLOTS;

export function energyColor(gw: number): string {
  const stops = COLOR_STOPS;
  if (gw <= stops[0].gw) {
    return stops[0].color;
  }
  const last = stops[stops.length - 1];
  if (gw >= last.gw) {
    return last.color;
  }
  for (let index = 1; index < stops.length; index += 1) {
    const right = stops[index];
    const left = stops[index - 1];
    if (gw <= right.gw) {
      const t = (gw - left.gw) / (right.gw - left.gw);
      return mixHex(left.color, right.color, t);
    }
  }
  return last.color;
}

/** r = r0 + k·GW. The dashed zero circle sits at r0. Radius stays positive so the path is valid. */
export function ringRadius(gw: number): number {
  return Math.max(1, RING_R0 + RING_K * gw);
}

/**
 * Quarter `index` (0 = 00:00). A 2° gap is centred on midnight, so 0° sits in the gap with the 00 tick.
 * Angles grow clockwise from 12 o'clock.
 */
export function segmentAngles(index: number): { start: number; end: number } {
  const start = RING_GAP_DEG / 2 + index * SPAN_DEG;
  return { start, end: start + SPAN_DEG };
}

export function segmentIndexForHour(hour: number): number {
  return Math.min(RING_SLOTS - 1, Math.max(0, Math.round(hour * 4)));
}

/** Degrees clockwise from midnight for the start of the quarter that contains `hour`. */
export function hourToDeg(hour: number): number {
  return segmentAngles(segmentIndexForHour(hour)).start;
}

export function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

/** Annular sector, clockwise from `startDeg` to `endDeg`. Radii are ordered inside the path. */
export function sectorPath(
  cx: number,
  cy: number,
  radiusA: number,
  radiusB: number,
  startDeg: number,
  endDeg: number
): string {
  const rIn = Math.min(radiusA, radiusB);
  const rOut = Math.max(radiusA, radiusB);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const outerStart = polarPoint(cx, cy, rOut, startDeg);
  const outerEnd = polarPoint(cx, cy, rOut, endDeg);
  const innerEnd = polarPoint(cx, cy, rIn, endDeg);
  const innerStart = polarPoint(cx, cy, rIn, startDeg);
  return [
    `M ${round(outerStart.x)} ${round(outerStart.y)}`,
    `A ${round(rOut)} ${round(rOut)} 0 ${large} 1 ${round(outerEnd.x)} ${round(outerEnd.y)}`,
    `L ${round(innerEnd.x)} ${round(innerEnd.y)}`,
    `A ${round(rIn)} ${round(rIn)} 0 ${large} 0 ${round(innerStart.x)} ${round(innerStart.y)}`,
    "Z",
  ].join(" ");
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

function mixHex(from: string, to: string, t: number): string {
  const a = hexRgb(from);
  const b = hexRgb(to);
  const mix = (left: number, right: number) => Math.round(left + (right - left) * t);
  return rgbHex(mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2]));
}

function hexRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbHex(r: number, g: number, b: number): string {
  const channel = (part: number) => part.toString(16).padStart(2, "0").toUpperCase();
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}
