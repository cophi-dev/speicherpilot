import { QUARTIER, planQuartier, quartierProfile, quartierPvKwp } from "@/lib/quartierExample";
import { READABILITY_CONFIG } from "@/lib/readability";

describe("quartier example", () => {
  const profile = quartierProfile();

  it("is a full synthetic year for 150 households", () => {
    expect(profile.samplesKw).toHaveLength(365 * 96);
    expect(profile.synthetic).toBe(true);
    expect(profile.sourceNote).toMatch(/BEISPIELDATEN/);
    expect(QUARTIER.households).toBe(150);
    expect(quartierPvKwp()).toBeCloseTo(QUARTIER.households * QUARTIER.pvShare * QUARTIER.pvKwpEach);
  });

  it("holds the station on its planning rating and pays back inside the green band", () => {
    const plan = planQuartier();
    expect(plan.peakImportBeforeKw).toBeGreaterThan(QUARTIER.transformerKw);
    expect(plan.peakImportAfterKw).toBeLessThanOrEqual(QUARTIER.transformerKw + 1e-3);
    expect(plan.exceedanceHoursAfter).toBeLessThan(0.05);
    expect(plan.connection).not.toBe("over");
    expect(plan.paybackYears).not.toBeNull();
    expect(plan.paybackYears as number).toBeLessThanOrEqual(READABILITY_CONFIG.paybackGreenMaxYears);
    expect(plan.powerKw).toBe(QUARTIER.powerKw);
    expect(plan.energyKwh).toBe(QUARTIER.energyKwh);
  });
});
