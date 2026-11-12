import { MONAT_V1_KERN3 } from "@/lib/monatV1Format";
import { buildMonatV1Model } from "@/lib/monatV1Model";
import { monthStatsForRun } from "@/lib/nationalMonthFleetModel";
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

  it("Markt ×1 ist die beobachtete Spitze, ×2 liegt knapp darunter", () => {
    const m1 = model.hero.points.find((p) => p.factor === 1)!;
    const m2 = model.hero.points.find((p) => p.factor === 2)!;
    expect(m1.marktGw).toBeCloseTo(model.refPeakGw, 1);
    expect(m2.marktGw).toBeCloseTo(64.04, 2);
    expect(m2.marktGw!).toBeLessThan(model.refPeakGw);
  });

  it("Markt ×10 über Referenz", () => {
    const m10 = model.hero.points.find((p) => p.factor === 10)!;
    expect(m10.marktGw).toBeCloseTo(92.76, 2);
    expect(m10.marktGw).toBeGreaterThan(model.refPeakGw);
  });

  it("×5 mit 4 h senkt die Spitze genauso stark wie ×10 mit 1,76 h", () => {
    const x5h4 = model.duration.find((d) => d.factor === 5)!.h4;
    const x10h176 = model.duration.find((d) => d.factor === 10)!.h176;
    expect(x5h4).toBeCloseTo(14.07, 2);
    expect(x10h176).toBeCloseTo(13.98, 2);
    expect(Math.abs(x5h4 - x10h176)).toBeLessThanOrEqual(0.2);
    expect(model.showDauerVergleich).toBe(true);
    expect(MONAT_V1_KERN3).toMatch(/genauso stark/);
    expect(MONAT_V1_KERN3).not.toMatch(/mehr als/);
  });

  it("Y-Achse fasst Marktmaximum ein", () => {
    const m10 = model.hero.points.find((p) => p.factor === 10)!.marktGw!;
    expect(model.yMaxGw).toBeGreaterThanOrEqual(m10);
  });
  it("Markt ×10 nutzt die ungerundete Basis, nicht 9 × 4,64", () => {
    const mk10 = monthStatsForRun(bundle, 10, "markt");
    const mk5 = monthStatsForRun(bundle, 5, "markt");
    const mk2 = monthStatsForRun(bundle, 2, "markt");
    // 50,9605 + 9 × 4,64409022 = 92,7573 → 92,76; nicht 50,9605 + 9 × 4,64 = 92,72
    expect(mk10.peakAfterGw).toBeCloseTo(50.9605 + 9 * 4.64409022, 4);
    expect(mk10.peakAfterGw).not.toBeCloseTo(50.9605 + 9 * 4.64, 3);
    expect(model.heroTable.marktX10).toBeCloseTo(92.76, 2);
    expect(mk5.peakAfterGw).toBeCloseTo(50.9605 + 4 * 4.64409022, 4);
    // ×2: Abendspitze, keine Korrektur über die Leistungsidentität
    expect(mk2.peakAfterGw).toBeCloseTo(64.0401, 3);
  });
});
