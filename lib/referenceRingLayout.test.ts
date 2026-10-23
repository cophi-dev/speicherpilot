import { referenceFramePx, referenceRingCss } from "@/lib/referenceRingLayout";

describe("reference ring geometry", () => {
  it("keeps the power band at least 8 px outside the full state-of-charge ring at 390 and 1280", () => {
    for (const viewport of [390, 1280]) {
      const frame = referenceFramePx(viewport);
      const ring = referenceRingCss(frame);
      expect(ring.bandInnerPx).toBeGreaterThanOrEqual(ring.socOuter100Px + 8);
      expect(ring.innerEdgePx).toBeCloseTo(ring.clearPx + 6, 5);
      expect(ring.thicknessPx(0)).toBe(ring.tMinPx);
      expect(ring.thicknessPx(1)).toBe(ring.t100Px);
      expect(ring.thicknessPx(0.5)).toBeCloseTo(Math.max(ring.tMinPx, 0.5 * ring.t100Px), 5);
      expect(ring.bandOuterPx).toBeGreaterThan(ring.bandInnerPx);
    }
  });

  it("uses the 390 thicknesses on a phone frame and the 1280 thicknesses on a desk frame", () => {
    const phone = referenceRingCss(referenceFramePx(390));
    const desk = referenceRingCss(referenceFramePx(1280));
    expect(phone.narrow).toBe(true);
    expect(phone.clearPx).toBe(44);
    expect(phone.tMinPx).toBe(3);
    expect(phone.t100Px).toBe(8);
    expect(desk.narrow).toBe(false);
    expect(desk.clearPx).toBe(58);
    expect(desk.tMinPx).toBe(4);
    expect(desk.t100Px).toBe(14);
    expect(phone.bandOuterPx / phone.diskPx).toBeCloseTo(0.95, 5);
  });
});
