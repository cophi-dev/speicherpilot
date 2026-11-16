import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { loadBeitraegeMarktInsights } from "@/lib/beitraegeKontext.server";
import { DAILY_SERIES_REVALIDATE_SECONDS } from "@/lib/dailySeriesCache";
import { buildMarktInsights, pickMarktInsightsForRoute } from "@/lib/marktInsights";

jest.mock("@/lib/navShortcuts.server", () => ({
  resolveNavShortcuts: jest.fn(async () => ({
    tagHref: "/tag/2026-11-15",
    monatHref: "/monat/2026-11",
    lastCompleteDayKey: "2026-11-15",
  })),
}));

jest.mock("@/lib/germanyViewTag.server", () => ({
  loadGermanyViewForTag: jest.fn(async (dayKey: string) => ({
    lastCompleteDayKey: dayKey,
    auffaelligkeitRecords: [
      {
        dateKey: dayKey,
        surplusGwh: 0,
        dryStreak: 21,
        spread: 180,
        pmin: 160,
        pmax: 340,
        negH: 0,
        surplusH: 0,
        pminAt: null,
        pmaxAt: null,
        eveningPeakGw: 42,
        eveningPeakAt: "18:00",
        peakCutGw: null,
        absorbedGwh: 0,
        fullAt: null,
        fullMin: null,
        wsShare: 0.4,
      },
    ],
    dispatch: {
      fleet: { powerGw: 4.64, energyGwh: 8.15 },
    },
    dayOverview: null,
  })),
}));

describe("loadBeitraegeMarktInsights", () => {
  it("richtet trockenstrecke auf den letzten vollständigen Tag (Vortag) aus", async () => {
    const { marktInsights, focusDayKey } = await loadBeitraegeMarktInsights();
    expect(focusDayKey).toBe("2026-11-15");
    const trocken = marktInsights.find((i) => i.id === "trockenstrecke");
    expect(trocken?.text).toMatch(/15\.11\./);
    expect(trocken?.text).toMatch(/21\. Tag in Folge/);
    expect(trocken?.period).toMatch(/15\.11\./);
  });
});

describe("/beitraege page wiring", () => {
  it("nutzt ISR und keine eingefrorene Snapshot-Quelle", () => {
    const src = readFileSync(join(process.cwd(), "app/beitraege/page.tsx"), "utf8");
    expect(src).toContain(`export const revalidate = ${DAILY_SERIES_REVALIDATE_SECONDS}`);
    expect(src).not.toContain("force-static");
    expect(src).not.toContain("loadTagRollSnapshot");
    expect(src).toContain("loadBeitraegeMarktInsights");
  });
});

describe("buildMarktInsights focus guard", () => {
  it("hält trockenstrecke-Datum an focusDayKey fest", () => {
    const records = JSON.parse(
      readFileSync(join(process.cwd(), "data/tag-pages/roll-snapshot.json"), "utf8"),
    ).records.slice(-40) as TagesKennzahlRecord[];
    const focus: TagesKennzahlRecord = {
      ...records[records.length - 1],
      dateKey: "2026-11-15",
      surplusGwh: 0,
      dryStreak: 21,
    };
    const all = buildMarktInsights({
      records: [...records, focus],
      fleetPowerGw: 4.64,
      fleetEnergyGwh: 8.14,
      focusDayKey: "2026-11-15",
    });
    const beitraege = pickMarktInsightsForRoute("beitraege", all, 4);
    const trocken = beitraege.find((i) => i.id === "trockenstrecke");
    expect(trocken?.text).toMatch(/15\.11\./);
    expect(trocken?.text).not.toMatch(/8\.11\./);
  });
});