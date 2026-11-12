import { buildMonatV1Model } from "@/lib/monatV1Model";
import { monthStatsForRun } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";

describe("Simulator Fahrweisen Daten", () => {
  const data = loadSimulatorFahrweisen();

  it("Front hat 18 Punkte, Default ε-70", () => {
    expect(data.front).toHaveLength(18);
    expect(data.defaultIndex).toBe(data.namedIndices.kompromiss);
    expect(data.front[data.defaultIndex]!.isEps70).toBe(true);
  });

  it("Kernzahlen ×2 (Modellschätzung)", () => {
    expect(data.endpoints.marketLex.revenueMioEur).toBeCloseTo(34.09, 2);
    expect(data.endpoints.marketLex.reductionGw).toBeCloseTo(0.37, 2);
    expect(data.endpoints.netzLex.reductionGw).toBeCloseTo(3.59, 2);
    expect(data.endpoints.eps70.revenueMioEur).toBeCloseTo(33.97, 2);
    expect(data.endpoints.eps70.reductionGw).toBeCloseTo(2.51, 2);
  });

  it("Konsistenz mit Monat-v1-Tabelle ×2 Markt-Spitze", () => {
    const bundle = loadNationalFleetMonthBundle();
    const model = buildMonatV1Model(bundle);
    const mk2 = monthStatsForRun(bundle, 2, "markt");
    const spitze2 = model.hero.points.find((p) => p.factor === 2)!;
    expect(spitze2.marktGw).toBeCloseTo(mk2.peakAfterGw, 3);
    expect(data.endpoints.marketLex.peakGw).toBeCloseTo(mk2.peakAfterGw, 2);
  });

  it("Tagesklassen: 0 Win-win", () => {
    expect(data.tagesklassenSummary.winWin).toBe(0);
    expect(data.tagesklassen).toHaveLength(31);
  });

  it("Kipppunkt analytisch 64 428 MW", () => {
    expect(data.kipppunkt.analyticalMw).toBe(64428);
    const f39 = data.kipppunkt.factors.find((f) => f.factor === 3.9)!;
    expect(f39.marketPeakGw).toBeCloseTo(64.43, 2);
  });
});
