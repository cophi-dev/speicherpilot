import { gleichzeitigkeitsG, stromNevTariff, stromNevSavings, MODEL_TARIFF_MS } from "@/lib/stromNevTariff";

describe("stromNevTariff", () => {
  it("is continuous at 2500 h", () => {
    const p = 1000;
    const wLow = 2499.999 * p;
    const wMid = 2500 * p;
    const a = stromNevTariff(p, wLow).totalEur / p;
    const b = stromNevTariff(p, wMid).totalEur / p;
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });

  it("g(8760)=1", () => {
    expect(gleichzeitigkeitsG(8760)).toBeCloseTo(1, 6);
  });

  it("handles P=0", () => {
    expect(stromNevTariff(0, 100).utilisationHours).toBe(0);
    expect(Number.isNaN(stromNevTariff(0, 100).totalEur)).toBe(false);
  });

  it("band change via storage losses", () => {
    const before = stromNevTariff(800, 600_000);
    const after = stromNevSavings({
      pBeforeKw: 800,
      wBeforeKwh: 600_000,
      pAfterKw: 600,
      wAfterKwh: 600_000 + 50_000,
    });
    expect(after.before.band).toBe("unter");
  });
});
