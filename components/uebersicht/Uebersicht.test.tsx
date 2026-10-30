/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";

import { LanguageContext } from "@/components/language-context";
import { Uebersicht } from "@/components/uebersicht/Uebersicht";
import type { OverviewUiModel } from "@/lib/germanyView";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";

let query = "blick=heute&x=1";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(query),
}));

const baseModel: OverviewUiModel = {
  bounds: { blick: "heute", startKey: "2026-10-30", endKey: "2026-10-30", capEndAtLastSlot: true, dayCount: 1 },
  observed: {
    surplusGwh: 1.2,
    surplusDays: 1,
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
        saturated: false,
        eurModelX1: factor === 1 ? 1200 : null,
        zeroReason: null,
        dayRows: [{ dateBerlin: "2026-10-30", surplusGwh: 1.2, absorbedGwh: 0.5, netImportGwh: 1.5, socEndFraction: 0.5 }],
        quarterPoints: [],
        socSeries: [{ dateBerlin: "2026-10-30", socFraction: 0.5 }],
      },
    ])
  ) as OverviewUiModel["factors"],
  stale: false,
  dataStand: "30.10.2026 08:00 Uhr",
  fleetMissing: false,
  curtailmentQuarterDailyGwh: 23,
  curtailmentQuarterLabel: "Q2 2026",
  curtailmentPublishedLabel: "12.10.2026",
};

function renderOverview(factor = "1") {
  query = `blick=heute&x=${factor}`;
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => undefined }}>
      <Suspense>
        <Uebersicht model={baseModel} until="08:00" />
      </Suspense>
    </LanguageContext.Provider>
  );
}

describe("Uebersicht", () => {
  it("renders four period controls and data stand", () => {
    renderOverview();
    expect(screen.getByRole("radiogroup", { name: /Zeitraum/i })).toBeInTheDocument();
    expect(screen.getByText(/Datenstand/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Modellschätzung/).length).toBeGreaterThan(0);
  });

  it("hides euro amounts from factor 2 upward", () => {
    renderOverview("2");
    expect(document.body.textContent).not.toMatch(/≈\s*[\d.,]+\s*€/);
    expect(document.body.textContent).toMatch(/Ab ×2|From ×2/);
  });
});
