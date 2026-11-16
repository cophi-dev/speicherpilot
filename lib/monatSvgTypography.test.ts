import {
  MONAT_WIDE_VIEWBOX_W,
  monatChartUsesWideLayout,
  monatPageContentWidth,
  monatRenderedFontPx,
} from "@/lib/monatSvgTypography";

describe("monat svg typography", () => {
  it("Wide nur ab Container ≥ 1152 (1024 → narrow)", () => {
    expect(monatPageContentWidth(1024)).toBe(928);
    expect(monatChartUsesWideLayout(928)).toBe(false);
    expect(monatChartUsesWideLayout(MONAT_WIDE_VIEWBOX_W)).toBe(true);
  });

  it.each([1280, 1024, 768, 390] as const)(
    "mindestens 12 px für viewBox-12 bei Viewport %i",
    (viewport) => {
      expect(monatRenderedFontPx(12, viewport)).toBeGreaterThanOrEqual(12);
    },
  );
});