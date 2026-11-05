import { REFERENCE_PARK, referenceParkCRate, referenceParkHoursAtFullPower } from "@/lib/referencePark";

describe("Großspeicher reference anchor", () => {
  it("uses the model power, energy, duration and C-rate", () => {
    expect(REFERENCE_PARK.powerMw).toBe(100);
    expect(REFERENCE_PARK.energyMwh).toBe(230);
    expect(Number(referenceParkHoursAtFullPower().toFixed(1))).toBe(2.3);
    expect(Number(referenceParkCRate().toFixed(2))).toBeCloseTo(0.43, 2);
  });
});
