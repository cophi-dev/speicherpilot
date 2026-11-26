import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";

import { TagPageV4 } from "@/components/home/AuffaelligkeitKopf";
import { StartKarteSektion } from "@/components/home/StartKarteSektion";
import type { AuffaelligkeitResult, TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { loadStartKartePreviewData } from "@/lib/bessKarte3d/loadSummary.server";
import type { MarktInsight } from "@/lib/marktInsights";
import type { NationalFleetRunSeries } from "@/lib/nationalMonthFleetModel";
import { buildStartHeroV2 } from "@/lib/startHeroV2";
import type { ResidualDay } from "@/lib/windSolarResidual";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

beforeAll(() => {
  window.matchMedia = (media: string) =>
    ({
      matches: false,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

function makeRecord(dateKey: string, dryStreak: number): TagesKennzahlRecord {
  return {
    dateKey,
    surplusGwh: 0,
    surplusH: 0,
    spread: 115,
    pmin: 120,
    pminAt: "03:00",
    pmax: 235,
    pmaxAt: "17:45",
    negH: 0,
    eveningPeakGw: 58.2,
    eveningPeakAt: "17:30",
    peakCutGw: 0,
    absorbedGwh: 0,
    fullAt: null,
    fullMin: null,
    wsShare: 21.4,
    dryStreak,
  };
}

function makeDay(dateBerlin: string): ResidualDay {
  return {
    dateBerlin,
    slots: Array.from({ length: 96 }, (_, i) => ({
      isoBerlin: `${dateBerlin}T${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}:00+01:00`,
      hourBerlin: Math.floor(i / 4),
      minuteBerlin: (i % 4) * 15,
      loadMw: 55_000,
      windMw: 10_000,
      solarMw: i >= 36 && i <= 60 ? 8_000 : 0,
    })),
  };
}

const sampleInsights: MarktInsight[] = [
  {
    id: "trockenstrecke",
    category: "tag",
    text: "25.11. ist der 31. Tag in Folge ohne messbaren Überschuss (unter 0,05\u00a0GWh).",
    period: "10.10.–25.11.",
    source: "Energy-Charts Last/Erzeugung, Viertelstunde DE",
    methodikHref: "/methodik#insight-trockenstrecke",
  },
  {
    id: "preis_regime",
    category: "markt",
    text: "Vom 1.11. bis 10.11., 10 Tage, lag jedes Tagesminimum über 150\u00a0€/MWh.",
    period: "1.11.–10.11.",
    source: "Bundesnetzagentur | SMARD.de, Day-Ahead DE-LU",
    methodikHref: "/methodik#insight-preis-regime",
  },
];

const sampleResult: AuffaelligkeitResult = {
  kind: "metric",
  key: "evening_peak_gw",
  headline: "Mi, 25.11.: Am Abend mussten andere Quellen bis zu 58,2 GW decken (17:30 Uhr).",
  subline:
    "Im Überschuss-Modell (Laden nur bei Wind+Sonne über Verbrauch) war an diesem Tag nichts zu speichern. Spitze- und Markt-Fahrweisen rechnen weiter unten im Tageshorizont (Kapitel 03).",
  kopfH1: "Am Abend mussten andere Quellen besonders viel decken.",
  kopfSubline:
    "So hoch wie an keinem Tag der letzten 30. Im Überschuss-Modell (Laden nur bei Wind+Sonne über Verbrauch) war an diesem Tag nichts zu speichern. Spitze- und Markt-Fahrweisen rechnen weiter unten im Tageshorizont (Kapitel 03).",
};

describe("StartKarteSektion", () => {
  it("rendert dynamische Zahlen aus loadStartKartePreviewData, CTA und BKG-Zeile", () => {
    const data = loadStartKartePreviewData();
    render(<StartKarteSektion data={data} />);

    expect(screen.getByTestId("start-karte-sektion")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Wo stehen die \d+,\d{2}\sGW Großspeicher\?/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Speicher an \d+ Lokationen, MaStR-Stand \d{2}\.\d{2}\.\d{4}\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Standorten/)).toBeNull();
    expect(
      screen.getByText(
        /Wo 2025 am meisten EE-Strom abgeregelt wurde, stehen nicht automatisch die meisten Speicher\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Karte" })).toHaveAttribute("href", "/netzbetreiber");
    const mapLink = screen.getByRole("link", { name: /an \d+ Lokationen in Deutschland.*Zur Karte\.$/ });
    expect(mapLink).toHaveAttribute("href", "/netzbetreiber");
    expect(mapLink.querySelector("svg")).not.toBeNull();
    expect(mapLink.textContent).toMatch(/Hamburg/);
    expect(mapLink.textContent).toMatch(/Berlin/);
    expect(mapLink.textContent).toMatch(/München/);
    expect(mapLink.textContent).not.toMatch(/Köln/);
    expect(mapLink.textContent).not.toMatch(/Frankfurt/);
    expect(screen.getAllByText(/Ländergrenzen:/).length).toBeGreaterThanOrEqual(1);
  });
});

describe("TagPageV4: `/` (isStartSurface) vs `/tag/<datum>`", () => {
  const dayKey = "2026-11-25";
  const records = [makeRecord("2026-11-24", 30), makeRecord(dayKey, 31)];
  const day = makeDay(dayKey);
  const startKarte = loadStartKartePreviewData();

  it("rendert auf `/` Hero v2 → Tagesgraph (#tagesverlauf) → Karte → Linkzeile → Quellen-Fußnote", () => {
    const fixtureBase = join(process.cwd(), "data/national-fleet/2026-11/days/2026-11-25");
    const startHero = buildStartHeroV2({
      dayKey,
      spitzeRun: JSON.parse(
        readFileSync(join(fixtureBase, "x2_min_peak_perfect_foresight.json"), "utf8"),
      ) as NationalFleetRunSeries,
      ueberschussRun: JSON.parse(
        readFileSync(join(fixtureBase, "x2_surplus_wind_solar_over_load.json"), "utf8"),
      ) as NationalFleetRunSeries,
      marktRun: JSON.parse(
        readFileSync(join(fixtureBase, "x2_price_oriented_da_arbitrage.json"), "utf8"),
      ) as NationalFleetRunSeries,
    });

    const { container } = render(
      <TagPageV4
        dayKey={dayKey}
        todayKey="2026-11-26"
        lastCompleteDayKey={dayKey}
        dataStand="06:00"
        result={sampleResult}
        records={records}
        day={day}
        lastSurplusKey="2026-10-24"
        dayOverview={null}
        fleetPowerGw={4.64}
        fleetEnergyGwh={8.15}
        marktInsights={sampleInsights}
        startHero={startHero}
        startKarte={startKarte}
        isStartSurface
      >
        <section data-testid="fleet-slot">Fleet Slot</section>
      </TagPageV4>,
    );

    const kopf = container.querySelector(".v4-kopf--start");
    const tagesverlauf = container.querySelector("#tagesverlauf");
    const karte = screen.getByTestId("start-karte-sektion");
    const linkzeile = screen.getByTestId("start-linkzeile");
    const fussnote = screen.getByTestId("start-quellen-fussnote");

    expect(kopf).toBeInTheDocument();
    expect(tagesverlauf).toBeInTheDocument();
    expect(kopf!.compareDocumentPosition(tagesverlauf!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tagesverlauf!.compareDocumentPosition(karte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(karte.compareDocumentPosition(linkzeile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(linkzeile.compareDocumentPosition(fussnote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Hero v2 Variante A: 2,9 GW, kein Euro, kein 31 Tage als große Zahl
    expect(kopf!.querySelector(".v4-leitfrage")?.textContent).toBe(
      "Was hätte mehr Speicher gestern geändert?",
    );
    expect(kopf!.querySelector(".v4-riesenzahl")?.textContent).toBe("2,9GW");
    expect(kopf!.textContent).toContain("Tagesspitze der Restlast gesenkt");
    expect(kopf!.textContent).toContain("54,4 auf 51,5\u00a0GW, Spitze um 15:45.");
    expect(kopf!.textContent).toContain("Die Abendspitze (ab 17\u00a0Uhr) sank um 2,4\u00a0GW.");
    expect(kopf!.textContent).toContain("Als messbarer Überschuss gilt 0,05");
    expect(kopf!.textContent).not.toContain("€");
    expect(kopf!.textContent).not.toContain("Kapitel 03");

    // Tagesgraph-Block auf `/` mit Datum im Titel
    expect(within(tagesverlauf as HTMLElement).getByText("01 · Der Tag")).toBeInTheDocument();
    expect(
      within(tagesverlauf as HTMLElement).getByRole("heading", {
        level: 2,
        name: "Was am 25.11.2026 im Stromnetz passiert ist",
      }),
    ).toBeInTheDocument();

    // Kein Insight-Block unter der Karte (wiederholt den Hero nicht)
    expect(screen.queryByTestId("markt-insights")).toBeNull();
    expect(container.textContent).not.toContain("Feste Schwellen");

    // Linkzeile ohne Zahlen
    expect(linkzeile.textContent).not.toMatch(/\d/);
    expect(within(linkzeile).getByRole("link", { name: "Ganzer Tag" })).toHaveAttribute(
      "href",
      `/tag/${dayKey}`,
    );
    expect(within(linkzeile).getByRole("link", { name: /Kompromiss/ })).toHaveAttribute(
      "href",
      "/kompromiss",
    );
    expect(within(linkzeile).getByRole("link", { name: "Knoten" })).toHaveAttribute("href", "/knoten");
    expect(within(linkzeile).getByRole("link", { name: "Methodik" })).toHaveAttribute(
      "href",
      "/methodik#insight-trockenstrecke",
    );

    // Einzige Quellen-Fußnote
    expect(fussnote.textContent).toContain("Energy-Charts / SMARD, CC BY 4.0");
    expect(within(fussnote).getByRole("link", { name: /Methodik/ })).toHaveAttribute(
      "href",
      "/methodik#quellen",
    );

    // Nicht-Start-Blöcke bleiben auf `/` draußen
    expect(screen.queryByTestId("fleet-slot")).toBeNull();
    expect(screen.queryByTestId("so-gerechnet")).toBeNull();
    expect(screen.queryByText(/nichts aus Überschuss/)).toBeNull();
    expect(screen.queryByText(/0\s*GWh geladen/)).toBeNull();
    expect(screen.queryByText(/Kompromiss selbst ausprobieren/)).toBeNull();
    expect(screen.queryByText(/Knoten selbst ansehen/)).toBeNull();
  });

  it("behält auf `/tag/<datum>` alle Blöcke und korrigiert die Kapitel-Nummerierung eindeutig", () => {
    const { container } = render(
      <TagPageV4
        dayKey={dayKey}
        todayKey="2026-11-26"
        lastCompleteDayKey={dayKey}
        dataStand="06:00"
        result={sampleResult}
        records={records}
        day={day}
        lastSurplusKey="2026-10-24"
        dayOverview={null}
        fleetPowerGw={4.64}
        fleetEnergyGwh={8.15}
        marktInsights={sampleInsights}
        startKarte={null}
        isStartSurface={false}
      >
        <section className="v4-chapter" data-testid="fleet-slot">
          <p className="v4-chapter-num num">03 · Tageshorizont</p>
        </section>
      </TagPageV4>,
    );

    expect(screen.queryByTestId("start-karte-sektion")).toBeNull();
    expect(screen.queryByTestId("start-linkzeile")).toBeNull();
    expect(screen.queryByTestId("start-quellen-fussnote")).toBeNull();

    expect(container.querySelector("#tagesverlauf")).toBeInTheDocument();
    expect(screen.getByTestId("fleet-slot")).toBeInTheDocument();
    expect(screen.getByTestId("so-gerechnet")).toBeInTheDocument();
    expect(screen.getByText(/Feste Schwellen, keine Laufzeit-KI/)).toBeInTheDocument();

    // Nummerierung eindeutig: 01 einmal, 02 einmal, 03 einmal, in Lesereihenfolge
    const num01 = screen.getAllByText("01 · Der Tag");
    const num02 = screen.getAllByText("02 · Das System");
    const num03 = screen.getAllByText("03 · Tageshorizont");
    expect(num01).toHaveLength(1);
    expect(num02).toHaveLength(1);
    expect(num03).toHaveLength(1);
    expect(num01[0]!.compareDocumentPosition(num02[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(num02[0]!.compareDocumentPosition(num03[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // So gerechnet wiederholt 01/02 nicht
    const soGerechnet = screen.getByTestId("so-gerechnet");
    expect(soGerechnet.textContent).not.toContain("01 · Der Tag");
    expect(soGerechnet.textContent).not.toContain("02 · Das System");
    expect(soGerechnet.textContent).toContain("Der Tag");
    expect(soGerechnet.textContent).toContain("Das System");
  });
});
