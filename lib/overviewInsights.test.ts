import { buildOverviewInsights } from "@/lib/overviewInsights";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import { overviewBounds } from "@/lib/overviewRange";

function model(partial: Partial<OverviewEvaluation["observed"]>): OverviewEvaluation {
  const bounds = overviewBounds("7tage", "2026-11-03");
  const factors = Object.fromEntries(
    LIVE_DISPATCH_FACTORS.map((factor) => [
      factor,
      {
        absorbedGwh: 10,
        absorbedShare: 0.2,
        dischargedGwh: 8,
        dischargedDuringImportGwh: 0,
        eveningPeakBeforeGw: 42,
        eveningPeakAfterGw: 38,
        endSocDeltaGwh: 1,
        startSocGwh: 0,
        endSocGwh: 1,
        saturated: factor >= 10,
        eurModelX1: null,
        zeroReason: null,
        dayRows: [{ dateBerlin: "2026-11-01", surplusGwh: 30, absorbedGwh: 12, socMaxFraction: 0.9 }],
        quarterPoints: [],
        socSeries: [],
      },
    ])
  ) as OverviewEvaluation["factors"];
  return {
    bounds,
    observed: {
      surplusGwh: 80,
      surplusDays: 3,
      dayCount: 7,
      importGwh: null,
      exportGwh: null,
      netImportGwh: 50,
      peakSurplusMw: null,
      peakSurplusIso: null,
      missingQuarters: 0,
      totalQuarters: 672,
      lastSurplusDateBerlin: "2026-11-01",
      openDay: false,
      ...partial,
    },
    factors,
  };
}

describe("buildOverviewInsights", () => {
  it("returns at most three items", () => {
    const items = buildOverviewInsights(model({}), "7tage", "de");
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0]?.text).toMatch(/Überschuss/);
  });
});
