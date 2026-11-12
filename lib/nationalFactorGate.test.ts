import { auditNationalFactorRun, expectedNationalCaps } from "@/lib/nationalFactorGate";

describe("nationalFactorGate", () => {
  it("expects additional-fleet caps 0/6520/26080/58680 usable at factor 1/2/5/10", () => {
    expect(expectedNationalCaps(1).usableMwh).toBe(0);
    expect(expectedNationalCaps(2).usableMwh).toBe(6520);
    expect(expectedNationalCaps(5).usableMwh).toBe(26080);
    expect(expectedNationalCaps(10).usableMwh).toBe(58680);
  });

  it("rejects over-cap SoC", () => {
    const errs = auditNationalFactorRun({
      factor: 2,
      nameplateEnergyMwh: 16000,
      nameplatePowerMw: 9160,
      usableEnergyCapMwh: 12800,
      maxSocMwhObserved: 25600,
      quarters: [],
    });
    expect(errs.some((e) => e.includes("maxSoc"))).toBe(true);
  });
});
