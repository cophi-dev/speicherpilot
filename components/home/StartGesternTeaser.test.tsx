import { render, screen } from "@testing-library/react";

import { StartAnmerkungen } from "@/components/home/StartAnmerkungen";
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
  it("shows core figures and the chart chapter without the formula block", () => {
    render(<StartGesternTeaser kopfDayKey="2026-11-08" record={record} day={null} panel={panel} />);

    const figures = screen.getByTestId("start-day-panel");
    expect(figures.textContent).toMatch(/1\.275,1/);
    expect(figures.textContent).toMatch(/1\.417,5/);
    expect(document.body.textContent).not.toMatch(/Σ max/);
    expect(document.body.textContent).not.toMatch(/Referenzflotte/);
    expect(document.body.textContent).not.toMatch(/Annahmen und Zeiträume/);
    expect(screen.queryByTestId("start-day-footnotes")).toBeNull();
    expect(figures.querySelector('a[href="#anm-3"]')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/€/);
  });
});

describe("StartAnmerkungen", () => {
  it("keeps formula, source, model and assumptions as numbered notes", () => {
    render(
      <StartAnmerkungen
        kopfDayKey="2026-11-08"
        kopfFootnote="Gestern (08.11.2026) ohne Überschuss zum Laden aus Wind und Sonne."
        panel={panel}
        surplusLine="Unter 0,05 GWh Tages-Überschuss."
        lastLine="Zuletzt: So, 25.10. war Strom übrig."
        system={{ totalSurplusGwh: 115.6, x1AbsorbedGwh: 32.6, x1SharePct: 28 }}
      />
    );

    const notes = screen.getByTestId("start-day-footnotes");
    expect([...notes.querySelectorAll("li")].map((li) => li.id)).toEqual(["anm-1", "anm-2", "anm-3", "anm-4"]);
    expect(notes.textContent).toMatch(/Σ max\(0, Wind\+Sonne−Last\)×¼h/);
    expect(screen.getByTestId("start-day-meta").textContent).toMatch(/Energy-Charts · 19:56/);
    expect(screen.getByTestId("start-day-model-fleet").textContent).toMatch(/Referenzflotte 4,64 GW \/ 8,14 GWh/);
    expect(notes.textContent).toMatch(/Geladen 0,0 GWh, abgegeben 0,0 GWh/);
    expect(notes.textContent).toMatch(/Annahmen und Zeiträume: Hypothetisches ×1-Modell/);
    expect(notes.textContent).toMatch(/Lokale Netzwirkung: nicht bewertet/);
    expect(notes.textContent).toMatch(/32,6 GWh geladen \(28/);
    expect(notes.querySelector('a[href="/methodik"]')).not.toBeNull();
    expect(notes.textContent).not.toMatch(/€/);
  });
});
