/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { Suspense } from "react";

import { LanguageContext } from "@/components/language-context";
import { Uebersicht } from "@/components/uebersicht/Uebersicht";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import type { OverviewsBundle } from "@/lib/germanyView";
import { overviewBounds } from "@/lib/overviewRange";

const evaluation = {
  bounds: overviewBounds("heute", "2026-10-30"),
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
        saturated: factor === 10,
        eurModelX1: factor === 1 ? 1200 : null,
        zeroReason: null,
        dayRows: [
          {
            dateBerlin: "2026-10-30",
            surplusGwh: 1.2,
            absorbedGwh: 0.5,
            netImportGwh: 1.5,
            socEndFraction: 0.5,
            socMaxFraction: 0.9,
            fullQuarters: 4,
          },
        ],
        quarterPoints: [],
        socSeries: [{ dateBerlin: "2026-10-30", socFraction: 0.5 }],
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

function renderOverview() {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => undefined }}>
      <Suspense>
        <Uebersicht bundle={bundle} until="08:00" />
      </Suspense>
    </LanguageContext.Provider>
  );
}

describe("Uebersicht", () => {
  it("renders period controls and assessment", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("radio", { name: /^Heute$/i }));
    expect(screen.getByRole("radiogroup", { name: /Zeitraum/i })).toBeInTheDocument();
    expect(screen.getByText(/Der Tag läuft noch/)).toBeInTheDocument();
    expect(screen.getAllByText(/Modellschätzung/).length).toBeGreaterThan(0);
  });

  it("switches period without router", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("radio", { name: /7 Tage/i }));
    expect(screen.getByRole("radio", { name: /7 Tage/i })).toHaveAttribute("aria-checked", "true");
  });

  it("updates absorbed figure when factor changes", () => {
    renderOverview();
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "3" } });
    expect(document.body.textContent).toMatch(/Bei ×10 aufgenommen/);
  });
});
