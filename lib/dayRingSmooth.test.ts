import { ringRadius, RING_R0 } from "@/lib/dayRingScale";
import {
  polarAreaPath,
  quarterCenterDeg,
  ringTip,
  smoothDrawnSeries,
  smoothPolarSamples,
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

  it("holds a same-sign day on its own side of the zero circle", () => {
    const positive = day(Array.from({ length: 96 }, (_, index) => 2 + (index % 7)));
    expect(positive.every((sample) => sample.radius >= RING_R0 - 0.001)).toBe(true);
    const negative = day(Array.from({ length: 96 }, (_, index) => -1 - (index % 5)));
    expect(negative.every((sample) => sample.radius <= RING_R0 + 0.001)).toBe(true);
  });
});
