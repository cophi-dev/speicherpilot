import { polarPoint, RING_GAP_DEG, RING_SLOTS, segmentAngles, segmentIndexForHour } from "@/lib/dayRingScale";

/** Drawn samples of the monotone cubic. At least four interpolated points per hour, and fine enough for a 1280px ring at 2×. */
const EDGE_STEP_DEG = 0.2;

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
  return sampleMonotone(
    [head, ...body, tail].map((sample) => ({ angle: sample.angleDeg, value: sample.value, radius: sample.radius }))
  );
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
 * One knot per clock angle.
 * A fall-back day repeats 02:00–02:45. Two knots on one angle make the next
 * interval run from the later hour back to the earlier hour, three times:
 * a peak, then a steep drop. The repeated hour is averaged before the cubic.
 */
export function oneKnotPerClockAngle(
  series: readonly { angleDeg: number; value: number }[]
): { angleDeg: number; value: number }[] {
  const groups = new Map<number, { angleDeg: number; sum: number; count: number }>();
  for (const sample of series) {
    const key = Math.round(sample.angleDeg * 1000);
    const group = groups.get(key);
    if (group) {
      group.sum += sample.value;
      group.count += 1;
    } else {
      groups.set(key, { angleDeg: sample.angleDeg, sum: sample.value, count: 1 });
    }
  }
  return [...groups.values()]
    .sort((left, right) => left.angleDeg - right.angleDeg)
    .map((group) => ({ angleDeg: group.angleDeg, value: group.sum / group.count }));
}

export function smoothPolarSamples(
  series: readonly { angleDeg: number; value: number }[],
  radiusOf: (value: number) => number,
  zeroRadius: number
): CurveSample[] {
  void zeroRadius;
  const controls: Control[] = oneKnotPerClockAngle(series).map((sample) => ({
    angle: sample.angleDeg,
    value: sample.value,
    radius: radiusOf(sample.value),
  }));
  return sampleMonotone(controls);
}

/**
 * Monotone cubic through the samples. The radius stays between the neighbouring
 * control radii, so the curve cannot pass a real value.
 */
/**
 * Monotone cubic through the samples. The radius stays between the neighbouring
 * control radii, so the curve cannot pass a real value.
 */
export function monotonePolarSamples(
  series: readonly { angleDeg: number; value: number }[],
  radiusOf: (value: number) => number
): CurveSample[] {
  const controls: Control[] = [...series]
    .sort((a, b) => a.angleDeg - b.angleDeg)
    .map((sample) => ({ angle: sample.angleDeg, value: sample.value, radius: radiusOf(sample.value) }));
  if (controls.length < 2) return [];
  return sampleMonotone(controls).map((sample) => {
    const { left, right } = bracket(controls, sample.angleDeg);
    const minR = Math.min(left.radius, right.radius);
    const maxR = Math.max(left.radius, right.radius);
    return { ...sample, radius: clamp(sample.radius, minR, maxR) };
  });
}

/** One filled area between the open outer curve and the base circle. No extra stroke. */
export function polarAreaPath(samples: readonly CurveSample[], zeroRadius: number): string {
  if (samples.length < 2) return "";
  const first = samples[0];
  const last = samples[samples.length - 1];
  const parts: string[] = [];
  appendMonotoneEdge(parts, samples, true);
  const end = polarPoint(0, 0, zeroRadius, last.angleDeg);
  const start = polarPoint(0, 0, zeroRadius, first.angleDeg);
  const radius = fmt(zeroRadius);
  parts.push(`L ${fmt(end.x)} ${fmt(end.y)}`);
  parts.push(`A ${radius} ${radius} 0 1 0 ${fmt(start.x)} ${fmt(start.y)}`);
  parts.push("Z");
  return parts.join(" ");
}

/**
 * Keeps the two edges from crossing or pinching below `minGap` (user units).
 * Each edge stays one radius series, so the ribbon does not grow a corner where the curves used to meet.
 */
export function clampRibbon(
  outer: readonly CurveSample[],
  inner: readonly CurveSample[],
  minGap: number
): { outer: CurveSample[]; inner: CurveSample[] } {
  const nextOuter: CurveSample[] = [];
  const nextInner: CurveSample[] = [];
  const count = Math.min(outer.length, inner.length);
  const gap = Math.max(0, minGap);
  for (let index = 0; index < count; index += 1) {
    const edge = outer[index];
    const base = inner[index];
    let high = Math.max(edge.radius, base.radius);
    let low = Math.min(edge.radius, base.radius);
    if (high - low < gap) {
      const mid = (high + low) / 2;
      high = mid + gap / 2;
      low = mid - gap / 2;
    }
    nextOuter.push({ ...edge, radius: high });
    nextInner.push({ ...base, angleDeg: edge.angleDeg, radius: low });
  }
  return { outer: nextOuter, inner: nextInner };
}

/** Band between two open curves that share angles. */
export function polarRibbonPath(outer: readonly CurveSample[], inner: readonly CurveSample[]): string {
  if (outer.length < 2 || outer.length !== inner.length) return "";
  const parts: string[] = [];
  appendMonotoneEdge(parts, outer, true);
  appendMonotoneEdge(parts, [...inner].reverse(), false);
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
  appendMonotoneEdge(parts, outer, true);
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

function sampleMonotone(controls: readonly Control[]): CurveSample[] {
  if (controls.length < 2) return controls.map((control) => ({ angleDeg: control.angle, value: control.value, radius: control.radius }));
  const slopes = fritschCarlsonSlopes(
    controls.map((control) => control.angle),
    controls.map((control) => control.radius)
  );
  const start = controls[0].angle;
  const end = controls[controls.length - 1].angle;
  const angles = new Set<number>([start, end]);
  for (const control of controls) angles.add(control.angle);
  for (let angle = start; angle < end - 1e-6; angle += EDGE_STEP_DEG) angles.add(angle);
  return [...angles].sort((left, right) => left - right).map((angle) => evaluateMonotone(controls, slopes, angle));
}

/**
 * Fritsch–Carlson slopes. Opposite secants get a zero tangent, and each interval
 * is scaled until it cannot leave the range of its two supports.
 */
function fritschCarlsonSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  const count = xs.length;
  const slopes = new Array<number>(count).fill(0);
  if (count < 2) return slopes;
  const secant: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const span = xs[index + 1] - xs[index];
    secant.push(span === 0 ? 0 : (ys[index + 1] - ys[index]) / span);
  }
  slopes[0] = secant[0];
  slopes[count - 1] = secant[count - 2];
  for (let index = 1; index < count - 1; index += 1) {
    if (secant[index - 1] === 0 || secant[index] === 0 || secant[index - 1] * secant[index] < 0) slopes[index] = 0;
    else slopes[index] = (secant[index - 1] + secant[index]) / 2;
  }
  for (let index = 0; index < count - 1; index += 1) {
    if (secant[index] === 0) {
      slopes[index] = 0;
      slopes[index + 1] = 0;
      continue;
    }
    const alpha = slopes[index] / secant[index];
    const beta = slopes[index + 1] / secant[index];
    const sum = alpha * alpha + beta * beta;
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum);
      slopes[index] = scale * alpha * secant[index];
      slopes[index + 1] = scale * beta * secant[index];
    }
  }
  return slopes;
}

function evaluateMonotone(controls: readonly Control[], slopes: readonly number[], angle: number): CurveSample {
  const { left, right, leftIndex } = bracket(controls, angle);
  const span = right.angle - left.angle;
  const t = span === 0 ? 0 : (angle - left.angle) / span;
  const radius = span === 0 ? left.radius : hermite(left.radius, slopes[leftIndex], right.radius, slopes[leftIndex + 1], span, t);
  const value = left.value + (right.value - left.value) * t;
  return { angleDeg: angle, value, radius };
}

function hermite(y0: number, slope0: number, y1: number, slope1: number, span: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * y0 + h10 * span * slope0 + h01 * y1 + h11 * span * slope1;
}

function bracket(controls: readonly Control[], angle: number): { left: Control; right: Control; leftIndex: number } {
  if (angle <= controls[0].angle) return { left: controls[0], right: controls[0], leftIndex: 0 };
  const last = controls.length - 1;
  if (angle >= controls[last].angle) return { left: controls[last], right: controls[last], leftIndex: last };
  let hi = 1;
  while (hi < last && controls[hi].angle < angle) hi += 1;
  return { left: controls[hi - 1], right: controls[hi], leftIndex: hi - 1 };
}

/**
 * One cubic per sample step.
 * The samples already lie on a Fritsch–Carlson curve. A second Fritsch–Carlson pass
 * reads tiny sign flips between those samples as corners and pulls the edge into sawteeth,
 * so the drawn slope is the central difference of the samples. Not Catmull–Rom.
 */
function appendMonotoneEdge(
  parts: string[],
  samples: readonly { radius: number; angleDeg: number }[],
  move: boolean
): void {
  if (samples.length === 0) return;
  const forward = samples.length < 2 || samples[0].angleDeg <= samples[samples.length - 1].angleDeg;
  const ordered = forward ? samples : [...samples].reverse();
  const slopes = ordered.map((sample, index) => {
    const previous = ordered[Math.max(0, index - 1)];
    const next = ordered[Math.min(ordered.length - 1, index + 1)];
    const span = next.angleDeg - previous.angleDeg;
    return span === 0 ? 0 : (next.radius - previous.radius) / span;
  });
  const slopeAt = (index: number) => slopes[forward ? index : samples.length - 1 - index];
  const first = polarPoint(0, 0, samples[0].radius, samples[0].angleDeg);
  parts.push(`${move ? "M" : "L"} ${fmt(first.x)} ${fmt(first.y)}`);
  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    if (left.angleDeg === right.angleDeg) continue;
    parts.push(polarCubic(left.radius, slopeAt(index), left.angleDeg, right.radius, slopeAt(index + 1), right.angleDeg));
  }
}

function polarCubic(radius0: number, slope0: number, angle0: number, radius1: number, slope1: number, angle1: number): string {
  const start = polarPoint(0, 0, radius0, angle0);
  const end = polarPoint(0, 0, radius1, angle1);
  const d0 = polarDerivative(radius0, slope0, angle0);
  const d1 = polarDerivative(radius1, slope1, angle1);
  const delta = ((angle1 - angle0) * Math.PI) / 180;
  return `C ${fmt(start.x + (d0.x * delta) / 3)} ${fmt(start.y + (d0.y * delta) / 3)} ${fmt(end.x - (d1.x * delta) / 3)} ${fmt(end.y - (d1.y * delta) / 3)} ${fmt(end.x)} ${fmt(end.y)}`;
}

function polarDerivative(radius: number, slopePerDeg: number, angleDeg: number): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;
  const slope = slopePerDeg * (180 / Math.PI);
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  return { x: slope * sine + radius * cosine, y: -slope * cosine + radius * sine };
}

function fmt(value: number): string {
  return (Math.round(value * 1000) / 1000).toString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
