import { buildThreeGoalsCompare, formatMarktPeakFootnote, marktPeakFootnoteFromRun } from "@/lib/nationalFleetThreeGoals";
import { loadNationalFleetBundleMeta } from "@/lib/nationalMonthFleetModel.server";

describe("buildThreeGoalsCompare", () => {
  it("matches audit figures at ×1", () => {
    const model = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
    const ue = model.rows.find((r) => r.strategy === "ueberschuss")!.cells.find((c) => c.factor === 1)!;
    const sp = model.rows.find((r) => r.strategy === "spitze")!.cells.find((c) => c.factor === 1)!;
    const mk = model.rows.find((r) => r.strategy === "markt")!.cells.find((c) => c.factor === 1)!;
    expect(ue.chargeGwh).toBeCloseTo(55.9, 1);
    expect(ue.peakReductionGw).toBeCloseTo(2.24, 2);
    expect(sp.peakReductionGw).toBeCloseTo(3.55, 2);
    expect(sp.chargeGwh).toBeCloseTo(12.49, 1);
    expect(mk.chargeGwh).toBeCloseTo(485.45, 0);
    expect(mk.peakReductionGw).toBeCloseTo(0.37, 2);
  });

  it("markt ×10 peak timestamp from bundle", () => {
    const model = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
    expect(model.marktX10PeakTs).toContain("2026-10-21T14:00");
    const mk10 = model.rows.find((r) => r.strategy === "markt")!.cells.find((c) => c.factor === 10)!;
    expect(mk10.peakAfterGw).toBeCloseTo(96.76, 2);
  });
});

describe("marktPeakFootnoteFromRun", () => {
  it("formats 21.10. peak", () => {
    const d = marktPeakFootnoteFromRun("2026-10-21T14:00:00+02:00", 50960.5, 96760.5, 45800, 201.29);
    expect(d.peakAfterGw).toBeCloseTo(96.76, 2);
    expect(formatMarktPeakFootnote(d)).toContain("96,76 GW");
    expect(formatMarktPeakFootnote(d)).toContain("201,29");
  });
});
