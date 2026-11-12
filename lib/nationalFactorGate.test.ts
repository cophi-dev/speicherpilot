import { auditNationalFactorRun, expectedNationalCaps } from "@/lib/nationalFactorGate";

describe("nationalFactorGate", () => {
  it("expects linear caps 6520/13040/32600/65200 usable at factor 1/2/5/10", () => {
    expect(expectedNationalCaps(1).usableMwh).toBe(6520);
    expect(expectedNationalCaps(2).usableMwh).toBe(13040);
    expect(expectedNationalCaps(5).usableMwh).toBe(32600);
    expect(expectedNationalCaps(10).usableMwh).toBe(65200);
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
