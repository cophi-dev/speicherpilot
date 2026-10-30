import { einschaetzung, sharePhrase, SATURATION } from "@/lib/overviewSentence";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import { overviewBounds } from "@/lib/overviewRange";

const THIN = "\u202F";

function emptyFactors(surplusGwh: number, absorbedByFactor: Record<number, number>, saturatedFrom: number | null): OverviewEvaluation["factors"] {
  return Object.fromEntries(
    LIVE_DISPATCH_FACTORS.map((factor) => {
      const absorbed = absorbedByFactor[factor] ?? 0;
      const share = surplusGwh > 1e-9 ? absorbed / surplusGwh : null;
      const saturated =
        saturatedFrom !== null && factor >= saturatedFrom && surplusGwh > 1e-9 && absorbed >= surplusGwh * SATURATION - 1e-6;
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
  boundsBlick: "heute" | "gestern" | "30tage" | "tag" = "30tage",
  boundsOverride?: { startKey?: string; endKey?: string }
): OverviewEvaluation {
  const todayKey = "2026-10-30";
  const bounds =
    boundsBlick === "tag"
      ? {
          blick: "tag" as const,
          startKey: boundsOverride?.startKey ?? "2026-10-25",
          endKey: boundsOverride?.endKey ?? "2026-10-25",
          capEndAtLastSlot: false,
          dayCount: 1,
        }
      : overviewBounds(boundsBlick, todayKey);
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

describe("sharePhrase", () => {
  it("uses nearest fractions with qualifier and percent", () => {
    expect(sharePhrase(0.31, "de")).toBe(`knapp ein Drittel (31${THIN}%)`);
    expect(sharePhrase(0.51, "de")).toBe(`gut die Hälfte (51${THIN}%)`);
    expect(sharePhrase(0.9, "de")).not.toBe("alles");
  });

  it("uses wenig below 15 % and ein Zehntel from 15 %", () => {
    expect(sharePhrase(0, "de")).toBe("nichts");
    expect(sharePhrase(0.02, "de")).toBe(`wenig (2${THIN}%)`);
    expect(sharePhrase(0.1499, "de")).toBe(`wenig (15${THIN}%)`);
    expect(sharePhrase(0.15, "de")).toBe(`gut ein Zehntel (15${THIN}%)`);
  });

  it("uses alles only from saturation", () => {
    expect(sharePhrase(SATURATION, "de")).toBe("alles");
  });
});

describe("einschaetzung", () => {
  it("describes an open day without surplus", () => {
    const text = einschaetzung(
      baseModel({ openDay: true, surplusGwh: 0, lastSurplusDateBerlin: "2026-10-25" }, "heute"),
      1,
      "de",
      { until: "09:30" }
    );
    expect(text).toMatch(/Heute bisher kein Überschuss \(bis 09:30\)/);
    expect(text).toMatch(/Zuletzt Überschuss: So, 25\.10\./);
    expect(text).not.toMatch(/Tag läuft noch/);
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

  it("uses a calendar-day intro on /live tag scope with one decimal GWh", () => {
    const text = einschaetzung(
      baseModel({ surplusGwh: 22.8, surplusDays: 1, absorbedByFactor: { 1: 12, 2: 20, 5: 40, 10: 60 } }, "tag", {
        startKey: "2026-10-11",
        endKey: "2026-10-11",
      }),
      1,
      "de"
    );
    expect(text).toMatch(/Am .*2026 gab es 22,8 GWh Überschuss/);
    expect(text).not.toMatch(/an 1 Tag/);
  });

  it("names fleet uptake with share word before the bracket", () => {
    const text = einschaetzung(baseModel({ surplusGwh: 146, surplusDays: 9 }), 1, "de");
    expect(text).toMatch(/146 GWh Überschuss/);
    expect(text).toMatch(new RegExp(`gut ein Drittel \\(36${THIN}%, 52,2${THIN}GWh\\)`));
    expect(text).toMatch(/fünfmal so viel Speicher/);
    expect(text).not.toMatch(/×1:/);
  });

  it("uses wenig in the full sentence below 15 % uptake", () => {
    const text = einschaetzung(
      baseModel({
        surplusGwh: 100,
        surplusDays: 3,
        absorbedByFactor: { 1: 4, 5: 40, 10: 95 },
      }),
      1,
      "de"
    );
    expect(text).toMatch(new RegExp(`wenig \\(4${THIN}%, 4,0${THIN}GWh\\)`));
  });

  it("uses an diesem Tag when saturated on tag scope", () => {
    const text = einschaetzung(
      baseModel({ surplusGwh: 70, surplusDays: 1, saturatedFrom: 10 }, "tag", {
        startKey: "2026-10-25",
        endKey: "2026-10-25",
      }),
      10,
      "de"
    );
    expect(text).toMatch(/an diesem Tag nichts/);
  });

  it("states saturation from ×N upward", () => {
    const text = einschaetzung(baseModel({ surplusGwh: 70, surplusDays: 2, saturatedFrom: 10 }), 10, "de");
    expect(text).toMatch(/gesamten Überschuss/);
  });

  it("omits duplicate factor chain at ×2", () => {
    const text = einschaetzung(
      baseModel({ surplusGwh: 80, surplusDays: 2, absorbedByFactor: { 1: 20, 2: 35, 5: 70, 10: 80 } }),
      2,
      "de"
    );
    expect(text).toMatch(/Bei ×2 hätte der Speicher/);
    expect(text).toMatch(new RegExp(`gut zwei Fünftel \\(44${THIN}%, 35,0${THIN}GWh\\)`));
    expect(text).not.toMatch(/×1:/);
    expect(text).not.toMatch(/×2:/);
  });
});
