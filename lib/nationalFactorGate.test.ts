import { auditNationalFactorRun, expectedNationalCaps } from "@/lib/nationalFactorGate";

describe("nationalFactorGate", () => {
  it("expects linear caps 6400/12800/32000/64000 usable at factor 1/2/5/10", () => {
    expect(expectedNationalCaps(1).usableMwh).toBe(6400);
    expect(expectedNationalCaps(2).usableMwh).toBe(12800);
    expect(expectedNationalCaps(5).usableMwh).toBe(32000);
    expect(expectedNationalCaps(10).usableMwh).toBe(64000);
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
