import { SURPLUS_MONTHS } from "@/lib/surplusMonths";
import { SURPLUS_DAY_GWH } from "@/lib/powerMix";

describe("surplus months file", () => {
  it("lists twelve months and keeps surplus days inside the published days", () => {
    expect(SURPLUS_MONTHS).not.toBeNull();
    expect(SURPLUS_MONTHS!.months).toHaveLength(12);
    expect(SURPLUS_MONTHS!.thresholdGwh).toBe(SURPLUS_DAY_GWH);
    expect(SURPLUS_MONTHS!.generatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const month of SURPLUS_MONTHS!.months) {
      expect(month.surplusDays).toBeLessThanOrEqual(month.days);
      expect(month.days).toBeGreaterThan(0);
    }
  });
});