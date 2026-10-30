import { einschaetzung } from "@/lib/overviewSentence";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import { overviewBounds } from "@/lib/overviewRange";

function emptyFactors(surplusGwh: number, absorbedByFactor: Record<number, number>, saturatedFrom: number | null): OverviewEvaluation["factors"] {
  return Object.fromEntries(
    LIVE_DISPATCH_FACTORS.map((factor) => {
      const absorbed = absorbedByFactor[factor] ?? 0;
      const share = surplusGwh > 1e-9 ? absorbed / surplusGwh : null;
      const saturated =
        saturatedFrom !== null && factor >= saturatedFrom && surplusGwh > 1e-9 && absorbed >= surplusGwh * 0.995 - 1e-6;
      return [
        factor,
        {
          absorbedGwh: absorbed,
          absorbedShare: share,
          dischargedGwh: absorbed * 0.85,
          dischargedDuringImportGwh: 0,
          eveningPeakBeforeGw: null,
          eveningPeakAfterGw: null,
          endSocDeltaGwh: 0,
          startSocGwh: 0,
          endSocGwh: 0,
          saturated,
          eurModelX1: null,
          zeroReason: null,
          dayRows: [],
          quarterPoints: [],
          socSeries: [],
        },
      ];
    })
  ) as OverviewEvaluation["factors"];
}

function baseModel(
  partial: Partial<OverviewEvaluation["observed"]> & {
    absorbedByFactor?: Record<number, number>;
    saturatedFrom?: number | null;
  },
  boundsBlick: "heute" | "gestern" | "30tage" = "30tage"
): OverviewEvaluation {
  const todayKey = "2026-10-30";
  const bounds = overviewBounds(boundsBlick, todayKey);
  const surplusGwh = partial.surplusGwh ?? 146;
  return {
    bounds,
    observed: {
      surplusGwh,
      surplusDays: partial.surplusDays ?? 9,
      dayCount: bounds.dayCount,
      importGwh: partial.importGwh ?? null,
      exportGwh: partial.exportGwh ?? null,
      netImportGwh: partial.netImportGwh ?? null,
      peakSurplusMw: null,
      peakSurplusIso: null,
      missingQuarters: 0,
      totalQuarters: 96,
      lastSurplusDateBerlin: partial.lastSurplusDateBerlin ?? "2026-10-25",
      openDay: partial.openDay ?? false,
    },
    factors: emptyFactors(
      surplusGwh,
      partial.absorbedByFactor ?? { 1: 52.2, 5: 116.8, 10: 145.7 },
      partial.saturatedFrom ?? 10
    ),
  };
}

describe("einschaetzung", () => {
  it("describes an open day", () => {
    const text = einschaetzung(
      baseModel({ openDay: true, surplusGwh: 1 }, "heute"),
      1,
      "de",
      { until: "09:00" }
    );
    expect(text).toMatch(/Tag läuft noch/);
    expect(text).toMatch(/09:00/);
  });

  it("describes no surplus with last surplus day", () => {
    const text = einschaetzung(
      baseModel({ surplusGwh: 0, netImportGwh: 138, lastSurplusDateBerlin: "2026-10-25" }, "gestern"),
      1,
      "de"
    );
    expect(text).toMatch(/keinen Überschuss/);
    expect(text).toMatch(/138.*GWh.*eingekauft/);
    expect(text).toMatch(/25\. Oktober 2026/);
    expect(text).toMatch(/Mehr Speicher hätte nichts geändert/);
  });

  it("names fleet uptake shares when ×1 takes less than half", () => {
    const text = einschaetzung(baseModel({ surplusGwh: 146, surplusDays: 9 }), 1, "de");
    expect(text).toMatch(/146 GWh Überschuss/);
    expect(text).toMatch(/gut ein Drittel|52,2 GWh/);
    expect(text).toMatch(/Fünfmal so viel/);
    expect(text).toMatch(/145,7 GWh/);
  });

  it("states saturation from ×N upward", () => {
    const text = einschaetzung(baseModel({ surplusGwh: 70, surplusDays: 2, saturatedFrom: 10 }), 10, "de");
    expect(text).toMatch(/gesamten Überschuss/);
  });
});
