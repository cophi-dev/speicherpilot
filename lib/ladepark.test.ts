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

  it("peak exceeds connection on spike days", () => {
    const profile = ladeparkProfile(4);
    const conn = ladeparkConnectionKw(4);
    const pMax = ladeparkMaxKw(4);
    let maxKw = 0;
    for (let day = 0; day < 365; day += 1) {
      if (day % 14 !== 4) continue;
      for (let step = 68; step < 72; step += 1) {
        maxKw = Math.max(maxKw, profile.samplesKw[day * 96 + step] ?? 0);
      }
    }
    expect(maxKw).toBeGreaterThanOrEqual(pMax * 0.99);
    expect(maxKw).toBeGreaterThan(conn);
  });

  it("peak shaving lowers import peak vs raw profile", () => {
    const econ = planLadepark(4);
    expect(econ.plan.peakImportBeforeKw).toBeGreaterThan(econ.connectionKw);
    expect(econ.plan.peakImportAfterKw).toBeLessThanOrEqual(econ.connectionKw + 1);
    expect(econ.stromNev.before.utilisationHours).not.toBeCloseTo(econ.stromNev.after.utilisationHours, 0);
  });
});
