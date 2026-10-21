/** Fixed polar scale for one page. Radius is linear in GW. Colour stops match the Richtung scale. */

export const RING_R0 = 220;
export const RING_K = 4.2;
export const RING_GAP_DEG = 2;
export const RING_SLOTS = 96;

/** Geometry that fits a 50 GW day plus the midnight label. Same box on every day. */
export const RING_VIEW = { x: -520, y: -520, w: 1040, h: 1040 } as const;

/**
 * Wider frame used when callout labels sit outside the ring.
 * The GW scale (r0, k) does not change; only the margin around it grows.
 */
export const RING_CALLOUT_VIEW = { x: -760, y: -760, w: 1520, h: 1520 } as const;

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

/** Site ring. Radius is linear in kW. The zero circle is import = 0. */
export const KW_R0 = 180;
export const KW_K = 1.35;

/**
 * Utilisation stops. The value is power divided by the connection limit.
 * Negative is export. These stops are not the national GW scale.
 */
export const UTILISATION_STOPS: ReadonlyArray<{ ratio: number; color: string }> = [
  { ratio: -0.15, color: "#9BF6E6" },
  { ratio: 0, color: "#2CC8B8" },
  { ratio: 0.35, color: "#1E9CB0" },
  { ratio: 0.6, color: "#2F6FC0" },
  { ratio: 0.8, color: "#5E62C8" },
  { ratio: 0.9, color: "#F2A25C" },
  { ratio: 1, color: "#FF6655" },
  { ratio: 1.3, color: "#E0364A" },
];

export function utilisationColor(ratio: number): string {
  const stops = UTILISATION_STOPS;
  if (ratio <= stops[0].ratio) {
    return stops[0].color;
  }
  const last = stops[stops.length - 1];
  if (ratio >= last.ratio) {
    return last.color;
  }
  for (let index = 1; index < stops.length; index += 1) {
    const right = stops[index];
    const left = stops[index - 1];
    if (ratio <= right.ratio) {
      const t = (ratio - left.ratio) / (right.ratio - left.ratio);
      return mixHex(left.color, right.color, t);
    }
  }
  return last.color;
}

/** r = r0 + k·kW. Export sits inside the zero circle. */
export function kwRadius(kw: number): number {
  return Math.max(1, KW_R0 + KW_K * kw);
}

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

/** Hundredths. Node and the browser disagree past that on sin/cos, which mismatches hydration. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: round2(cx + r * Math.sin(rad)),
    y: round2(cy - r * Math.cos(rad)),
  };
}

/**
 * State-of-charge ring. The centre copy is fitted inside `innerEdge`, with 12px of clearance.
 * kW sizes match the site ring; GW is the national day ring.
 */
export function socRingGeometry(unit: "GW" | "kW" = "GW", bold = false): { radius: number; width: number; innerEdge: number } {
  const radius = unit === "kW" ? (bold ? 92 : 70) : 150;
  const width = bold ? 26 : unit === "kW" ? 8 : 14;
  return { radius, width, innerEdge: radius - width / 2 };
}

/** Phone width the compact viewBox is drawn for, and the disk that width must show. */
export const COMPACT_FRAME_PX = 390;
export const COMPACT_RING_MIN_PX = 340;

/**
 * ViewBox that makes a disk of `outerRadius` at least 340px wide inside a 390px frame.
 * Half-extent is computed from that ratio and then shortened until the inequality holds after rounding.
 */
export function compactRingView(outerRadius: number): { x: number; y: number; w: number; h: number } {
  const outer = Math.max(1, outerRadius);
  let half = Math.floor(outer * (COMPACT_FRAME_PX / COMPACT_RING_MIN_PX) * 100) / 100;
  while (half > outer && (COMPACT_FRAME_PX * outer) / half < COMPACT_RING_MIN_PX) {
    half = Math.round((half - 0.01) * 100) / 100;
  }
  const side = Math.round(half * 2 * 100) / 100;
  return { x: -half, y: -half, w: side, h: side };
}

export function ringDiskPx(outerRadius: number, framePx: number, viewWidth: number): number {
  return (framePx * (2 * outerRadius)) / viewWidth;
}

/** Radius, in px, that still leaves `clearancePx` inside the inner circle. */
export function centerLimitPx(innerEdgeUser: number, svgWidth: number, viewWidth: number, clearancePx = 12): number {
  if (svgWidth <= 0 || viewWidth <= 0) {
    return 0;
  }
  return innerEdgeUser * (svgWidth / viewWidth) - clearancePx;
}

/** Caption size tracks the centre value, so the value — not the caption — sets the box width. */
export function centerCaptionPx(figurePx: number): number {
  return round2(Math.max(0, figurePx) * 0.62);
}

/** Wrap width, in px, for a caption that has to sit inside the clearance circle. */
export function centerWrapPx(limitPx: number): number {
  return round2(Math.max(0, limitPx) * 1.6);
}

/** True when the box's corners lie inside a circle of `radiusPx`. */
export function boxFitsCircle(width: number, height: number, radiusPx: number): boolean {
  if (radiusPx <= 0) {
    return false;
  }
  return Math.hypot(width / 2, height / 2) <= radiusPx;
}

/** Hour-label placement that stays inside a compact viewBox. Font size tracks the radius, not a fixed px. */
export function compactHourLabel(outerRadius: number, half: number): { labelRadius: number; labelGap: number; fontSize: number } {
  const fontSize = round2(Math.min(28, (24 * outerRadius) / COMPACT_RING_MIN_PX));
  const labelGap = 10;
  const overhang = fontSize * 0.7;
  const room = half - overhang - labelGap;
  const preferred = outerRadius + 4;
  const labelRadius = round2(Math.max(outerRadius, Math.min(preferred, room)));
  return { labelRadius, labelGap, fontSize };
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
