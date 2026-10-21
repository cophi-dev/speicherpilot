import {
  boxFitsCircle,
  centerLimitPx,
  compactHourLabel,
  compactRingView,
  COMPACT_FRAME_PX,
  COMPACT_RING_MIN_PX,
  energyColor,
  polarPoint,
  ringDiskPx,
  ringRadius,
  RING_GAP_DEG,
  RING_R0,
  RING_SLOTS,
  sectorPath,
  segmentAngles,
  socRingGeometry,
} from "@/lib/dayRingScale";

describe("day ring scale", () => {
  it("keeps a linear radius with the zero circle at r0", () => {
    expect(ringRadius(0)).toBe(RING_R0);
    expect(ringRadius(10)).toBeCloseTo(RING_R0 + 42, 5);
    expect(ringRadius(-10)).toBeCloseTo(RING_R0 - 42, 5);
    expect(ringRadius(-1000)).toBe(1);
  });

  it("leaves a 2° gap centred on midnight for the 00 tick", () => {
    const span = (360 - RING_GAP_DEG) / RING_SLOTS;
    expect(segmentAngles(0).start).toBeCloseTo(RING_GAP_DEG / 2, 5);
    expect(segmentAngles(0).end - segmentAngles(0).start).toBeCloseTo(span, 5);
    expect(segmentAngles(95).end).toBeCloseTo(360 - RING_GAP_DEG / 2, 5);
    expect(segmentAngles(0).start).toBeGreaterThan(0);
    expect(segmentAngles(95).end).toBeLessThan(360);
  });

  it("puts midnight at the top and runs clockwise", () => {
    const top = polarPoint(0, 0, 100, 0);
    const right = polarPoint(0, 0, 100, 90);
    expect(top.x).toBeCloseTo(0, 5);
    expect(top.y).toBeCloseTo(-100, 5);
    expect(right.x).toBeCloseTo(100, 5);
    expect(right.y).toBeCloseTo(0, 5);
  });

  it("rounds polar coordinates to hundredths", () => {
    const point = polarPoint(0, 0, ringRadius(38), 47.25);
    expect(point.x).toBe(Math.round(point.x * 100) / 100);
    expect(point.y).toBe(Math.round(point.y * 100) / 100);
    const path = sectorPath(0, 0, 143, ringRadius(38), 1.25, 8.5);
    expect(path).not.toMatch(/\d\.\d{3}/);
  });

  it("sizes a 390px frame so the disk is at least 340px and the hour label stays inside", () => {
    for (const gw of [0, 12, 38, 52]) {
      const outer = Math.max(ringRadius(gw), RING_R0);
      const view = compactRingView(outer);
      expect(ringDiskPx(outer, COMPACT_FRAME_PX, view.w)).toBeGreaterThanOrEqual(COMPACT_RING_MIN_PX);
      const label = compactHourLabel(outer, view.w / 2);
      const outermost = label.labelRadius + label.labelGap + label.fontSize * 0.7;
      expect(outermost).toBeLessThanOrEqual(view.w / 2 + 0.05);
    }
  });

  it("keeps the centre box 12px inside the inner circle", () => {
    const hole = socRingGeometry("GW").innerEdge;
    const limit = centerLimitPx(hole, 720, 1520, 12);
    expect(limit).toBeCloseTo(hole * (720 / 1520) - 12, 5);
    expect(boxFitsCircle(80, 28, limit)).toBe(true);
    expect(boxFitsCircle(limit * 2, 4, limit)).toBe(false);
  });

  it("clamps colour outside −7..38 GW and hits the published stops", () => {
    expect(energyColor(-7)).toBe("#9BF6E6");
    expect(energyColor(-10)).toBe("#9BF6E6");
    expect(energyColor(0)).toBe("#1E9CB0");
    expect(energyColor(38)).toBe("#FF6655");
    expect(energyColor(47.73)).toBe("#FF6655");
    expect(energyColor(4)).toBe("#2786B8");
  });

  it("builds a closed sector", () => {
    const path = sectorPath(0, 0, 180, 220, 1, 4);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.includes("A ")).toBe(true);
  });
});
