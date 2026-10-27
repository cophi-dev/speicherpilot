import { compactRingView, polarPoint, pxToUser, RING_GAP_DEG, ringRadius, RING_R0 } from "@/lib/dayRingScale";
import {
  booleanRuns,
  clampRibbon,
  inMidnightTaper,
  oneKnotPerClockAngle,
  polarAreaPath,
  polarRibbonPath,
  quarterCenterDeg,
  quarterCenterForHour,
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

/** Largest direction change along one cubic edge, in degrees. The straight cap between edges is ignored. */
function ribbonKinks(path: string): number {
  const tokens = path.match(/[MLCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let cursor = 0;
  const read = () => ({ x: Number(tokens[cursor++]), y: Number(tokens[cursor++]) });
  let worst = 0;
  let points: Array<{ x: number; y: number }> = [];
  const flush = () => {
    for (let index = 1; index < points.length - 1; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const c = points[index + 1];
      const v1x = b.x - a.x;
      const v1y = b.y - a.y;
      const v2x = c.x - b.x;
      const v2y = c.y - b.y;
      const n1 = Math.hypot(v1x, v1y);
      const n2 = Math.hypot(v2x, v2y);
      if (n1 < 0.05 || n2 < 0.05) continue;
      const dot = (v1x * v2x + v1y * v2y) / (n1 * n2);
      const turn = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
      if (turn > worst) worst = turn;
    }
    points = [];
  };
  let start = { x: 0, y: 0 };
  while (cursor < tokens.length) {
    const command = tokens[cursor++];
    if (command === "M" || command === "L") {
      flush();
      start = read();
      points.push(start);
      continue;
    }
    if (command === "Z") break;
    if (command !== "C") break;
    const c1 = read();
    const c2 = read();
    const end = read();
    for (const t of [0.25, 0.5, 0.75]) {
      const u = 1 - t;
      points.push({
        x: u ** 3 * start.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * end.x,
        y: u ** 3 * start.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * end.y,
      });
    }
    points.push(end);
    start = end;
  }
  flush();
  return worst;
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

  it("draws a small charge bump as one curve without sawteeth", () => {
    const values = Array.from({ length: 96 }, (_, index) => {
      const hour = index * 0.25;
      if (Math.abs(hour - 2.25) < 0.01) return 1;
      if (Math.abs(hour - 2.5) < 0.01) return 1.1;
      return 0;
    });
    const samples = day(smoothDrawnSeries(values));
    const path = polarRibbonPath(
      samples,
      samples.map((sample) => ({ ...sample, radius: RING_R0 }))
    );
    const turns = ribbonKinks(path);
    expect(turns).toBeLessThan(12);
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

  it("keeps every Fritsch-Carlson radius between the neighbouring supports", () => {
    const values = Array.from({ length: 96 }, (_, index) => 6 + 14 * Math.sin((index / 96) * Math.PI * 4) + ((index % 5) - 2) * 3);
    const supports = values.map((value, index) => ({ angleDeg: quarterCenterDeg(index), radius: ringRadius(value) }));
    const samples = day(values);
    for (const sample of samples) {
      let hi = 1;
      while (hi < supports.length && supports[hi].angleDeg < sample.angleDeg) hi += 1;
      const left = supports[Math.max(0, hi - 1)];
      const right = supports[Math.min(supports.length - 1, hi)];
      const low = Math.min(left.radius, right.radius);
      const high = Math.max(left.radius, right.radius);
      expect(sample.radius).toBeGreaterThanOrEqual(low - 1e-6);
      expect(sample.radius).toBeLessThanOrEqual(high + 1e-6);
    }
    for (let hour = 0; hour < 24; hour += 1) {
      const start = hour * 15;
      const end = start + 15;
      const interpolated = samples.filter((sample) => {
        if (sample.angleDeg <= start || sample.angleDeg >= end) return false;
        return !supports.some((support) => Math.abs(support.angleDeg - sample.angleDeg) < 1e-6);
      });
      expect(interpolated.length).toBeGreaterThanOrEqual(4);
    }
    const path = polarAreaPath(samples, RING_R0);
    const outer = path.slice(0, path.lastIndexOf(" L "));
    expect(outer.startsWith("M ")).toBe(true);
    expect(outer).toMatch(/ C /);
    expect(outer).not.toMatch(/ L /);
  });

  it("averages a repeated clock hour onto one knot", () => {
    const knots = oneKnotPerClockAngle([
      { angleDeg: quarterCenterForHour(2), value: -1.785 },
      { angleDeg: quarterCenterForHour(2), value: 0.964 },
    ]);
    expect(knots).toHaveLength(1);
    expect(knots[0].value).toBeCloseTo((-1.785 + 0.964) / 2, 5);
  });

  it("has no sharp second-difference sign change on the charge band from 00 to 04", () => {
    // 25 October 2026 repeats 02:00–02:45. The two hours used to share one angle.
    const early: Array<[number, number, number]> = [
      [0, 1.057, 1.057],
      [0.25, 1.305, 1.305],
      [0.5, 0.639, 0.639],
      [0.75, -0.049, 0],
      [1, -0.127, 0],
      [1.25, -0.248, 0],
      [1.5, -0.541, 0],
      [1.75, -1.466, 0],
      [2, -1.785, 0],
      [2.25, -1.61, 0],
      [2.5, -1.226, 0],
      [2.75, -0.888, 0],
      [2, 0.964, 0.964],
      [2.25, 1.097, 1.097],
      [2.5, 0.003, 0.003],
      [2.75, -0.042, 0],
      [3, 0.447, 0.447],
      [3.25, 0.222, 0.222],
      [3.5, 0.292, 0.292],
      [3.75, 0.791, 0.791],
      [4, 2.054, 2.054],
    ];
    const points: Array<{ hour: number; ohne: number; mit: number }> = [];
    for (let index = 0; index < 96; index += 1) {
      const hour = index * 0.25;
      const known = early.filter((row) => Math.abs(row[0] - hour) < 0.001);
      if (known.length === 0) {
        points.push({ hour, ohne: 1, mit: 1 });
      } else {
        for (const row of known) points.push({ hour, ohne: row[1], mit: row[2] });
      }
    }
    const ohne = smoothDrawnSeries(points.map((point) => point.ohne));
    const mit = smoothDrawnSeries(points.map((point) => point.mit));
    const ohneSamples = taperRingSamples(
      smoothPolarSamples(
        points.map((point, index) => ({ angleDeg: quarterCenterForHour(point.hour), value: ohne[index] })),
        ringRadius,
        RING_R0
      ),
      RING_R0
    );
    const mitSamples = taperRingSamples(
      smoothPolarSamples(
        points.map((point, index) => ({ angleDeg: quarterCenterForHour(point.hour), value: mit[index] })),
        ringRadius,
        RING_R0
      ),
      RING_R0
    );
    const framePx = 642;
    const view = compactRingView(ringRadius(10), framePx);
    const toPx = framePx / view.w;
    const open = (sample: { angleDeg: number }) => !inMidnightTaper(sample.angleDeg);
    const runs = booleanRuns(
      ohneSamples.map((sample, index) => open(sample) && (mitSamples[index]?.value ?? sample.value) > sample.value + 0.02)
    );
    const from = quarterCenterForHour(0);
    const to = quarterCenterForHour(4);
    const radii: Array<{ outer: number; inner: number }> = [];
    for (const run of runs) {
      const clamped = clampRibbon(
        mitSamples.slice(run.start, run.end + 1),
        ohneSamples.slice(run.start, run.end + 1),
        pxToUser(1.5, view.w, framePx)
      );
      clamped.outer.forEach((sample, index) => {
        if (sample.angleDeg < from || sample.angleDeg > to) return;
        radii.push({ outer: sample.radius, inner: clamped.inner[index].radius });
      });
    }
    expect(radii.length).toBeGreaterThan(40);
    expect(sharpRadiusTurns(radii.map((sample) => sample.outer), toPx)).toEqual([]);
    expect(sharpRadiusTurns(radii.map((sample) => sample.inner), toPx)).toEqual([]);
  });

  it("holds a same-sign day on its own side of the zero circle", () => {
    const positive = day(Array.from({ length: 96 }, (_, index) => 2 + (index % 7)));
    expect(positive.every((sample) => sample.radius >= RING_R0 - 0.001)).toBe(true);
    const negative = day(Array.from({ length: 96 }, (_, index) => -1 - (index % 5)));
    expect(negative.every((sample) => sample.radius <= RING_R0 + 0.001)).toBe(true);
  });
});

/** Sign changes of the second difference whose amplitude exceeds `limitPx`. */
function sharpRadiusTurns(radii: readonly number[], toPx: number, limitPx = 0.5): number[] {
  const turns: number[] = [];
  let previous = 0;
  for (let index = 1; index < radii.length - 1; index += 1) {
    const second = (radii[index + 1] - 2 * radii[index] + radii[index - 1]) * toPx;
    if (index > 1 && second * previous < 0 && Math.max(Math.abs(second), Math.abs(previous)) > limitPx) {
      turns.push(second);
    }
    previous = second;
  }
  return turns;
}

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
