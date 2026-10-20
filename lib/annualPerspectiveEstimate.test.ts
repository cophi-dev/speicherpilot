import { defaultEconomicsAssumptions } from "@/lib/bessEconomics";
import { buildAnnualPerspectiveCopy } from "@/lib/annualPerspectiveEstimate";

describe("buildAnnualPerspectiveCopy", () => {
  const input = {
    recommendedEnergyMwh: 12_400,
    recommendedPowerMw: 3_100,
    absorbedSurplusShare: 0.42,
    servedDeficitShare: 0.18,
    annualRevenueEur: 7_230_000_000,
    paybackYears: 8.9,
    roundTripEfficiencyPct: 90,
    assumptions: defaultEconomicsAssumptions,
  };

  it("labels euro figures as a throughput-model estimate with the methodology assumptions", () => {
    const copy = buildAnnualPerspectiveCopy({ ...input, language: "de" });

    expect(copy.badge).toMatch(/Modellschätzung/);
    expect(copy.economicsValue).toContain("7.230.000.000");
    expect(copy.economicsValue).toMatch(/Modell-Amortisation/);
    expect(copy.assumptions.join(" ")).toContain("220.000 €/MWh");
    expect(copy.assumptions.join(" ")).toContain("85 €/MWh");
    expect(copy.assumptions.join(" ")).toContain("90 % RTE");
    expect(copy.assumptions.join(" ")).toMatch(/nicht Dispatch-Erlös/);
    expect(copy.sizeValue).toContain("12,4 GWh");
  });

  it("does not invent economics when the model did not return them", () => {
    const copy = buildAnnualPerspectiveCopy({
      ...input,
      language: "en",
      annualRevenueEur: null,
      paybackYears: null,
      absorbedSurplusShare: null,
      servedDeficitShare: null,
    });

    expect(copy.economicsValue).toBe("not computed");
    expect(copy.coverageValue).toBe("not available");
    expect(copy.badge).toMatch(/Model estimate/);
  });
});
