import { curveCatmullRom, curveMonotoneX, line, type CurveFactory } from "d3-shape";

import { polarPoint, RING_GAP_DEG, RING_SLOTS, segmentAngles, segmentIndexForHour } from "@/lib/dayRingScale";

/** Morph duration for a factor change. Ease-in-out, and the first frame is the next animation frame. */
export const RING_MORPH_MS = 450;

export type CurveSample = {
  angleDeg: number;
  /** Value used to draw this sample. Tooltips do not read this. */
  value: number;
  radius: number;
};

type Control = { angle: number; value: number; radius: number };

/**
 * Three-point moving average for the drawn series only.
 * A positive raw value stays non-negative, a negative one stays non-positive,
 * and the result stays inside the raw minimum and maximum.
 */
export function smoothDrawnSeries(values: readonly number[]): number[] {
  const count = values.length;
  if (count === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (count < 3) return values.map((value) => clamp(value, min, max));
  return values.map((value, index) => {
    const previous = values[(index - 1 + count) % count];
    const next = values[(index + 1) % count];
    let smoothed = (previous + value + next) / 3;
    if (value > 0) smoothed = Math.max(smoothed, 0);
    else if (value < 0) smoothed = Math.min(smoothed, 0);
    return clamp(smoothed, min, max);
  });
}

/** Centre of the quarter-hour sector. The 4° midnight gap stays outside the curve. */

/** Each end of the ring narrows onto the base radius across this many quarter-hours. */
export const TAPER_QUARTERS = 2;

export function taperSpanDeg(): number {
  return TAPER_QUARTERS * ((360 - RING_GAP_DEG) / RING_SLOTS);
}

/** True inside the two quarter-hours at either side of the midnight gap. */
export function inMidnightTaper(angleDeg: number): boolean {
  const gap = RING_GAP_DEG / 2;
  const taper = taperSpanDeg();
  return angleDeg < gap + taper || angleDeg > 360 - gap - taper;
}

/**
 * Pull both ends onto `zeroRadius` across two quarter-hours.
 * The shape narrows; opacity stays solid. The 4° gap itself is not part of the path.
 */
export function taperRingSamples(samples: readonly CurveSample[], zeroRadius: number): CurveSample[] {
  if (samples.length < 2) {
    return samples.map((sample) => ({ ...sample }));
  }
  const gap = RING_GAP_DEG / 2;
  const taper = taperSpanDeg();
  const end = 360 - gap;
  const blend = (angle: number, radius: number) => {
    const into = Math.min(Math.max(0, angle - gap), Math.max(0, end - angle));
    const t = taper <= 0 ? 1 : Math.min(1, into / taper);
    const s = t * t * (3 - 2 * t);
    return zeroRadius + (radius - zeroRadius) * s;
  };
  const body = samples
    .filter((sample) => sample.angleDeg > gap && sample.angleDeg < end)
    .map((sample) => ({ ...sample, radius: blend(sample.angleDeg, sample.radius) }));
  if (body.length === 0) {
    return [];
  }
  const head: CurveSample = { angleDeg: gap, radius: zeroRadius, value: body[0].value };
  const tail: CurveSample = { angleDeg: end, radius: zeroRadius, value: body[body.length - 1].value };
  return densify([head, ...body, tail], EDGE_STEP_DEG);
}
export function quarterCenterDeg(index: number): number {
  const span = segmentAngles(index);
  return (span.start + span.end) / 2;
}

export function quarterCenterForHour(hour: number): number {
  return quarterCenterDeg(segmentIndexForHour(hour));
}

/** Ease used by the path morph. */
export function easeInOut(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** Tooltip and callout text for one raw quarter. One decimal, not the smoothed series. */
export function ringTip(value: number): string {
  return value.toFixed(1);
}

/**
 * Open centripetal Catmull-Rom through the series, alpha 0.5.
 * The curve runs from the first quarter to the last and does not close across midnight.
 * If that spline leaves the data's radius range, or crosses zero where the values do not, the radius is taken from a monotone polar spline and clamped.
 */
export function smoothPolarSamples(
  series: readonly { angleDeg: number; value: number }[],
  radiusOf: (value: number) => number,
  zeroRadius: number
): CurveSample[] {
  const controls: Control[] = [...series]
    .sort((a, b) => a.angleDeg - b.angleDeg)
    .map((sample) => ({ angle: sample.angleDeg, value: sample.value, radius: radiusOf(sample.value) }));
  if (controls.length < 2) return [];
  const grid = angleGrid(controls);
  const catmull = radiusLookup(flattenCurve(curveCatmullRom.alpha(0.5), controls));
  let samples = grid.map((angle) => sampleAt(controls, angle, catmull));
  if (violates(samples, controls, zeroRadius)) {
    const monotone = radiusLookup(flattenCurve(curveMonotoneX, controls));
    samples = grid.map((angle) => sampleAt(controls, angle, monotone));
  }
  return samples.map((sample) => clampSample(sample, controls, zeroRadius));
}

/** One filled area between the open outer curve and the base circle. No extra stroke. */
export function polarAreaPath(samples: readonly CurveSample[], zeroRadius: number): string {
  if (samples.length < 2) return "";
  const first = samples[0];
  const last = samples[samples.length - 1];
  const parts: string[] = [];
  appendSmoothEdge(parts, samples, true);
  const end = polarPoint(0, 0, zeroRadius, last.angleDeg);
  const start = polarPoint(0, 0, zeroRadius, first.angleDeg);
  const radius = fmt(zeroRadius);
  parts.push(`L ${fmt(end.x)} ${fmt(end.y)}`);
  parts.push(`A ${radius} ${radius} 0 1 0 ${fmt(start.x)} ${fmt(start.y)}`);
  parts.push("Z");
  return parts.join(" ");
}

/**
 * Outer-edge spacing in degrees.
 * At a 1280px ring and 2× device pixels a chord this short stays under half a device pixel.
 */
const EDGE_STEP_DEG = 0.15;
const GRID_STEPS = 24;
const BEZIER_STEPS = 16;

/** Even steps so the outer edge anti-aliases as one curve instead of a serrated polyline. */
function densify(samples: readonly CurveSample[], stepDeg: number): CurveSample[] {
  if (samples.length < 2) return [...samples];
  const out: CurveSample[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const from = samples[index];
    const to = samples[index + 1];
    const span = to.angleDeg - from.angleDeg;
    const steps = Math.max(1, Math.round(span / stepDeg));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      out.push({
        angleDeg: from.angleDeg + span * t,
        radius: from.radius + (to.radius - from.radius) * t,
        value: from.value + (to.value - from.value) * t,
      });
    }
  }
  out.push(samples[samples.length - 1]);
  return out;
}

/** Band between two open curves that share angles. */
export function polarRibbonPath(outer: readonly CurveSample[], inner: readonly CurveSample[]): string {
  if (outer.length < 2 || outer.length !== inner.length) return "";
  const parts: string[] = [];
  appendSmoothEdge(parts, outer, true);
  appendSmoothEdge(parts, [...inner].reverse(), false);
  parts.push("Z");
  return parts.join(" ");
}

/** Smooth outer edge, crisp circular inner edge. Used above the site limit. */
export function polarCapPath(outer: readonly CurveSample[], limitRadius: number): string {
  if (outer.length < 2) return "";
  const first = outer[0];
  const last = outer[outer.length - 1];
  const end = polarPoint(0, 0, limitRadius, last.angleDeg);
  const start = polarPoint(0, 0, limitRadius, first.angleDeg);
  const large = last.angleDeg - first.angleDeg > 180 ? 1 : 0;
  const radius = fmt(limitRadius);
  const parts: string[] = [];
  appendSmoothEdge(parts, outer, true);
  parts.push(`L ${fmt(end.x)} ${fmt(end.y)}`);
  parts.push(`A ${radius} ${radius} 0 ${large} 0 ${fmt(start.x)} ${fmt(start.y)}`);
  parts.push("Z");
  return parts.join(" ");
}

export function booleanRuns(flags: readonly boolean[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  let start = -1;
  flags.forEach((flag, index) => {
    if (flag && start < 0) start = index;
    if (!flag && start >= 0) {
      runs.push({ start, end: index - 1 });
      start = -1;
    }
  });
  if (start >= 0) runs.push({ start, end: flags.length - 1 });
  return runs.filter((run) => run.end > run.start);
}

export function conicGradient(stops: readonly { angleDeg: number; color: string }[]): string {
  const paint = [...stops].sort((a, b) => a.angleDeg - b.angleDeg);
  if (paint.length === 0) return "none";
  return `conic-gradient(from 0deg at 50% 50%, ${paint.map((stop) => `${stop.color} ${stop.angleDeg.toFixed(2)}deg`).join(", ")})`;
}

function sampleAt(controls: Control[], angle: number, lookup: (angle: number) => number): CurveSample {
  const { left, right } = bracket(controls, angle);
  const span = right.angle - left.angle;
  const t = span === 0 ? 0 : (angle - left.angle) / span;
  const onControl = controls.find((control) => Math.abs(control.angle - angle) < 1e-6);
  return {
    angleDeg: angle,
    value: onControl ? onControl.value : left.value + (right.value - left.value) * t,
    radius: onControl ? onControl.radius : lookup(angle),
  };
}

/** Keeps the drawn radius inside the data, and on the same side of zero as the raw span. */
function clampSample(sample: CurveSample, controls: readonly Control[], zeroRadius: number): CurveSample {
  const onControl = controls.find((control) => Math.abs(control.angle - sample.angleDeg) < 1e-6);
  if (onControl) {
    return { angleDeg: sample.angleDeg, value: onControl.value, radius: onControl.radius };
  }
  const { left, right } = bracket(controls, sample.angleDeg);
  const radii = controls.map((control) => control.radius);
  let radius = sample.radius;
  if (left.value >= 0 && right.value >= 0) radius = Math.max(radius, zeroRadius);
  if (left.value <= 0 && right.value <= 0) radius = Math.min(radius, zeroRadius);
  return { ...sample, radius: clamp(radius, Math.min(...radii), Math.max(...radii)) };
}

function violates(samples: readonly CurveSample[], controls: readonly Control[], zeroRadius: number): boolean {
  const radii = controls.map((control) => control.radius);
  const minR = Math.min(...radii);
  const maxR = Math.max(...radii);
  return samples.some((sample) => {
    if (sample.radius < minR - 0.05 || sample.radius > maxR + 0.05) return true;
    const { left, right } = bracket(controls, sample.angleDeg);
    if (left.value >= 0 && right.value >= 0 && sample.radius < zeroRadius - 0.05) return true;
    if (left.value <= 0 && right.value <= 0 && sample.radius > zeroRadius + 0.05) return true;
    return false;
  });
}

function angleGrid(controls: readonly Control[]): number[] {
  const angles: number[] = [];
  for (let index = 0; index < controls.length - 1; index += 1) {
    const start = controls[index].angle;
    const end = controls[index + 1].angle;
    for (let step = 0; step < GRID_STEPS; step += 1) angles.push(start + ((end - start) * step) / GRID_STEPS);
  }
  angles.push(controls[controls.length - 1].angle);
  return angles;
}

function flattenCurve(curve: CurveFactory, controls: readonly Control[]): CurveSample[] {
  const out: CurveSample[] = [];
  let currentX = 0;
  let currentY = 0;
  const context = {
    beginPath() {},
    moveTo(x: number, y: number) {
      currentX = x;
      currentY = y;
      out.push({ angleDeg: x, radius: y, value: 0 });
    },
    lineTo(x: number, y: number) {
      currentX = x;
      currentY = y;
      out.push({ angleDeg: x, radius: y, value: 0 });
    },
    bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
      for (let step = 1; step <= BEZIER_STEPS; step += 1) {
        const t = step / BEZIER_STEPS;
        out.push({ angleDeg: cubic(currentX, x1, x2, x, t), radius: cubic(currentY, y1, y2, y, t), value: 0 });
      }
      currentX = x;
      currentY = y;
    },
    closePath() {},
  };
  const draw = line<Control>().x((control) => control.angle).y((control) => control.radius).curve(curve).context(context as unknown as CanvasRenderingContext2D);
  draw(controls as Control[]);
  return out.filter((sample, index, all) => index === 0 || sample.angleDeg > all[index - 1].angleDeg);
}

function radiusLookup(samples: readonly CurveSample[]): (angle: number) => number {
  return (angle) => {
    if (samples.length === 0) return 0;
    if (angle <= samples[0].angleDeg) return samples[0].radius;
    const last = samples[samples.length - 1];
    if (angle >= last.angleDeg) return last.radius;
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].angleDeg <= angle) lo = mid;
      else hi = mid;
    }
    const left = samples[lo];
    const right = samples[hi];
    const span = right.angleDeg - left.angleDeg;
    const t = span === 0 ? 0 : (angle - left.angleDeg) / span;
    return left.radius + (right.radius - left.radius) * t;
  };
}

function bracket(controls: readonly Control[], angle: number): { left: Control; right: Control } {
  if (angle <= controls[0].angle) return { left: controls[0], right: controls[0] };
  const last = controls.length - 1;
  if (angle >= controls[last].angle) return { left: controls[last], right: controls[last] };
  let hi = 1;
  while (hi < last && controls[hi].angle < angle) hi += 1;
  return { left: controls[hi - 1], right: controls[hi] };
}

function cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Cubic through the samples so the rasterizer follows a curve instead of a staircase of chords. */
function appendSmoothEdge(
  parts: string[],
  samples: readonly { radius: number; angleDeg: number }[],
  move: boolean
): void {
  const pts = samples.map((sample) => polarPoint(0, 0, sample.radius, sample.angleDeg));
  if (pts.length === 0) return;
  parts.push(`${move ? "M" : "L"} ${fmt(pts[0].x)} ${fmt(pts[0].y)}`);
  if (pts.length < 3) {
    for (let index = 1; index < pts.length; index += 1) {
      parts.push(`L ${fmt(pts[index].x)} ${fmt(pts[index].y)}`);
    }
    return;
  }
  for (let index = 0; index < pts.length - 1; index += 1) {
    const p0 = pts[index === 0 ? 0 : index - 1];
    const p1 = pts[index];
    const p2 = pts[index + 1];
    const p3 = pts[Math.min(pts.length - 1, index + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    parts.push(`C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`);
  }
}

function fmt(value: number): string {
  return (Math.round(value * 1000) / 1000).toString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
