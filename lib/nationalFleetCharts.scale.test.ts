import { scaleLinear } from "@/lib/nationalFleetCharts";

describe("Fleet chart residual scale", () => {
  it("oberes Ende umfasst beobachtetes und simuliertes Maximum", () => {
    const rGw = [64.4059, 60, 55];
    const rpGw = [62, 58, -5];
    const lo = Math.min(...rGw, ...rpGw, 0);
    const hi = Math.max(...rGw, ...rpGw) * 1.02;
    const s = scaleLinear([...rGw, ...rpGw], 92, 6, lo, hi);
    const yObs = s.y(64.4059);
    const yNeg = s.y(-5);
    expect(yObs).toBeGreaterThan(6);
    expect(yObs).toBeLessThan(86);
    expect(yNeg).toBeGreaterThanOrEqual(6);
    expect(s.max).toBeCloseTo(64.4059 * 1.02, 6);
    expect(s.y(s.max)).toBeCloseTo(6, 1);
  });
});
