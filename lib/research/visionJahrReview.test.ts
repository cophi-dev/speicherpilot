import { contrastRatio } from "@/lib/research/colorContrast";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";
import {
  VISION_CHART_SCOPE_BG_DARK,
  VISION_CHART_SCOPE_BG_LIGHT,
  VISION_CHART_SCOPE_COLOR_DARK,
  VISION_CHART_SCOPE_COLOR_LIGHT,
} from "@/lib/research/visionJahrScope";
import { visionG2StressDistinctFromPeak } from "@/lib/research/visionJahrG2Stress";

describe("Vision Design-Review Pflichttests", () => {
  it("G2: Stresstest-Linie nicht deckungsgleich mit beobachtet", () => {
    const model = buildResearchVision();
    expect(visionG2StressDistinctFromPeak(model)).toBe(true);
    expect(model.marktStressTestGw["NEP C"]).toBeGreaterThan(model.peakGw + 10);
  });

  it("Pflichtzeile: Kontrast ≥ 4,5:1 (hell und dunkel)", () => {
    expect(contrastRatio(VISION_CHART_SCOPE_COLOR_DARK, VISION_CHART_SCOPE_BG_DARK)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(VISION_CHART_SCOPE_COLOR_LIGHT, VISION_CHART_SCOPE_BG_LIGHT)).toBeGreaterThanOrEqual(4.5);
  });
});