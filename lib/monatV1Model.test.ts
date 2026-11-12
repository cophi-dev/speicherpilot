import { buildMonatV1Model } from "@/lib/monatV1Model";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

describe("Monat v1 Modell", () => {
  const bundle = loadNationalFleetMonthBundle();
  const model = buildMonatV1Model(bundle);

  it("Referenzspitze Oktober", () => {
    expect(model.refPeakGw).toBeCloseTo(64.4, 1);
  });

  it("Spitze ×1 und ×10", () => {
    expect(model.heroTable.spitzeX1).toBeCloseTo(60.82, 1);
    expect(model.heroTable.spitzeX10).toBeCloseTo(49.6, 1);
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
