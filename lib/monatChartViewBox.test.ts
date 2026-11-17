import { monatHeroChartBox, monatHeroUsesWideLayout } from "@/lib/monatChartViewBox";
import { monatRenderedFontPx } from "@/lib/monatSvgTypography";

describe("monatChartViewBox", () => {
  it("viewBox-Breite folgt Shell bei 1024", () => {
    const box = monatHeroChartBox(928);
    expect(box.w).toBe(928);
    expect(monatHeroUsesWideLayout(928)).toBe(false);
    expect(monatRenderedFontPx(14, 1024)).toBeLessThanOrEqual(16);
    expect(monatRenderedFontPx(14, 1024)).toBeGreaterThanOrEqual(12);
  });

  it("wide ab 1152", () => {
    expect(monatHeroChartBox(1200).w).toBe(1152);
    expect(monatHeroUsesWideLayout(1200)).toBe(true);
  });
});