import {
  boxFitsCircle,
  centerCaptionPx,
  centerLimitPx,
  centerWrapPx,
  compactHourLabel,
  compactRingView,
  COMPACT_FRAME_PX,
  HOUR_LABEL_PAD_PX,
  RING_OF_FRAME,
  energyColor,
  kwRadius,
  KW_R0,
  polarPoint,
  ringDiskPx,
  ringRadius,
  RING_GAP_DEG,
  RING_R0,
  RING_SLOTS,
  sectorPath,
  segmentAngles,
  socRingGeometry,
  utilisationColor,
} from "@/lib/dayRingScale";

describe("day ring scale", () => {
  it("keeps a linear radius with the zero circle at r0", () => {
    expect(ringRadius(0)).toBe(RING_R0);
    expect(ringRadius(10)).toBeCloseTo(RING_R0 + 42, 5);
    expect(ringRadius(-10)).toBeCloseTo(RING_R0 - 42, 5);
    expect(ringRadius(-1000)).toBe(1);
  });

  it("leaves a 4° gap centred on midnight for the 00 tick", () => {
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

  it("keeps the evening peak at 92% of a frame that has room for the hour labels", () => {
    for (const gw of [0, 12, 38, 52]) {
      const outer = Math.max(ringRadius(gw), RING_R0);
      const view = compactRingView(outer, 720);
      expect(view.w).toBeCloseTo(view.h, 5);
      expect(view.x).toBeCloseTo(-view.w / 2, 5);
      expect(view.y).toBeCloseTo(-view.h / 2, 5);
      expect(ringDiskPx(outer, 720, view.w)).toBeCloseTo(720 * RING_OF_FRAME, 1);
      const label = compactHourLabel(outer, view.w / 2, 720);
      expect((label.labelGap * 720) / view.w).toBeCloseTo(8, 1);
      expect((label.fontSize * 720) / view.w).toBeCloseTo(12, 1);
      expect(label.labelRadius - label.fontSize * 0.6 - outer).toBeCloseTo(label.labelGap, 1);
      expect(label.labelRadius + label.fontSize * 0.7).toBeLessThanOrEqual(view.w / 2);
    }
  });

  it("shrinks the guide on a 358px frame so 00, 06, 12 and 18 stay inside the viewBox", () => {
    const outer = ringRadius(38);
    const view = compactRingView(outer, COMPACT_FRAME_PX);
    const label = compactHourLabel(outer, view.w / 2, COMPACT_FRAME_PX);
    expect(view.x).toBeCloseTo(-view.w / 2, 5);
    expect(view.y).toBeCloseTo(-view.h / 2, 5);
    expect(ringDiskPx(outer, COMPACT_FRAME_PX, view.w)).toBeLessThan(COMPACT_FRAME_PX * RING_OF_FRAME);
    expect(label.labelRadius + label.fontSize * 0.7).toBeLessThanOrEqual(view.w / 2);
    expect((label.labelGap * COMPACT_FRAME_PX) / view.w).toBeCloseTo(8, 1);
    expect((HOUR_LABEL_PAD_PX * 2) / COMPACT_FRAME_PX).toBeGreaterThan(1 - RING_OF_FRAME);
  });

  it("keeps a miniature frame at 92% so the methodik rings do not shrink to fit a 12px label", () => {
    const outer = ringRadius(38);
    const view = compactRingView(outer, 167);
    expect(ringDiskPx(outer, 167, view.w)).toBeCloseTo(167 * RING_OF_FRAME, 1);
  });

  it("keeps the centre box 12px inside the inner circle", () => {
    const hole = socRingGeometry("GW").innerEdge;
    const limit = centerLimitPx(hole, 720, 1520, 12);
    expect(limit).toBeCloseTo(hole * (720 / 1520) - 12, 5);
    expect(boxFitsCircle(80, 28, limit)).toBe(true);
    expect(boxFitsCircle(limit * 2, 4, limit)).toBe(false);
    expect(centerCaptionPx(22)).toBeCloseTo(13.64, 5);
    expect(centerCaptionPx(8)).toBeLessThan(8);
    expect(centerWrapPx(limit)).toBeCloseTo(limit * 1.6, 2);
    expect(centerWrapPx(limit)).toBeLessThan(limit * 2);
  });

  it("clamps colour outside −7..38 GW and hits the published stops", () => {
    expect(energyColor(-7)).toBe("#9BF6E6");
    expect(energyColor(-10)).toBe("#9BF6E6");
    expect(energyColor(0)).toBe("#1E9CB0");
    expect(energyColor(38)).toBe("#FF6655");
    expect(energyColor(47.73)).toBe("#FF6655");
    expect(energyColor(4)).toBe("#2786B8");
  });

  it("colours site utilisation from export to 130 percent", () => {
    expect(utilisationColor(-0.15)).toBe("#9BF6E6");
    expect(utilisationColor(0)).toBe("#2CC8B8");
    expect(utilisationColor(0.35)).toBe("#1E9CB0");
    expect(utilisationColor(0.6)).toBe("#2F6FC0");
    expect(utilisationColor(0.8)).toBe("#5E62C8");
    expect(utilisationColor(0.9)).toBe("#F2A25C");
    expect(utilisationColor(1)).toBe("#FF6655");
    expect(utilisationColor(1.3)).toBe("#E0364A");
    expect(utilisationColor(2)).toBe("#E0364A");
  });

  it("grows the site ring in kW and keeps zero at r0", () => {
    expect(kwRadius(0)).toBe(KW_R0);
    expect(kwRadius(90)).toBeCloseTo(KW_R0 + 1.35 * 90, 5);
    expect(kwRadius(-10)).toBeCloseTo(KW_R0 - 13.5, 5);
  });

  it("builds a closed sector", () => {
    const path = sectorPath(0, 0, 180, 220, 1, 4);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.includes("A ")).toBe(true);
  });
});
