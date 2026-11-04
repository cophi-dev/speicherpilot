import { ladeparkConnectionKw, ladeparkMaxKw, ladeparkProfile, planLadepark } from "@/lib/ladepark";

describe("ladepark", () => {
  it("sizes categories", () => {
    for (const n of [4, 8, 12, 16] as const) {
      expect(ladeparkMaxKw(n)).toBe(n * 200);
      expect(ladeparkConnectionKw(n)).toBe(0.75 * n * 200);
    }
  });

  it("annual energy target", () => {
    const profile = ladeparkProfile(4);
    const kwh = profile.samplesKw.reduce((s, kw) => s + kw * 0.25, 0);
    expect(kwh).toBeCloseTo(4 * 120_000, -2);
  });

  it("utilisation under 2500h", () => {
    const econ = planLadepark(4);
    expect(econ.stromNev.after.utilisationHours).toBeLessThan(2500);
  });
});
