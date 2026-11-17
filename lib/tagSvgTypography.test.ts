import { TAG_WIDE_VIEWBOX_W, tagChartUsesWideLayout, tagRenderedFontPx } from "@/lib/tagSvgTypography";

describe("tag svg typography", () => {
  it.each([1280, 1024, 768, 390] as const)("Viewport %i: viewBox-12 ≥ 12 px gerendert", (viewport) => {
    expect(tagRenderedFontPx(12, viewport)).toBeGreaterThanOrEqual(12);
  });

  it("schaltet unter 1152 Containerbreite auf schmal", () => {
    expect(tagChartUsesWideLayout(TAG_WIDE_VIEWBOX_W - 1)).toBe(false);
    expect(tagChartUsesWideLayout(TAG_WIDE_VIEWBOX_W)).toBe(true);
  });
});