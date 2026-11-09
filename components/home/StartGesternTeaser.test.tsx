import { render, screen } from "@testing-library/react";

import { StartGesternTeaser } from "@/components/home/StartGesternTeaser";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";

const panel: HomeDayPanelData = {
  dateKey: "2026-11-08",
  sourceLabel: "Energy-Charts",
  fetchStand: "19:56",
  referenceComplete: true,
  quarterCount: 96,
  expectedQuarters: 96,
  observed: {
    loadGwh: 1275.1,
    generationGwh: 1417.5,
    generationStatus: "ok",
    generationDetailDe: "vollständig",
    windSolarGwh: 184.9,
    surplusGwh: 0,
    surplusQuarters: 0,
  },
  model: {
    available: true,
    unavailableReasonDe: null,
    powerGw: 4.64,
    energyGwh: 8.14,
    factor: 1,
    chargedGwh: 0,
    dischargedGwh: 0,
    simulationRunLabelDe: "Kette",
    evaluationWindowLabelDe: null,
    fleetStandLabelDe: "9. November 2026",
    disclosureDe: "Hypothetisches ×1-Modell, Round-Trip 85 %, SoC 10–90 %, nur Day-Ahead.",
  },
};

const record = {
  dateKey: "2026-11-08",
  surplusGwh: 0,
} as TagesKennzahlRecord;

describe("StartGesternTeaser", () => {
  it("puts core figures above the footnotes and keeps the formula out of the figure row", () => {
    render(
      <StartGesternTeaser
        kopfDayKey="2026-11-08"
        record={record}
        day={null}
        panel={panel}
        records={[record]}
      />
    );

    const figures = screen.getByTestId("start-day-panel");
    const footnotes = screen.getByTestId("start-day-footnotes");
    expect(figures.compareDocumentPosition(footnotes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(figures.textContent).toMatch(/1\.275,1/);
    expect(figures.textContent).toMatch(/1\.417,5/);
    expect(figures.textContent).not.toMatch(/Σ max/);
    expect(figures.textContent).not.toMatch(/Referenzflotte/);
    expect(footnotes.textContent).toMatch(/Σ max\(0, Wind\+Sonne−Last\)/);
    expect(footnotes.textContent).toMatch(/Energy-Charts/);
    expect(footnotes.textContent).toMatch(/Referenzflotte/);
    expect(footnotes.textContent).toMatch(/Geladen/);
    expect(footnotes.textContent).toMatch(/Annahmen und Zeiträume/);
    expect(document.body.textContent).not.toMatch(/€/);
    expect(document.querySelector(".v4-tag-kern")).toBeNull();
  });
});
