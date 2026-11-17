import { monatHeroChartBox } from "@/lib/monatChartViewBox";
import { layoutMonatHeroYAxis } from "@/lib/monatHeroYAxisLabels";

function yGw(gw: number, yMin: number, yMax: number, plotH: number, padT: number): number {
  return padT + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
}

describe("layoutMonatHeroYAxis", () => {
  it.each([390, 768, 1024] as const)("Viewport %i: 60 vs 64,4 ohne Label-Kollision", (viewport) => {
    const shell = viewport >= 768 ? viewport - (viewport >= 768 ? 96 : 40) : viewport - 40;
    const vb = monatHeroChartBox(shell);
    const plotH = vb.h - vb.T - vb.B;
    const yMin = 40;
    const yMax = 100;
    const refPeakGw = 64.4;
    const yTickLine = (gw: number) => yGw(gw, yMin, yMax, plotH, vb.T);
    const refLineY = yTickLine(refPeakGw);
    const raw = [40, 60, 80, 100];
    const { ticks, refPeakLabelY } = layoutMonatHeroYAxis(raw, yTickLine, refLineY);
    const minDist = 18;
    for (const t of ticks) {
      expect(Math.abs(yTickLine(t) + 4 - refPeakLabelY)).toBeGreaterThanOrEqual(minDist);
    }
    expect(refPeakLabelY).toBeLessThanOrEqual(refLineY + 4);
  });

  it("setzt Referenzlabel oberhalb der Linie wenn unten zu eng", () => {
    const yMap = (gw: number) => 200 - (gw - 40) * 2;
    const refLineY = yMap(64.4);
    const { refPeakLabelY } = layoutMonatHeroYAxis([40, 60, 80], yMap, refLineY, 14, 4);
    expect(refPeakLabelY).toBe(refLineY - 8);
  });
});