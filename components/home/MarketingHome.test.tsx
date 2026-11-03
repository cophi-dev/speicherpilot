/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";

import { MarketingHome } from "@/components/home/MarketingHome";
import { LanguageContext } from "@/components/language-context";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import type { OverviewsBundle } from "@/lib/germanyView";
import { overviewBounds } from "@/lib/overviewRange";

jest.mock("@/components/home/HomeRing", () => ({
  HomeRing: () => <section className="day-story" aria-labelledby="home-movements"><h2 id="home-movements">Ein Tag in drei Bewegungen</h2></section>,
}));

jest.mock("@/components/home/ConnectionStory", () => ({
  ConnectionStory: () => <section id="peak-shaving"><h2>Was ist Peak Shaving?</h2></section>,
}));

const evaluation = {
  bounds: overviewBounds("heute", "2026-10-30"),
    observed: {
    surplusGwh: 0,
    surplusDays: 0,
    dayCount: 1,
    importGwh: 2,
    exportGwh: 0.5,
    netImportGwh: 1.5,
    peakSurplusMw: 5000,
    peakSurplusIso: "2026-10-30T12:00:00+01:00",
    missingQuarters: 0,
    totalQuarters: 96,
    lastSurplusDateBerlin: "2026-10-29",
    openDay: true,
  },
  factors: Object.fromEntries(
    LIVE_DISPATCH_FACTORS.map((factor) => [
      factor,
      {
        absorbedGwh: 0.5 * factor,
        absorbedShare: 0.4,
        dischargedGwh: 0.3,
        dischargedDuringImportGwh: 0.1,
        eveningPeakBeforeGw: 20,
        eveningPeakAfterGw: 18,
        endSocDeltaGwh: 0.05,
        startSocGwh: 0.8,
        endSocGwh: 0.85,
        saturated: factor === 10,
        eurModelX1: factor === 1 ? 1200 : null,
        zeroReason: null,
        dayRows: [],
        quarterPoints: [],
        socSeries: [],
      },
    ])
  ),
};

const bundle: OverviewsBundle = {
  byBlick: {
    heute: evaluation,
    gestern: { ...evaluation, bounds: overviewBounds("gestern", "2026-10-30") },
    "7tage": { ...evaluation, bounds: overviewBounds("7tage", "2026-10-30") },
    "30tage": { ...evaluation, bounds: overviewBounds("30tage", "2026-10-30") },
  },
  stale: false,
  dataStand: "30.10.2026 08:00 Uhr",
  fleetMissing: false,
  curtailmentQuarterDailyGwh: 23,
  curtailmentQuarterLabel: "Q2 2026",
  curtailmentPublishedLabel: "12.10.2026",
};

const dispatch = {
  day: null,
  fallback: false,
  fleet: null,
};

describe("MarketingHome", () => {
  it("renders story sections before the period overview", () => {
    render(
      <LanguageContext.Provider value={{ language: "de", setLanguage: () => undefined }}>
        <MarketingHome
          overviews={bundle}
          until="08:00"
          dispatch={dispatch}
          exampleDispatch={dispatch}
          todayKey="2026-10-30"
        />
      </LanguageContext.Provider>
    );

    expect(screen.getByText(/Heute bisher kein Überschuss/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ein Tag in drei Bewegungen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Was ist Peak Shaving/i })).toBeInTheDocument();
    expect(document.querySelector("#uebersicht")).toBeInTheDocument();

    const lead = document.querySelector(".start-story-lead");
    const movements = document.getElementById("home-movements")?.closest(".day-story");
    const peak = document.getElementById("peak-shaving");
    const overview = document.getElementById("uebersicht");
    expect(lead?.compareDocumentPosition(movements!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(movements?.compareDocumentPosition(peak!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(peak?.compareDocumentPosition(overview!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
