import { REFERENCE_PARK, referenceParkCRate, referenceParkHoursAtFullPower } from "@/lib/referencePark";

describe("Bollingstedt public reference", () => {
  it("uses the published power, energy, duration and C-rate", () => {
    expect(REFERENCE_PARK.powerMw).toBe(103.5);
    expect(REFERENCE_PARK.energyMwh).toBe(238.5);
    expect(Number(referenceParkHoursAtFullPower().toFixed(1))).toBe(2.3);
    expect(Number(referenceParkCRate().toFixed(2))).toBe(0.43);
    expect(REFERENCE_PARK.voltageLevel).toBe("HS");
    expect(REFERENCE_PARK.voltageKv).toBe(110);
    expect(REFERENCE_PARK.gridOperator).toBe("SH Netz");
    expect(REFERENCE_PARK.commissioningIso).toBe("2025-03-13");
    expect(REFERENCE_PARK.operator).toBe("ECO STOR");
    expect(REFERENCE_PARK.owner).toBe("Alpiq");
    expect(REFERENCE_PARK.ownerSinceIso).toBe("2026-08-25");
    expect(REFERENCE_PARK.sources.length).toBeGreaterThanOrEqual(3);
    expect(REFERENCE_PARK.mastrUnits.map((unit) => unit.seeId)).toEqual(["SEE925543621515", "SEE922158261037"]);
    expect(REFERENCE_PARK.connection).toEqual({ type: "fca-dynamic", publishedLimitMw: null });
    expect(REFERENCE_PARK.operatorEnergyMwh).toBe(238);
  });

  it("does not carry a euro amount", () => {
    expect(JSON.stringify(REFERENCE_PARK)).not.toMatch(/€|eur|revenue|\bprice\b/i);
  });
});
