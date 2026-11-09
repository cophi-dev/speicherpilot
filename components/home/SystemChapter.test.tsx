import { fireEvent, render, screen } from "@testing-library/react";

import { SystemChapter } from "@/components/home/SystemChapter";
import type { OverviewEvaluation } from "@/lib/overviewChain";

beforeAll(() => {
  window.matchMedia = (media: string) =>
    ({
      matches: false,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
});

function model(): OverviewEvaluation {
  const dayRows = [
    { dateBerlin: "2026-10-24", surplusGwh: 61.1, absorbedGwh: 8, netImportGwh: null, socEndFraction: 0.4, socMaxFraction: 0.5, fullQuarters: 0 },
    { dateBerlin: "2026-11-08", surplusGwh: 0, absorbedGwh: 0, netImportGwh: null, socEndFraction: 0.1, socMaxFraction: 0.1, fullQuarters: 0 },
  ];
  const factor = {
    absorbedGwh: 8,
    absorbedShare: 0.28,
    dischargedGwh: 6,
    dischargedDuringImportGwh: 0,
    eveningPeakBeforeGw: 58,
    eveningPeakAfterGw: 58,
    endSocDeltaGwh: 0,
    startSocGwh: 0.8,
    endSocGwh: 0.8,
    saturated: false,
    eurModelX1: null,
    zeroReason: null,
    dayRows,
    quarterPoints: [],
    socSeries: [],
  };
  return {
    bounds: { blick: "30tage", startKey: "2026-10-10", endKey: "2026-11-08", labelDe: "30 Tage" },
    observed: {
      surplusGwh: 61.1,
      surplusDays: 1,
      dayCount: 30,
      importGwh: null,
      exportGwh: null,
      netImportGwh: null,
      peakSurplusMw: null,
      peakSurplusIso: null,
      missingQuarters: 0,
      totalQuarters: 96,
      lastSurplusDateBerlin: "2026-10-24",
      openDay: false,
    },
    factors: { 1: factor, 2: { ...factor, absorbedShare: 0.4 }, 5: { ...factor, absorbedShare: 0.7 }, 10: { ...factor, absorbedShare: 0.9 } },
  } as OverviewEvaluation;
}

describe("SystemChapter chart", () => {
  it("draws one bar per day from the existing rows and no euro amount", () => {
    render(<SystemChapter model={model()} fleetPowerGw={4.64} fleetEnergyGwh={8.14} />);
    const chart = screen.getByRole("img", { name: /Überschuss je Tag/ });
    expect(chart.querySelectorAll(".v4-system-chart-surplus")).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/€/);
    expect(document.querySelector(".v4-system-strip")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "×5" }));
    expect(screen.getByRole("img", { name: /×5/ })).toBeInTheDocument();
  });
});
