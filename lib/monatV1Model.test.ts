import { buildMonatV1Model } from "@/lib/monatV1Model";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

describe("Monat v1 Modell", () => {
  const bundle = loadNationalFleetMonthBundle();
  const model = buildMonatV1Model(bundle);

  it("Referenzspitze Oktober", () => {
    expect(model.refPeakGw).toBeCloseTo(64.4, 1);
  });

  it("Spitze ×1 und ×10", () => {
    expect(model.heroTable.spitzeX1).toBeCloseTo(64.4, 1);
    expect(model.heroTable.spitzeX10).toBeCloseTo(50.4, 1);
  });

  it("Kipppunkt-Label ≈×3,9", () => {
    expect(model.hero.kipppunktLabel).toBe("ab ≈×3,9");
    expect(model.hero.kipppunktFactor).toBeCloseTo(3.9, 1);
  });

  it("Markt ×10 über Referenz", () => {
    const m10 = model.hero.points.find((p) => p.factor === 10)!;
    expect(m10.marktGw).toBeGreaterThan(model.refPeakGw);
  });

  it("×5 mit 4 h senkt mehr als ×10 mit 1,76 h", () => {
    expect(model.showMehrAlsLink).toBe(true);
  });

  it("Y-Achse fasst Marktmaximum ein", () => {
    const m10 = model.hero.points.find((p) => p.factor === 10)!.marktGw!;
    expect(model.yMaxGw).toBeGreaterThanOrEqual(m10);
  });
});
