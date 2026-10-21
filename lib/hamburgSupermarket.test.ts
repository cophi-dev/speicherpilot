import { HAMBURG_SUPERMARKET, planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { READABILITY_CONFIG } from "@/lib/readability";

describe("hamburg supermarket example", () => {
  const plan = planHamburgSupermarket();

  it("brings the peak onto the connection limit", () => {
    expect(plan.peakImportBeforeKw).toBeGreaterThan(HAMBURG_SUPERMARKET.limitKw);
    expect(plan.peakImportAfterKw).toBeLessThanOrEqual(HAMBURG_SUPERMARKET.limitKw + 1e-3);
    expect(plan.exceedanceHoursAfter).toBeLessThan(0.05);
    expect(plan.connection).not.toBe("over");
    expect(plan.peakExportAfterKw).toBeLessThanOrEqual(HAMBURG_SUPERMARKET.limitKw + 1e-3);
  });

  it("pays back inside the green reading band", () => {
    expect(plan.paybackYears).not.toBeNull();
    expect(plan.paybackYears as number).toBeLessThanOrEqual(READABILITY_CONFIG.paybackGreenMaxYears);
    expect(plan.paybackYears as number).toBeGreaterThan(0);
  });

  it("estimates grid-supportive discharge without a new peak", () => {
    expect(plan.gridSupport.status).toBe("supportive");
    expect(plan.powerKw).toBe(HAMBURG_SUPERMARKET.powerKw);
    expect(plan.energyKwh).toBe(HAMBURG_SUPERMARKET.energyKwh);
  });
});
