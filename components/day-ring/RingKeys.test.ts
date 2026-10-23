import { KEY_CLEARANCE_PX, pointRectGap, rectGap, shortenLeader, shiftMark, socMark } from "@/components/day-ring/RingKeys";
import { pxToUser, RING_R0, socRingGeometry } from "@/lib/dayRingScale";

describe("ring key geometry", () => {
  it("anchors Ladezustand on the inner arc and keeps the word inside it", () => {
    for (const [unit, bold] of [
      ["GW", false],
      ["kW", false],
      ["kW", true],
    ] as const) {
      const { innerEdge } = socRingGeometry(unit, bold);
      const mark = socMark(unit, bold, 840, 720);
      expect(Math.hypot(mark.touch.x, mark.touch.y)).toBeCloseTo(innerEdge, 1);
      expect(Math.hypot(mark.label.x, mark.label.y)).toBeLessThan(innerEdge - 1);
    }
  });

  it("stops the shift hairline on the dotted radius, outside it, short of the label", () => {
    const mark = shiftMark(20, 260, 840, 720);
    const touch = Math.hypot(mark.touch.x, mark.touch.y);
    const end = Math.hypot(mark.lineEnd.x, mark.lineEnd.y);
    const label = Math.hypot(mark.label.x, mark.label.y);
    expect(touch).toBeCloseTo(RING_R0 - 36, 1);
    expect(end).toBeGreaterThanOrEqual(touch - 0.05);
    expect(end).toBeLessThan(label);
    const gap = pxToUser(KEY_CLEARANCE_PX, 840, 720);
    expect(label - end).toBeGreaterThan(gap * 0.9);
  });

  it("does not let a shortened leader cross back over the arc", () => {
    const from = { x: 0, y: -184 };
    const inside = { x: 0, y: -100 };
    expect(shortenLeader(from, inside, 4, 184, "outside")).toEqual(from);
    const pulled = shortenLeader(from, { x: 0, y: -224 }, 8, 184, "outside");
    expect(Math.hypot(pulled.x, pulled.y)).toBeGreaterThan(184);
  });

  it("measures an 8px gap between boxes", () => {
    const label = { left: 0, right: 40, top: 0, bottom: 20 };
    expect(rectGap(label, { left: 48, right: 80, top: 0, bottom: 20 })).toBe(8);
    expect(rectGap(label, { left: 20, right: 30, top: 5, bottom: 10 })).toBeLessThan(0);
    expect(pointRectGap(48, 10, label)).toBe(8);
    expect(pointRectGap(10, 10, label)).toBeLessThan(0);
  });
});
