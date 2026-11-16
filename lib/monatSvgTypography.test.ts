import {
  MONAT_WIDE_VIEWBOX_W,
  monatPageContentWidth,
  monatRenderedFontPx,
  monatWideSvgCssWidth,
} from "@/lib/monatSvgTypography";

describe("monat svg typography", () => {
  it("Wide-SVG bei 1024 nicht unter viewBox-Breite (Skalierung ≥ 1)", () => {
    expect(monatPageContentWidth(1024)).toBe(928);
    expect(monatWideSvgCssWidth(1024)).toBe(MONAT_WIDE_VIEWBOX_W);
    expect(monatRenderedFontPx(12, 1024, true)).toBeGreaterThanOrEqual(12);
    expect(monatRenderedFontPx(14, 1024, true)).toBeGreaterThanOrEqual(12);
  });

  it.each([1280, 1024, 768, 390] as const)(
    "mindestens 12 px für viewBox-12 bei Viewport %i",
    (viewport) => {
      const wide = viewport >= 720;
      expect(monatRenderedFontPx(12, viewport, wide)).toBeGreaterThanOrEqual(12);
    },
  );
});