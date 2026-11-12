import { additionalFleetAtFactor } from "@/lib/fleetXkConvention";
import { auditNationalFactorRun, expectedNationalCaps } from "@/lib/nationalFactorGate";

describe("nationalFactorGate", () => {
  it("usable cap is 80 % der Zusatzflotte (ungerundete Basis)", () => {
    expect(expectedNationalCaps(1).usableMwh).toBe(0);
    expect(expectedNationalCaps(2).usableMwh).toBeCloseTo(additionalFleetAtFactor(2).energyMwh * 0.8, 5);
    expect(expectedNationalCaps(5).usableMwh).toBeCloseTo(additionalFleetAtFactor(5).energyMwh * 0.8, 5);
    expect(expectedNationalCaps(10).usableMwh).toBeCloseTo(additionalFleetAtFactor(10).energyMwh * 0.8, 5);
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
