"use client";

import { GlossaryTip } from "@/components/GlossaryTip";
import type { AppLanguage } from "@/components/language-context";
import snapshot from "@/data/fleet-snapshot.json";
import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { formatQuantity } from "@/lib/formatQuantity";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import { MORE_STORAGE_DISCHARGE_HOUR } from "@/lib/moreStorage";
import { VOLTAGE_BAND } from "@/lib/netzDemo";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";

type Row = {
  assumption: string;
  value: string;
  unit: string;
  why: string;
  uncertainty: string;
};

type SourceLink = { href: string; text: string };

type SourceRow = {
  name: string;
  use: string;
  licence: string;
  credit: string;
  links: SourceLink[];
  retrieved: string;
};

function FitTable({
  className,
  caption,
  headers,
  cols,
  rows,
}: {
  className: string;
  caption: string;
  headers: string[];
  cols?: string[];
  rows: string[][];
}) {
  return (
    <table className={`methodik-fit ${className}`}>
      <caption className="sr-only">{caption}</caption>
      {cols ? (
        <colgroup>
          {cols.map((col) => (
            <col key={col} className={col} />
          ))}
        </colgroup>
      ) : null}
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) =>
              index === 0 ? (
                <th key={cell} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={`${row[0]}-${index}`} data-label={headers[index]}>
                  {cell}
                </td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type MethodikFleetStand = {
  powerGw: number;
  energyGwh: number;
  standLabel: { de: string; en: string };
};

export function MethodikUeberblick({
  language,
  fleet,
}: {
  language: AppLanguage;
  fleet?: MethodikFleetStand | null;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const pct = (value: number) => formatQuantity(value * 100, language, 0);
  const rte = pct(ROUND_TRIP_EFFICIENCY);
  const soc = `${pct(CHAIN_SOC_MIN)}–${pct(CHAIN_SOC_MAX)}`;
  const band = `${formatQuantity(VOLTAGE_BAND.min, language, 3)}–${formatQuantity(VOLTAGE_BAND.max, language, 3)}`;
  const powerGw = fleet?.powerGw ?? snapshot.powerGw;
  const energyGwh = fleet?.energyGwh ?? snapshot.energyGwh;
  const standLabel =
    fleet !== undefined && fleet !== null
      ? language === "de"
        ? fleet.standLabel.de
        : fleet.standLabel.en
      : snapshot.standLabel;
  const power = formatQuantity(powerGw, language, 1);
  const energy = formatQuantity(energyGwh, language, 1);
  const powerExact = formatQuantity(powerGw, language, 2);
  const energyExact = formatQuantity(energyGwh, language, 2);
  const steps = LIVE_DISPATCH_FACTORS.map((factor) => `×${factor}`).join(", ");
  const peak = Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100);
  const share = Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100);
  const hour = String(MORE_STORAGE_DISCHARGE_HOUR);

  const assumptions: Row[] = [
    {
      assumption: tx("Round-Trip-Wirkungsgrad", "Round-trip efficiency"),
      value: rte,
      unit: "%",
      why: tx(
        "Standard in allen Rechenkernen. Gemeint ist AC zu AC, einschließlich Wechselrichter, Trafo und Hilfsenergie.",
        "Default in every calculation core. That means AC to AC, including the inverter, the transformer and auxiliary energy."
      ),
      uncertainty: tx(
        "Planungsspanne 80–90 % (eigene Annahme). Quellen für AC-AC: PNNL 2022, 82,6–88 %, NLR ATB 2025, 85 %.",
        "Planning range 80–90% (our own assumption). AC-AC sources: PNNL 2022, 82.6–88%; NLR ATB 2025, 85%."
      ),
    },
    {
      assumption: tx("Nutzbarer Ladezustand", "Usable state of charge"),
      value: soc,
      unit: "%",
      why: tx(
        "Großspeicher-Modell und Beispieltage. Der Start der nationalen Reihe liegt bei 10 % der Nennenergie.",
        "Large-storage model and example days. The national series starts at 10% of nameplate."
      ),
      uncertainty: tx(
        "Die Größenformel am Standort nutzt 10–95 %. Das steht im Kapitel Speichergröße.",
        "The site sizing formula uses 10–95%. That is in the storage-size chapter."
      ),
    },
    {
      assumption: tx("Preisnehmer", "Price taker"),
      value: tx("keine Preiswirkung", "no price effect"),
      unit: "—",
      why: tx(
        "Das Modell nimmt die Preise, wie sie waren. Ein großer Speicher verändert sie darin nicht.",
        "The model takes the prices as they were. A large battery does not change them inside the model."
      ),
      uncertainty: tx(
        "Ab ×2 zeigt die Oberfläche keinen Euro-Erlös.",
        "From ×2 the UI shows no euro revenue."
      ),
    },
    {
      assumption: tx("Markt", "Market"),
      value: tx("nur Day-Ahead", "day-ahead only"),
      unit: "—",
      why: tx(
        "Preise sind die Day-Ahead-Auktion der Gebotszone DE-LU. Intraday und Regelleistung sind nicht drin.",
        "Prices are the day-ahead auction of the DE-LU bidding zone. Intraday and balancing power are not included."
      ),
      uncertainty: tx("Feste Modellgrenze.", "A fixed limit of the model."),
    },
    {
      assumption: tx("Laden und Entladen", "Charge and discharge"),
      value: tx(`Überschuss vor ${hour}:00, Abgabe ab ${hour}:00`, `surplus before ${hour}:00, discharge from ${hour}:00`),
      unit: tx("Uhr", "clock"),
      why: tx(
        "Das Großspeicher-Modell lädt nur, solange Wind plus Sonne über der Last liegt, und nur vor dieser Stunde. Ab dann gibt es auf die Abendspitze ab.",
        "The large-storage model charges only while wind plus solar exceeds load, and only before this hour. From then it discharges onto the evening peak."
      ),
      uncertainty: tx(
        "Gilt für die nationale Flotte. Der Arbitrage-Kern der Beispieltage wählt Viertelstunden nach einem Punktwert.",
        "This is the national fleet. The example-day arbitrage core picks quarter-hours by a score."
      ),
    },
    {
      assumption: tx("Flotte", "Fleet"),
      value: `${power} / ${energy}`,
      unit: "GW / GWh",
      why: tx(
        `Live: Battery Charts (battery-charts.de), ${powerExact} GW / ${energyExact} GWh, Stand ${standLabel}. Fallback im Code: Snapshot ${formatQuantity(snapshot.powerGw, language, 2)} GW / ${formatQuantity(snapshot.energyGwh, language, 2)} GWh (${snapshot.standLabel}), wenn die Live-Quelle nicht antwortet.`,
        `Live: Battery Charts (battery-charts.de), ${powerExact} GW / ${energyExact} GWh, as of ${standLabel}. Code fallback: snapshot ${formatQuantity(snapshot.powerGw, language, 2)} GW / ${formatQuantity(snapshot.energyGwh, language, 2)} GWh (${snapshot.standLabel}) when the live source does not respond.`
      ),
      uncertainty: tx("Der Bestand ändert sich mit dem Register.", "The stock changes with the register."),
    },
    {
      assumption: tx("Stufen", "Steps"),
      value: steps,
      unit: "—",
      why: tx(
        "Leistung und Energie skalieren gemeinsam. ×1 ist der registrierte Bestand. Die Abendspitze ändert sich mit dem Faktor, aber nicht linear: Ist der Überschuss aufgebraucht, sinkt sie nicht weiter (25.10.: ab ×2 bei 5,0 GW).",
        "Power and energy scale together. ×1 is the registered stock. The evening peak changes with the factor, but not linearly: once surplus is used up, it stops falling (25 Oct: from ×2 at 5.0 GW)."
      ),
      uncertainty: tx(
        "Euro nur bei ×1 in den Beispieltagen; /live ohne Euro.",
        "Euro only at ×1 in the example days; /live without euro."
      ),
    },
    {
      assumption: tx("Netz-Demo", "Grid demo"),
      value: tx("Testnetz", "test grid"),
      unit: "—",
      why: tx(
        "Öffentliches Mittelspannungs-Testnetz SimBench 1-MV-semiurb--0-no_sw. Kein reales Netz.",
        "Public medium-voltage test grid SimBench 1-MV-semiurb--0-no_sw. Not a real grid."
      ),
      uncertainty: tx("Keine Anschlusszusage.", "Not a connection offer."),
    },
    {
      assumption: tx("Spannungsband", "Voltage band"),
      value: band,
      unit: "p.u.",
      why: tx(
        "Normalbetrieb der Mittelspannung im Testnetz. Quelle: Meinecke et al., CIRED 2019, Paper 0139, Abbildung 2 und Text (Sollwerte 1,015 / 1,035 p.u., 2 % Anhebung, 5 % zusätzlicher Abfall im Einzelausfall). Die Grenzen sind aus der Abbildung abgelesen.",
        "Normal operation of medium voltage in the test grid. Source: Meinecke et al., CIRED 2019, paper 0139, figure 2 and the text (setpoints 1.015 / 1.035 p.u., 2% rise, 5% extra drop in a single outage). The limits were read from the figure."
      ),
      uncertainty: tx(
        "Im Einzelausfall gilt 0,915–1,055 p.u.",
        "For a single outage the band is 0.915–1.055 p.u."
      ),
    },
    {
      assumption: tx("(n-1)", "(n-1)"),
      value: tx("Differenz", "difference"),
      unit: "—",
      why: tx(
        "Die Seite zeigt den Unterschied zum Fall ohne Speicher. Geschaltet wird höchstens eine Trennstelle, und danach höchstens eine Leitung in der Schleife.",
        "The page shows the difference from the case without storage. At most one tie switch is closed, and then at most one line in the loop is opened."
      ),
      uncertainty: tx("Vereinfachte Schaltstufe, kein vollständiges Schaltprogramm.", "A simplified switching step, not a full switching programme."),
    },
    {
      assumption: tx("Kurzschluss", "Short circuit"),
      value: tx("nicht gerechnet", "not calculated"),
      unit: "—",
      why: tx(
        "Im Testnetz fehlen die Kurzschlussleistung des vorgelagerten Netzes, die Faktoren der Einspeiser und die Nullsystemdaten.",
        "The test grid lacks the short-circuit power of the upstream grid, the infeed factors and the zero-sequence data."
      ),
      uncertainty: tx("Es gibt keinen Kurzschlussstrom.", "No short-circuit current is given."),
    },
  ];

  const sources: SourceRow[] = [
    {
      name: "Energy-Charts",
      use: tx(
        "Erzeugung, Last und Residuallast. Keine Bilder, nur Daten.",
        "Generation, load and residual load. No pictures, only data."
      ),
      licence: "CC BY 4.0",
      credit: "energy-charts.info",
      links: [
        { href: "https://api.energy-charts.info/", text: "Data License" },
        { href: "https://api.energy-charts.info/llms.txt", text: "llms.txt" },
      ],
      retrieved: tx(
        "28.10.2026. Lizenzfeld der API-Antwort: „CC BY 4.0 (creativecommons.org/licenses/by/4.0), attribution: energy-charts.info“. Betreiber: Fraunhofer ISE.",
        "28 October 2026. Licence field of the API response: “CC BY 4.0 (creativecommons.org/licenses/by/4.0), attribution: energy-charts.info”. Operator: Fraunhofer ISE."
      ),
    },
    {
      name: "SMARD",
      use: tx(
        "Day-Ahead-Preise der Gebotszone DE-LU, abgerufen über Energy-Charts. Preise unverändert übernommen. Erlöse daraus sind eine eigene Modellrechnung.",
        "Day-ahead prices of the DE-LU bidding zone, retrieved via Energy-Charts. Prices are used unchanged. Revenue figures derived from them are our own model calculation."
      ),
      licence: "CC BY 4.0",
      credit: "Bundesnetzagentur | SMARD.de",
      links: [{ href: "https://www.smard.de/home/datennutzung", text: tx("Datennutzung", "Data use") }],
      retrieved: tx("28.10.2026.", "28 October 2026."),
    },
    {
      name: tx("Marktstammdatenregister", "Marktstammdatenregister"),
      use: tx(
        "Öffentliche Registerdaten der Speicher. Die Flottengröße kommt über Battery Charts, die Eckdaten von Bollingstedt aus den SEE-Nummern.",
        "Public register data for storage. Fleet size comes via Battery Charts. Bollingstedt’s key figures come from the SEE numbers."
      ),
      licence: tx(
        "Datenlizenz Deutschland – Namensnennung – Version 2.0",
        "Data licence Germany – attribution – Version 2.0"
      ),
      credit: tx(
        "Bundesnetzagentur, Marktstammdatenregister, „Datenlizenz Deutschland – Namensnennung – Version 2.0“ (dl-de/by-2-0, www.govdata.de/dl-de/by-2-0), Datensatz: https://www.marktstammdatenregister.de/MaStR/Datendownload. Daten verändert: ausgewertet und summiert (Flotte über Battery Charts, ISEA/PGS RWTH Aachen).",
        "Bundesnetzagentur, Marktstammdatenregister, “Data licence Germany – attribution – Version 2.0” (dl-de/by-2-0, www.govdata.de/dl-de/by-2-0), dataset: https://www.marktstammdatenregister.de/MaStR/Datendownload. Data changed: evaluated and summed (fleet via Battery Charts, ISEA/PGS RWTH Aachen)."
      ),
      links: [
        { href: "https://www.marktstammdatenregister.de/MaStR/Datendownload", text: tx("Datendownload", "Data download") },
        { href: "https://www.marktstammdatenregister.de/MaStR/Startseite/Impressum", text: tx("Impressum", "Legal notice") },
      ],
      retrieved: tx(
        "28.10.2026. Gesamtdatenauszug auf der Download-Seite zuletzt 28.10.2026. Die Flottenzahl auf dieser Seite ist der Battery-Charts-Stand 21.10.2026, nicht dieser Auszug.",
        "28 October 2026. The full export on the download page was last updated on 28 October 2026. The fleet figure on this page is the Battery Charts stand of 21 October 2026, not this export."
      ),
    },
    {
      name: "Battery Charts",
      use: tx(
        "Ausgewertete Großspeicher-Leistung und -Energie aus dem Register. Stand in der Flottenzeile.",
        "Evaluated large-storage power and energy from the register. The date is in the fleet row."
      ),
      licence: "CC BY 4.0",
      credit: tx(
        "Auf der Seite „Über uns“ steht: „Die Grafiken und Daten dieser Seite sind lizensiert unter CC BY 4.0 und dürfen unter Nennung der Urheber und Lizenz verwendet werden.“ (Der Satz steht im Abschnitt Revenue-Index; wir lesen ihn auch für Battery Charts. Das ist unsere Auslegung.) Zitierwunsch der Seite: battery-charts.de/battery-charts und J. Figgener et al., The development of battery storage systems in Germany: A market review (status 2023), 2023, DOI 10.48550/arXiv.2203.06762.",
        "The About page says: “The graphics and data on this page are licensed under CC BY 4.0 and may be used if the authors and the licence are named.” (The sentence is in the Revenue Index section; we also read it as covering Battery Charts. That is our reading.) The page asks to cite battery-charts.de/battery-charts and J. Figgener et al., The development of battery storage systems in Germany: A market review (status 2023), 2023, DOI 10.48550/arXiv.2203.06762."
      ),
      links: [{ href: "https://battery-charts.de/de/ueber-uns/", text: tx("Über uns", "About") }],
      retrieved: tx("28.10.2026.", "28 October 2026."),
    },
    {
      name: "SimBench",
      use: tx(
        "Testnetz 1-MV-semiurb--0-no_sw für die Netz-Demo.",
        "Test grid 1-MV-semiurb--0-no_sw for the grid demo."
      ),
      licence: "ODbL 1.0 + DbCL 1.0",
      credit: tx(
        "„The database called SimBench is made available under the Open Database License: http://opendatacommons.org/licenses/odbl/1.0/. Any rights in individual contents of the database are licensed under the Database Contents License: http://opendatacommons.org/licenses/dbcl/1.0/“ University of Kassel, TU Dortmund, RWTH Aachen University and Fraunhofer Institute for Energy Economics and Energy System Technology (IEE).",
        "“The database called SimBench is made available under the Open Database License: http://opendatacommons.org/licenses/odbl/1.0/. Any rights in individual contents of the database are licensed under the Database Contents License: http://opendatacommons.org/licenses/dbcl/1.0/” University of Kassel, TU Dortmund, RWTH Aachen University and Fraunhofer Institute for Energy Economics and Energy System Technology (IEE)."
      ),
      links: [{ href: "https://simbench.readthedocs.io/en/stable/about/license.html", text: tx("Lizenz", "Licence") }],
      retrieved: tx("28.10.2026.", "28 October 2026."),
    },
    {
      name: "simbench",
      use: tx(
        "Python-Paket simbench 1.6.3, aus scripts/requirements-netz.txt. Es liefert das Testnetz an das Erzeugungsskript.",
        "Python package simbench 1.6.3, from scripts/requirements-netz.txt. It supplies the test grid to the generation script."
      ),
      licence: "BSD-3-Clause",
      credit: "Copyright 2019-2026 University of Kassel, TU Dortmund, RWTH Aachen University, Fraunhofer IEE und weitere",
      links: [{ href: "https://simbench.readthedocs.io/en/stable/about/license.html", text: tx("Lizenz", "Licence") }],
      retrieved: tx("28.10.2026.", "28 October 2026."),
    },
    {
      name: "pandapower",
      use: tx(
        "Lastfluss für die vorab gerechnete Netz-Demo. Die Seite rechnet ihn nicht im Browser.",
        "Load flow for the precalculated grid demo. The page does not run it in the browser."
      ),
      licence: "BSD-3-Clause",
      credit:
        "Copyright (c) 2016-2026 University of Kassel, Fraunhofer Institute for Energy Economics and Energy System Technology (IEE) Kassel and individual contributors.",
      links: [{ href: "https://pandapower.readthedocs.io/en/stable/about/license.html", text: tx("Lizenz", "Licence") }],
      retrieved: tx("28.10.2026.", "28 October 2026."),
    },
  ];

  const headers = [
    tx("Annahme", "Assumption"),
    tx("Wert", "Value"),
    tx("Einheit", "Unit"),
    tx("Warum", "Why"),
    tx("Unsicherheit", "Uncertainty"),
  ];
  const sourceHeaders = [
    tx("Name", "Name"),
    tx("Was wir nutzen", "What we use"),
    tx("Lizenz", "Licence"),
    tx("Namensnennung", "Attribution"),
    tx("Link", "Link"),
    tx("Lizenz geprüft", "Licence checked"),
  ];

  return (
    <>
      <section id="annahmen">
        <h2>{tx("01 Annahmen auf einen Blick", "01 Assumptions at a glance")}</h2>
        <p>
          {tx(
            "Fachleute sehen hier in kurzer Zeit, was das Modell annimmt. Die Formeln in den Kapiteln darunter rechnen damit. Der Großspeicher ",
            "Specialists can see here, in a short time, what the model assumes. The formulas in the chapters below use these values. Large storage "
          )}
          <GlossaryTip id="grossspeicher" language={language} />
          {tx(" ist ein Preisnehmer ", " is a price taker ")}
          <GlossaryTip id="preisnehmer" language={language} />
          {tx(". Gerechnet wird nur Day-Ahead ", ". The calculation uses only day-ahead ")}
          <GlossaryTip id="day-ahead" language={language} />
          {tx(". Der Ladezustand ", ". The state of charge ")}
          <GlossaryTip id="ladezustand" language={language} />
          {tx(" bleibt im genannten Fenster. Die Netz-Demo liegt in einem Testnetz ", " stays inside the stated window. The grid demo sits in a test grid ")}
          <GlossaryTip id="testnetz" language={language} />
          .
        </p>
        <FitTable
          className="methodik-assumptions"
          caption={tx("Annahmen auf einen Blick", "Assumptions at a glance")}
          headers={headers}
          cols={["c-assumption", "c-value", "c-unit", "c-why", "c-uncertainty"]}
          rows={assumptions.map((row) => [row.assumption, row.value, row.unit, row.why, row.uncertainty])}
        />
      </section>
      <section id="lizenzen">
        <h2>{tx("02 Quellen und Lizenzen", "02 Sources and licences")}</h2>
        <p>
          {tx(
            "Keine Energy-Charts-Bilder sind eingebettet. Wir nutzen nur Daten. Die Namensnennung steht so, wie die Quelle sie verlangt oder in ihrer Lizenz vorgibt. Die Lizenztexte wurden am 28.10.2026 geprüft.",
            "No Energy-Charts pictures are embedded. We use only data. The attribution is the way the source requests it or its licence prescribes. Licence texts checked on 28 October 2026."
          )}
        </p>
        <table className="methodik-fit methodik-sources">
          <caption className="sr-only">{tx("Quellen und Lizenzen", "Sources and licences")}</caption>
          <colgroup>
            <col className="c-name" />
          </colgroup>
          <thead>
            <tr>
              {sourceHeaders.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td data-label={sourceHeaders[1]}>{row.use}</td>
                <td data-label={sourceHeaders[2]}>{row.licence}</td>
                <td data-label={sourceHeaders[3]}>{row.credit}</td>
                <td data-label={sourceHeaders[4]}>
                  {row.links.map((link, linkIndex) => (
                    <span key={link.href}>
                      {linkIndex > 0 ? " · " : null}
                      <a href={link.href}>{link.text}</a>
                    </span>
                  ))}
                </td>
                <td data-label={sourceHeaders[5]}>{row.retrieved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="grenzen">
        <h2>{tx("03 Grenzen des Modells", "03 Limits of the model")}</h2>
        <p>
          {tx(
            "Das Modell endet hier. Was darunter nicht steht, ist nicht gerechnet.",
            "The model ends here. What is not listed below is not calculated."
          )}
        </p>
        <ul>
          <li>
            {tx(
              "Die Daten sind öffentlich. Das ist kein Modell eines Netzbetreibers und kein Abbild eines einzelnen Netzes.",
              "The data are public. This is not a grid operator’s model and not a picture of one real grid."
            )}
          </li>
          <li>
            {tx("Nur Day-Ahead ", "Day-ahead only ")}
            <GlossaryTip id="day-ahead" language={language} />
            {tx(". Keine Regelleistung ", ". No balancing power ")}
            <GlossaryTip id="regelleistung" language={language} />
            {tx(" und kein Intraday ", " and no intraday ")}
            <GlossaryTip id="intraday" language={language} />
            .
          </li>
          <li>
            {tx("Das Modell ist ein Preisnehmer ", "The model is a price taker ")}
            <GlossaryTip id="preisnehmer" language={language} />
            {tx(
              ". Ab ×2 zeigt die Seite deshalb keinen skalierten Euro-Erlös.",
              ". From ×2 the page therefore shows no scaled euro revenue."
            )}
          </li>
          <li>
            {tx("Euro-Werte sind eine Modellschätzung ", "Euro figures are a model estimate ")}
            <GlossaryTip id="modellschaetzung" language={language} />
            {tx(". Sie sind keine Prognose und kein Angebot.", ". They are not a forecast and not a quote.")}
          </li>
          <li>
            {tx("Die Netz-Demo ist ein öffentliches Testnetz ", "The grid demo is a public test grid ")}
            <GlossaryTip id="testnetz" language={language} />
            {tx(
              ". Kein reales Netz und keine Anschlusszusage.",
              ". Not a real grid and not a connection offer."
            )}
          </li>
          <li>
            {tx(
              "Kurzschluss ist nicht gerechnet. Es gibt keinen Kurzschlussstrom.",
              "Short circuit is not calculated. No short-circuit current is given."
            )}
          </li>
          <li>
            {tx("(n-1) ", "(n-1) ")}
            <GlossaryTip id="n-1" language={language} />
            {tx(
              " ist vereinfacht: eine Schaltstufe. Die Seite zeigt die Differenz zum Fall ohne Speicher.",
              " is simplified: one switching step. The page shows the difference from the case without storage."
            )}
          </li>
          <li>
            {tx(
              `Die Marke „netzdienlich“ ist eine Schätzung. Regel v1: mindestens ${share} % der Entladung liegen in Intervallen mit mindestens ${peak} % Anschlussauslastung. Laden erzeugt keine neue Spitze.`,
              `The “grid-supportive” badge is an estimate. Rule v1: at least ${share}% of discharge sits in intervals with at least ${peak}% connection use. Charging does not create a new peak.`
            )}
          </li>
          <li>
            {tx("Das Spannungsband der Netz-Demo steht in p.u. ", "The grid demo’s voltage band is in p.u. ")}
            <GlossaryTip id="spannung-pu" language={language} />
            {tx(
              ". Leitungen und Transformatoren dürfen 100 % erreichen.",
              ". Lines and transformers may reach 100%."
            )}{" "}
            <GlossaryTip id="auslastung" language={language} />
          </li>
          <li>
            {tx(
              "Der Standortrechner ersetzt keine Netzauskunft und kein Anschlussbegehren beim Netzbetreiber. Wer prüfen will, kann Szenarien rechnen. Die Seite gibt keine Zusage.",
              "The site calculator does not replace a grid information request or a connection application to the grid operator. Anyone who wants to check a case can run scenarios. The page makes no commitment."
            )}
          </li>
        </ul>
      </section>
    </>
  );
}
