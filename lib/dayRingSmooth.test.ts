import { polarPoint, RING_GAP_DEG, ringRadius, RING_R0 } from "@/lib/dayRingScale";
import {
  polarAreaPath,
  quarterCenterDeg,
  ringTip,
  smoothDrawnSeries,
  smoothPolarSamples,
  taperRingSamples,
  taperSpanDeg,
} from "@/lib/dayRingSmooth";

function day(values: readonly number[]) {
  const series = values.map((value, index) => ({ angleDeg: quarterCenterDeg(index), value }));
  return smoothPolarSamples(series, ringRadius, RING_R0);
}

describe("smooth day ring", () => {
  it("averages three neighbours and keeps each raw sign and the raw extremes", () => {
    const raw = [4, 4, -9, 4, 1];
    const drawn = smoothDrawnSeries(raw);
    expect(drawn[0]).toBeCloseTo((1 + 4 + 4) / 3, 5);
    expect(drawn[1]).toBe(0);
    expect(drawn[2]).toBeCloseTo((4 + -9 + 4) / 3, 5);
    expect(drawn[2]).toBeLessThanOrEqual(0);
    expect(drawn[0]).toBeGreaterThanOrEqual(0);
    expect(Math.max(...drawn)).toBeLessThanOrEqual(Math.max(...raw));
    expect(Math.min(...drawn)).toBeGreaterThanOrEqual(Math.min(...raw));
    expect(ringTip(raw[2])).toBe("-9.0");
    expect(ringTip(drawn[2])).not.toBe(ringTip(raw[2]));
  });

  it("draws one open curve from the first quarter to the last, inside the data", () => {
    const values = Array.from({ length: 96 }, (_, index) => Math.sin((index / 96) * Math.PI * 2) * 12);
    const samples = day(values);
    expect(samples.length).toBeGreaterThan(96);
    expect(samples[0].angleDeg).toBeGreaterThan(0);
    expect(samples[samples.length - 1].angleDeg).toBeLessThan(360);
    expect(samples[samples.length - 1].angleDeg - samples[0].angleDeg).toBeLessThan(360);
    const radii = values.map((value) => ringRadius(value));
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);
    for (const sample of samples) {
      expect(sample.radius).toBeGreaterThanOrEqual(minR - 0.001);
      expect(sample.radius).toBeLessThanOrEqual(maxR + 0.001);
    }
    for (let index = 0; index < values.length - 1; index += 1) {
      const left = values[index];
      const right = values[index + 1];
      const start = quarterCenterDeg(index);
      const end = quarterCenterDeg(index + 1);
      for (const sample of samples) {
        if (sample.angleDeg <= start || sample.angleDeg >= end) continue;
        if (left >= 0 && right >= 0) expect(sample.radius).toBeGreaterThanOrEqual(RING_R0 - 0.001);
        if (left <= 0 && right <= 0) expect(sample.radius).toBeLessThanOrEqual(RING_R0 + 0.001);
      }
    }
    const path = polarAreaPath(samples, RING_R0);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/A /g)).toHaveLength(1);
    expect(path).toMatch(/A [\d.]+ [\d.]+ 0 1 0 /);
  });

  it("puts a step from 0 to 20 on radii strictly between the two ends", () => {
    const samples = smoothPolarSamples(
      [
        { angleDeg: 20, value: 0 },
        { angleDeg: 40, value: 20 },
      ],
      ringRadius,
      RING_R0
    );
    const mid = samples.filter((sample) => sample.angleDeg > 20 && sample.angleDeg < 40);
    expect(mid.length).toBeGreaterThan(0);
    for (const sample of mid) {
      expect(sample.radius).toBeGreaterThan(ringRadius(0));
      expect(sample.radius).toBeLessThan(ringRadius(20));
    }
  });

  it("tapers both ends onto the base radius across two quarter-hours and leaves the 4° gap open", () => {
    const samples = day(Array.from({ length: 96 }, () => 20));
    const drawn = taperRingSamples(samples, RING_R0);
    const gap = RING_GAP_DEG / 2;
    expect(drawn[0].angleDeg).toBeCloseTo(gap, 5);
    expect(drawn[0].radius).toBeCloseTo(RING_R0, 5);
    expect(drawn[drawn.length - 1].angleDeg).toBeCloseTo(360 - gap, 5);
    expect(drawn[drawn.length - 1].radius).toBeCloseTo(RING_R0, 5);
    const past = drawn.find((sample) => sample.angleDeg > gap + taperSpanDeg() + 0.2 && sample.angleDeg < 180);
    expect(past?.radius).toBeCloseTo(ringRadius(20), 1);
    const path = polarAreaPath(drawn, RING_R0);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/M /g)).toHaveLength(1);
    expect(path.match(/A /g)).toHaveLength(1);
    expect(path).not.toMatch(/stroke/i);
  });

  it("builds one non-empty path with no NaN that covers the day except the midnight gap", () => {
    const values = Array.from({ length: 96 }, (_, index) => 16 * Math.sin((index / 96) * Math.PI * 2) + 4);
    const drawn = taperRingSamples(day(values), RING_R0);
    const path = polarAreaPath(drawn, RING_R0);
    const gap = RING_GAP_DEG / 2;
    expect(path.length).toBeGreaterThan(0);
    expect(path).not.toMatch(/NaN|undefined|Infinity/);
    expect(drawn[0].angleDeg).toBeCloseTo(gap, 5);
    expect(drawn[drawn.length - 1].angleDeg).toBeCloseTo(360 - gap, 5);
    expect(drawn[0].radius).toBeCloseTo(RING_R0, 5);
    expect(drawn[drawn.length - 1].radius).toBeCloseTo(RING_R0, 5);
    for (let index = 1; index < drawn.length; index += 1) {
      const step = drawn[index].angleDeg - drawn[index - 1].angleDeg;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(0.25);
    }
    for (let angle = Math.ceil(gap); angle < 360 - gap; angle += 1) {
      expect(drawn.some((sample) => Math.abs(sample.angleDeg - angle) <= 0.5)).toBe(true);
    }
    const head = polarPoint(0, 0, RING_R0, gap);
    expect(path.startsWith(`M ${head.x} ${head.y}`)).toBe(true);
    expect(path).toMatch(/ C /);
    expect(path).toMatch(/A [\d.]+ [\d.]+ 0 1 0 /);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/M /g)).toHaveLength(1);

    const positive = taperRingSamples(day(Array.from({ length: 96 }, () => 20)), RING_R0);
    const positivePath = outline(positive, RING_R0);
    for (const hour of [1, 3, 6, 9, 12, 15, 18, 21, 23]) {
      const mid = (RING_R0 + ringRadius(20)) / 2;
      expect(contains(positivePath, at(hour * 15, mid))).toBe(true);
      expect(contains(positivePath, at(hour * 15, RING_R0 * 0.4))).toBe(false);
    }
    expect(contains(positivePath, at(0, (RING_R0 + ringRadius(20)) / 2))).toBe(false);
    expect(contains(positivePath, { x: 0, y: 0 })).toBe(false);

    for (const hour of [1, 6, 12, 18, 23]) {
      const angle = hour * 15;
      const sample = drawn.reduce((best, item) => (Math.abs(item.angleDeg - angle) < Math.abs(best.angleDeg - angle) ? item : best));
      const radius = sample.radius === RING_R0 ? RING_R0 + 4 : (sample.radius + RING_R0) / 2;
      expect(contains(outline(drawn, RING_R0), at(angle, radius))).toBe(true);
    }
  });

  it("holds a same-sign day on its own side of the zero circle", () => {
    const positive = day(Array.from({ length: 96 }, (_, index) => 2 + (index % 7)));
    expect(positive.every((sample) => sample.radius >= RING_R0 - 0.001)).toBe(true);
    const negative = day(Array.from({ length: 96 }, (_, index) => -1 - (index % 5)));
    expect(negative.every((sample) => sample.radius <= RING_R0 + 0.001)).toBe(true);
  });
});

function at(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

/** Outer curve plus the long zero-circle arc, the same closure `polarAreaPath` uses. */
function outline(samples: readonly { angleDeg: number; radius: number }[], zeroRadius: number): Array<{ x: number; y: number }> {
  const points = samples.map((sample) => at(sample.angleDeg, sample.radius));
  const last = samples[samples.length - 1].angleDeg;
  const first = samples[0].angleDeg;
  const gapAcross = (first - last + 360) % 360;
  const turn = 360 - gapAcross;
  const steps = Math.max(8, Math.round(turn / 2));
  for (let step = 1; step < steps; step += 1) {
    points.push(at(last - (turn * step) / steps, zeroRadius));
  }
  return points;
}

function contains(points: readonly { x: number; y: number }[], point: { x: number; y: number }): boolean {
  let winding = 0;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    if (start.y <= point.y) {
      if (end.y > point.y && side(start, end, point) > 0) winding += 1;
    } else if (end.y <= point.y && side(start, end, point) < 0) winding -= 1;
  }
  return winding !== 0;
}

function side(start: { x: number; y: number }, end: { x: number; y: number }, point: { x: number; y: number }): number {
  return (end.x - start.x) * (point.y - start.y) - (point.x - start.x) * (end.y - start.y);
}
