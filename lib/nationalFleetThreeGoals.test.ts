import {
  buildThreeGoalsCompare,
  formatMarktPeakFootnote,
  formatMarktPeakWarnShort,
  marktPeakFootnoteFromRun,
} from "@/lib/nationalFleetThreeGoals";
import { loadNationalFleetBundleMeta } from "@/lib/nationalMonthFleetModel.server";

describe("buildThreeGoalsCompare", () => {
  it("×1 Ist ohne Zusatz — null Wirkung", () => {
    const model = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
    for (const strategy of ["ueberschuss", "spitze", "markt"] as const) {
      const c = model.rows.find((r) => r.strategy === strategy)!.cells.find((x) => x.factor === 1)!;
      expect(c.chargeGwh).toBeCloseTo(0, 1);
      expect(c.peakReductionGw).toBeCloseTo(0, 2);
    }
  });

  it("markt ×10 peak timestamp from bundle", () => {
    const model = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
    expect(model.marktX10PeakTs).toContain("2026-10-21T14:00");
    const mk10 = model.rows.find((r) => r.strategy === "markt")!.cells.find((c) => c.factor === 10)!;
    expect(mk10.peakAfterGw).toBeCloseTo(92.72, 2);
  });
});

describe("marktPeakFootnoteFromRun", () => {
  it("formats 21.10. peak", () => {
    const d = marktPeakFootnoteFromRun("2026-10-21T14:00:00+02:00", 50960.5, 96760.5, 45800, 201.29);
    expect(d.peakAfterGw).toBeCloseTo(96.76, 2);
    expect(formatMarktPeakWarnShort(d)).toContain("96,76 GW");
    expect(formatMarktPeakFootnote(d)).toContain("201,29");
    expect(formatMarktPeakFootnote(d)).toMatch(/21\.10\.2026/);
    expect(formatMarktPeakWarnShort(d)).toMatch(/21\.10\.2026, 14:00/);
    expect(formatMarktPeakWarnShort(d)).not.toMatch(/2026-10-21T/);
  });
});
