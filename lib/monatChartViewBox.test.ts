import {
  monatHeroChartBox,
  monatHeroUsesWideLayout,
  monatUeberschussChartBox,
} from "@/lib/monatChartViewBox";
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

  it("narrow 928: Höhe ~0,4×Breite, nicht 944", () => {
    const box = monatHeroChartBox(928);
    expect(box.w).toBe(928);
    expect(box.h).toBeGreaterThanOrEqual(300);
    expect(box.h).toBeLessThanOrEqual(400);
  });

  it("Überschuss-Pool narrow: Höhe folgt Inhalt (~0,4×Breite), nicht 404-Skalierung", () => {
    const rows = 4;
    for (const shellW of [672, 928]) {
      const box = monatUeberschussChartBox(shellW, rows);
      expect(box.w).toBe(shellW);
      expect(box.h).toBeLessThan(Math.round(404 * (shellW / 350)));
      expect(box.h / box.w).toBeGreaterThan(0.35);
      expect(box.h / box.w).toBeLessThan(0.65);
    }
  });
});