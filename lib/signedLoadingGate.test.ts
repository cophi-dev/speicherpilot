import { auditSignedLoading, loadingPctFromSignedMw, signedWithBatteryMw } from "@/lib/signedLoadingGate";

describe("signedLoadingGate", () => {
  it("maps reversed signed flow to loading magnitude, not zero", () => {
    const rating = 9.26;
    const signed = signedWithBatteryMw(-1.6777, 0, 10, 0.1, 0.95);
    const pct = loadingPctFromSignedMw(signed, rating);
    expect(pct).toBeGreaterThan(80);
    expect(pct).not.toBe(0);
  });

  it("flags false zero loading", () => {
    const errs = auditSignedLoading({
      ratingMw: 10,
      signedBaseMw: [1],
      chargeMw: [0],
      dischargeMw: [5],
      loadingPct: [0],
      slopeChargeMw: 0.2,
      slopeDischargeMw: -0.9,
    });
    expect(errs.length).toBeGreaterThan(0);
  });
});
