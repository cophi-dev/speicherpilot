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

type SourceRow = {
  name: string;
  use: string;
  licence: string;
  credit: string;
  href: string;
  link: string;
  retrieved: string;
};

function ScrollTable({
  label,
  hint,
  caption,
  headers,
  rows,
}: {
  label: string;
  hint: string;
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <>
      <div className="methodik-scroll" role="region" tabIndex={0} aria-label={label}>
        <table>
          <caption className="sr-only">{caption}</caption>
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
                    <td key={`${row[0]}-${index}`}>{cell}</td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="methodik-swipe">{hint}</p>
    </>
  );
}

export function MethodikUeberblick({ language }: { language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const pct = (value: number) => formatQuantity(value * 100, language, 0);
  const rte = pct(ROUND_TRIP_EFFICIENCY);
  const soc = `${pct(CHAIN_SOC_MIN)}–${pct(CHAIN_SOC_MAX)}`;
  const band = `${formatQuantity(VOLTAGE_BAND.min, language, 3)}–${formatQuantity(VOLTAGE_BAND.max, language, 3)}`;
  const power = formatQuantity(snapshot.powerGw, language, 1);
  const energy = formatQuantity(snapshot.energyGwh, language, 1);
  const powerExact = formatQuantity(snapshot.powerGw, language, 2);
  const energyExact = formatQuantity(snapshot.energyGwh, language, 2);
  const steps = LIVE_DISPATCH_FACTORS.map((factor) => `×${factor}`).join(", ");
  const peak = Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100);
  const share = Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100);
  const hour = String(MORE_STORAGE_DISCHARGE_HOUR);
  const hint = tx("← wischen →", "← swipe →");
  const tableLabel = tx("Tabelle, seitlich wischen", "Table, swipe sideways");

  const assumptions: Row[] = [
    {
      assumption: tx("Round-Trip-Wirkungsgrad", "Round-trip efficiency"),
      value: rte,
      unit: "%",
      why: tx(
        "Standard in allen Rechenkernen. Gemeint ist AC zu AC, einschließlich Wechselrichter, Trafo und Hilfsenergie.",
        "Default in every calculation core. That means AC to AC, including the inverter, the transformer and auxiliary energy."
      ),
      uncertainty: tx("Spanne 80–90 %.", "Range 80–90%."),
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
      uncertainty: tx("×5 und ×10 sind deshalb Obergrenzen.", "×5 and ×10 are therefore upper bounds."),
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
        `Battery Charts aus dem Marktstammdatenregister, Stand ${snapshot.standLabel}. Die Seite rundet ${powerExact} GW und ${energyExact} GWh.`,
        `Battery Charts from the Marktstammdatenregister, as of ${snapshot.standLabel}. The page rounds ${powerExact} GW and ${energyExact} GWh.`
      ),
      uncertainty: tx("Der Bestand ändert sich mit dem Register.", "The stock changes with the register."),
    },
    {
      assumption: tx("Stufen", "Steps"),
      value: steps,
      unit: "—",
      why: tx(
        "Leistung und Energie skalieren gemeinsam. ×1 ist der registrierte Bestand.",
        "Power and energy scale together. ×1 is the registered stock."
      ),
      uncertainty: tx(
        "×5 und ×10 ohne Preiswirkung sind Obergrenzen, keine Prognose.",
        "×5 and ×10 without a price effect are upper bounds, not a forecast."
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
        "Normalbetrieb der Mittelspannung im Testnetz. Quelle: SimBench und Meinecke et al., CIRED 2019.",
        "Normal operation of medium voltage in the test grid. Source: SimBench and Meinecke et al., CIRED 2019."
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
      href: "https://api.energy-charts.info/llms.txt",
      link: tx("API-Lizenz", "API licence"),
      retrieved: tx(
        "Abruf 28.10.2026. Lizenzfeld: „CC BY 4.0, attribution: energy-charts.info“. Betreiber: Fraunhofer ISE.",
        "Retrieved 28 October 2026. Licence field: “CC BY 4.0, attribution: energy-charts.info”. Operator: Fraunhofer ISE."
      ),
    },
    {
      name: "SMARD",
      use: tx(
        "Day-Ahead-Preise der Gebotszone DE-LU, abgerufen über Energy-Charts.",
        "Day-ahead prices of the DE-LU bidding zone, retrieved via Energy-Charts."
      ),
      licence: "CC BY 4.0",
      credit: "Bundesnetzagentur | SMARD.de",
      href: "https://www.smard.de/home/datennutzung",
      link: tx("Datennutzung", "Data use"),
      retrieved: tx("Abruf 28.10.2026.", "Retrieved 28 October 2026."),
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
        "Bundesnetzagentur, „Datenlizenz Deutschland – Namensnennung – Version 2.0“, www.govdata.de/dl-de/by-2-0, Datensatz marktstammdatenregister.de/MaStR",
        "Bundesnetzagentur, “Data licence Germany – attribution – Version 2.0”, www.govdata.de/dl-de/by-2-0, dataset marktstammdatenregister.de/MaStR"
      ),
      href: "https://www.marktstammdatenregister.de/MaStR/Startseite/Impressum",
      link: tx("Impressum", "Legal notice"),
      retrieved: tx(
        "Abruf 28.10.2026. Gesamtdatenauszug auf der Download-Seite zuletzt 28.10.2026.",
        "Retrieved 28 October 2026. The full export on the download page was last updated on 28 October 2026."
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
        "„Die Grafiken und Daten dieser Seite sind lizensiert unter CC BY 4.0 und dürfen unter Nennung der Urheber und Lizenz verwendet werden.“ Zitat der Seite: battery-charts.de und Figgener et al. 2023, DOI 10.48550/arXiv.2203.06762. ISEA und PGS, RWTH Aachen.",
        "“The graphics and data on this page are licensed under CC BY 4.0 and may be used if the authors and the licence are named.” The page asks for battery-charts.de and Figgener et al. 2023, DOI 10.48550/arXiv.2203.06762. ISEA and PGS, RWTH Aachen."
      ),
      href: "https://battery-charts.de/de/ueber-uns/",
      link: tx("Über uns", "About"),
      retrieved: tx("Abruf 28.10.2026.", "Retrieved 28 October 2026."),
    },
    {
      name: "SimBench",
      use: tx(
        "Testnetz 1-MV-semiurb--0-no_sw für die Netz-Demo.",
        "Test grid 1-MV-semiurb--0-no_sw for the grid demo."
      ),
      licence: "ODbL 1.0 + DbCL 1.0",
      credit: tx(
        "„The database called SimBench is made available under the Open Database License. Any rights in individual contents of the database are licensed under the Database Contents License.“ University of Kassel, TU Dortmund, RWTH Aachen University and Fraunhofer Institute for Energy Economics and Energy System Technology (IEE).",
        "“The database called SimBench is made available under the Open Database License. Any rights in individual contents of the database are licensed under the Database Contents License.” University of Kassel, TU Dortmund, RWTH Aachen University and Fraunhofer Institute for Energy Economics and Energy System Technology (IEE)."
      ),
      href: "https://simbench.readthedocs.io/en/stable/about/license.html",
      link: tx("Lizenz", "Licence"),
      retrieved: tx("Abruf 28.10.2026.", "Retrieved 28 October 2026."),
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
      href: "https://pandapower.readthedocs.io/en/stable/about/license.html",
      link: tx("Lizenz", "Licence"),
      retrieved: tx("Abruf 28.10.2026.", "Retrieved 28 October 2026."),
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
    tx("Abruf", "Retrieved"),
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
        <ScrollTable
          label={tableLabel}
          hint={hint}
          caption={tx("Annahmen auf einen Blick", "Assumptions at a glance")}
          headers={headers}
          rows={assumptions.map((row) => [row.assumption, row.value, row.unit, row.why, row.uncertainty])}
        />
      </section>
      <section id="lizenzen">
        <h2>{tx("02 Quellen und Lizenzen", "02 Sources and licences")}</h2>
        <p>
          {tx(
            "Keine Energy-Charts-Bilder sind eingebettet. Wir nutzen nur Daten. Die Namensnennung steht so, wie die Quelle sie auf ihrer Seite verlangt. Stand des Abrufs: 28.10.2026.",
            "No Energy-Charts pictures are embedded. We use only data. The attribution is the wording the source asks for on its own page. Retrieved on 28 October 2026."
          )}
        </p>
        <div className="methodik-scroll" role="region" tabIndex={0} aria-label={tableLabel}>
          <table>
            <caption className="sr-only">{tx("Quellen und Lizenzen", "Sources and licences")}</caption>
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
                  <td>{row.use}</td>
                  <td>{row.licence}</td>
                  <td>{row.credit}</td>
                  <td>
                    <a href={row.href}>{row.link}</a>
                  </td>
                  <td>{row.retrieved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="methodik-swipe">{hint}</p>
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
              ". Es gibt keine Preiswirkung. Darum sind ×5 und ×10 Obergrenzen.",
              ". There is no price effect. That is why ×5 and ×10 are upper bounds."
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
