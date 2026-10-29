"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import { DayRing } from "@/components/day-ring/DayRing";
import { useLanguage } from "@/components/language-context";
import { MethodikUeberblick, type MethodikFleetStand } from "@/components/methodik/MethodikUeberblick";
import { NetzMethodik } from "@/components/methodik/NetzMethodik";
import { SzenarienMethodik } from "@/components/methodik/SzenarienMethodik";
import { EURO_SCOPE } from "@/lib/beispieltage";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { REFERENCE_PARK } from "@/lib/referencePark";
import { GLOSSARY } from "@/lib/glossary";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";
import { formatQuarterlyCurtailmentGwh, SMARD_QUARTERLY_TOPIC_URL } from "@/lib/eeCurtailmentQuarterly";

const CHAPTERS = [
  { id: "annahmen", de: "Annahmen auf einen Blick", en: "Assumptions at a glance" },
  { id: "lizenzen", de: "Quellen und Lizenzen", en: "Sources and licences" },
  { id: "grenzen", de: "Grenzen des Modells", en: "Limits of the model" },
  { id: "was", de: "Was gerechnet wird", en: "What is calculated" },
  { id: "einheiten", de: "Daten und Einheiten", en: "Data and units" },
  { id: "grossspeicher", de: "Großspeicher-Modell", en: "Large-storage model" },
  { id: "live", de: "Überschuss und Grenzhandel", en: "Surplus and border trade" },
  { id: "groesse", de: "Speichergröße", en: "Storage size" },
  { id: "ampel", de: "Anschluss-Ampel", en: "Connection light" },
  { id: "netzdienlichkeit", de: "Einschätzung netzdienlich", en: "Grid-support estimate" },
  { id: "peak-erklaert", de: "Peak Shaving", en: "Peak shaving" },
  { id: "modelltag", de: "Modelltag Bollingstedt", en: "Bollingstedt model day" },
  { id: "beispieltage", de: "Beispieltage", en: "Example days" },
  { id: "szenarien", de: "Szenarien", en: "Scenarios" },
  { id: "netz", de: "Netzwirkung im Testnetz", en: "Grid effect in a test grid" },
  { id: "quellen", de: "Quellen", en: "Sources" },
] as const;

export function MethodikDocs({ fleet }: { fleet?: MethodikFleetStand | null }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const rtePct = Math.round(ROUND_TRIP_EFFICIENCY * 100);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      document.querySelectorAll<HTMLDetailsElement>(".site-fold").forEach((node) => {
        node.open = query.matches;
      });
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return (
    <div className="methodik">
      <section className="day-hero methodik-hero" aria-labelledby="methodik-title">
        <div className="day-hero-inner">
          <p className="day-kicker">{tx("Methodik · Referenz", "Method · reference")}</p>
          <h1 id="methodik-title">{tx("Jede Zahl auf SpeicherPilot lässt sich hier nachrechnen.", "Every figure on SpeicherPilot can be recomputed here.")}</h1>
          <div className="methodik-scales">
            <figure>
              <DayRing points={PHASE_POINTS} label={tx("Netz Deutschland", "Germany grid")} description={tx("Form der nationalen Uhr.", "Shape of the national clock.")} showShift={false} showHourTicks={false} showSoc={false} chargedGwh={0} />
              <figcaption>
                <span className="methodik-scale-long">{tx("Netz Deutschland · GW", "Germany grid · GW")}</span>
                <span className="methodik-scale-short">{tx("Netz · GW", "Grid · GW")}</span>
              </figcaption>
            </figure>
            <figure>
              <DayRing points={KW_MINI} unit="kW" scale="utilisation" limit={90} label={tx("Standort", "Site")} description={tx("Form der Standort-Uhr.", "Shape of the site clock.")} showShift={false} showHourTicks={false} showSoc={false} chargedGwh={0} />
              <figcaption>
                <span className="methodik-scale-long">{tx("Standort · kW", "Site · kW")}</span>
                <span className="methodik-scale-short">{tx("Standort · kW", "Site · kW")}</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
      <div className="day-paper">
        <div className="methodik-layout">
          <nav aria-label={tx("Inhalt", "Contents")}>
            <ol>
              {CHAPTERS.map((chapter, index) => (
                <li key={chapter.id}>
                  <a href={`#${chapter.id}`}>{tx(`${String(index + 1).padStart(2, "0")} ${chapter.de}`, `${String(index + 1).padStart(2, "0")} ${chapter.en}`)}</a>
                </li>
              ))}
            </ol>
          </nav>
          <article>
            <MethodikUeberblick language={language} fleet={fleet} />
            <section id="was">
              <h2>{tx("04 Was gerechnet wird", "04 What is calculated")}</h2>
              <p>{tx("Zwei Sichten, ein Kern. Der Projektierer sieht Größe, Zyklen und die abgegebene Energie eines Tages. Der Netzbetreiber sieht Kilowatt am Anschluss, die Ampel und die Einschätzung netzdienlich. Keine Zahl steht in beiden Helden.", "Two views, one core. The developer sees size, cycles and the energy delivered on one day. The grid operator sees kilowatts at the connection, the traffic light and the grid-support estimate. No figure appears in both heroes.")}</p>
              <p>{tx("Die nationale Uhr auf /live und der Startseite ist die Residuallast Deutschlands in Polarform. Der Standort-Ring ist dieselbe Form in Kilowatt. Die GW-Skala kommt auf /site nicht vor.", "The national clock on /live and the homepage is Germany’s residual load in polar form. The site ring is the same form in kilowatts. The GW scale does not appear on /site.")}</p>
            </section>
            <section id="einheiten">
              <h2>{tx("05 Daten und Einheiten", "05 Data and units")}</h2>
              <div className="methodik-table"><table>
                <thead>
                  <tr><th>{tx("Größe", "Quantity")}</th><th>{tx("Einheit", "Unit")}</th><th>{tx("Quelle", "Source")}</th></tr>
                </thead>
                <tbody>
                  <tr><td>{tx("Residuallast", "Residual load")}</td><td>{tx("MW, in der Uhr GW", "MW, and GW on the clock")}</td><td>{tx("Energy-Charts, Last − Wind − Sonne", "Energy-Charts, load − wind − solar")}</td></tr>
                  <tr><td>{tx("Großspeicher", "Large storage")}</td><td>MW, MWh</td><td>battery-charts.de aus dem MaStR</td></tr>
                  <tr><td>{tx("Anschluss", "Connection")}</td><td>kW</td><td>{tx("Eingabe oder Beispiel", "Input or example")}</td></tr>
                  <tr><td>{tx("Wirkungsgrad, live", "Efficiency, live")}</td><td>{tx("0,85 auf der Abgabe", "0.85 on discharge")}</td><td>{tx("Standard, Spanne 80–90 %", "Default, range 80–90%")}</td></tr>
                  <tr><td>{tx("Wirkungsgrad, Standort", "Efficiency, site")}</td><td>√RTE je Richtung</td><td>{tx("Standort-Rechner", "Site calculator")}</td></tr>
                </tbody>
              </table></div>
              <p>{tx("Eine nationale Reihe heißt Deutschland. Sie wird nicht als Hamburg oder als Norden beschriftet. 50Hertz ist die Regelzone, nicht die Stadt. TransnetBW zeigt, dass im Norden mehr Wind steht als im Süden, und ist kein Engpass.", "A national series is called Germany. It is not labelled as Hamburg or as the north. 50Hertz is the control area, not the city. TransnetBW shows that the north has more wind than the south, and is not a congestion.")}</p>
              <h3 id="erzeugung">{tx("Erzeugung und Last", "Generation and load")}</h3>
              <p>{tx("Die Fläche unter der Uhr ist die veröffentlichte Erzeugung je Träger, so wie Energy-Charts sie liefert. Eine eigene Industrie-Eigenerzeugung wird nicht dazugerechnet und nicht herausgerechnet. Die Last heißt dort „Load (incl. self-consumption)“ und enthält den Eigenverbrauch, den die Quelle in dieser Reihe führt.", "The area under the clock is published generation by carrier, as Energy-Charts supplies it. No separate industrial self-generation is added or removed. Load is the series “Load (incl. self-consumption)” and includes the self-consumption that source puts in that series.")}</p>
              <p>{tx("Träger von unten nach oben: Braunkohle, Steinkohle, Erdgas, Biomasse, Wasser, Wind auf See, Wind an Land, Sonne, Sonstige. Wasser ist Laufwasser, Speicherwasser und die Erzeugung der Pumpspeicher. Verbrauch der Pumpspeicher und Batteriespeicher stehen nicht in der Fläche. Sonstige ist Öl, Kohlegas, Geothermie, Abfall, die Reihe Others und jede weitere Erzeugungsreihe, die keinem genannten Träger zugeordnet ist.", "Carriers from bottom to top: lignite, hard coal, natural gas, biomass, hydro, offshore wind, onshore wind, solar, other. Hydro is run-of-river, reservoir and pumped-storage generation. Pumped-storage consumption and battery storage are not in the area. Other is oil, coal-derived gas, geothermal, waste, the Others series and any further generation series that is not one of the named carriers.")}</p>
              <p>{tx("Residuallast = Last − Wind an Land − Wind auf See − Sonne. Nur in Viertelstunden, in denen alle diese Werte veröffentlicht sind. Eine Lücke bleibt leer und wird nicht zu 0. Handelssaldo ist die Reihe „Cross border electricity trading“. Positiv heißt Import nach Deutschland, negativ heißt Export. Der Anteil von Wind und Sonne bezieht sich nur auf Viertelstunden, in denen Last, Wind und Sonne zusammen vorliegen. Die Tabelle nennt die Zahl der Viertelstunden. Eine spätere Last ohne Erzeugung steht im Streifen als vorläufig und ist nicht der aktuelle Stand.", "Residual load = load − onshore wind − offshore wind − solar. Only in quarter-hours where all of those values are published. A gap stays empty and does not become 0. The cross-border balance is the series “Cross border electricity trading”. Positive means import into Germany, negative means export. The wind-and-solar share uses only quarter-hours where load, wind and solar are published together. The table names the quarter-hour count. A later load without generation is marked provisional on the strip and is not the current reading.")}</p>
              <p>{tx("Energie in GWh ist die Summe der veröffentlichten Viertelstunden in MW mal 0,25 h, geteilt durch 1.000. Eine fehlende Viertelstunde zählt nicht als 0. Tag: jede Viertelstunde, Achse in GW. Woche: Stundenmittel der veröffentlichten Viertelstunden, Achse in GW. Monat: Tagesenergie in GWh über 31 Tage. Die Zahlenzeile bleibt in jedem Zeitraum die Summe der Viertelstunden. Die Zeitachse folgt der Uhrzeit des Zeitstempels. Am 25.10.2026 hat der Tag 100 Viertelstunden. Die zweite 02:00-Stunde trägt die Abweichung +01, damit die Marken sich nicht decken.", "Energy in GWh is the sum of published quarter-hours in MW times 0.25 h, divided by 1,000. A missing quarter-hour does not count as 0. Day: every quarter-hour, axis in GW. Week: hourly mean of the published quarter-hours, axis in GW. Month: daily energy in GWh over 31 days. The figure row stays the quarter-hour sum in every period. The time axis follows the timestamp. On 25 October 2026 the day has 100 quarter-hours. The second 02:00 hour carries the offset +01, so the marks do not collide.")}</p>
              <p>{tx("Ein Überschusstag ist ein Tag, an dem die Summe von max(0, Wind an Land + Wind auf See + Sonne − Last) mal 0,25 h größer als 0,05 GWh ist. Liegt der Tag darunter, nennt der Befund den Anteil von Wind und Sonne an der Last und die Spanne der Residuallast. Dieselben Zahlen stehen in der Tabelle.", "A surplus day is a day on which the sum of max(0, onshore wind + offshore wind + solar − load) times 0.25 h is greater than 0.05 GWh. Below that, the finding names the wind-and-solar share of load and the residual-load range. The same numbers are in the table.")}</p>
              <p>{tx("Nennenergie ist die Größe der Flotte. Nutzbar sind 10–90 % davon, also 80 % der Nennenergie. Der Ring eines einzelnen Tages und die Ladezustandslinie starten am Beginn des Zeitraums bei 10 % der Nennenergie und bleiben in diesem Fenster. Die beiden Rechnungen sind für denselben Tag und denselben Faktor gleich. Geladen wird nur vor 17 Uhr und nur aus Überschuss von Wind plus Sonne über der Last. Ab 17 Uhr wird auf die Abendspitze abgegeben. 85 % Wirkungsgrad werden bei der Abgabe abgezogen: aus dem Speicher geht die abgegebene Energie geteilt durch 0,85. Der Stand am Tagesende ist der Start des nächsten Tages. ×1 ist die Flotte, ×2, ×5 und ×10 vervielfachen Leistung und Energie. Die Abendspitze ändert sich mit dem Faktor, aber nicht linear: Ist der Überschuss aufgebraucht, sinkt sie nicht weiter (25.10.: ab ×2 bei 5,0 GW). Das ist eine Modellschätzung, Preisnehmer, nur Day-Ahead im übrigen Rechner, hier ohne Euro-Betrag.", "Nameplate energy is the fleet size. The usable window is 10–90% of that, so 80% of nameplate. The ring of a single day and the state-of-charge line both start the period at 10% of nameplate and stay inside that window. The two calculations match for the same day and the same factor. Charging is only before 17:00 and only from wind plus solar above load. From 17:00 it discharges onto the evening peak. 85% round-trip efficiency is taken on discharge: the battery loses the delivered energy divided by 0.85. The level at the end of a day is the start of the next day. ×1 is the fleet; ×2, ×5 and ×10 scale power and energy. The evening peak changes with the factor, but not linearly: once surplus is used up, it stops falling (25 Oct: from ×2 at 5.0 GW). That is a model estimate, a price taker, day-ahead only in the other calculator, and no euro amount here.")}</p>
              <p>{tx("Im Streifen oben gilt: Last etwa 70 Minuten später, Erzeugung etwa 85 Minuten, Frequenz etwa 30 Minuten. Jede Zahl nennt die Uhrzeit ihres eigenen Werts. Die Frequenz ist die Messung in Freiburg, kein Wert eines Netzbetreibers. Der Day-Ahead-Preis ist der Marktpreis der laufenden Viertelstunde in Euro je Megawattstunde, Bundesnetzagentur | SMARD.de über Energy-Charts, CC BY 4.0. Das ist kein Erlös. SMARD-Viertelstunden in Megawattstunden wären mal 4 zu nehmen, wenn sie als Leistung gelesen würden. Das passiert hier nicht: die Leistung kommt in Megawatt von Energy-Charts. Anteil Erneuerbare im Streifen ist die Reihe „Renewable share of load“, nicht nur Wind und Sonne. Fehlt ein Wert, steht „nicht veröffentlicht“. Bei einem Fehler oder HTTP 429 bleibt der zuletzt gültige Abruf stehen und ist mit „zuletzt gültig“ markiert.", "On the strip at the top: load is about 70 minutes late, generation about 85 minutes, frequency about 30 minutes. Each number names the time of its own value. Frequency is the Freiburg measurement, not a grid-operator value. The day-ahead price is the market price of the current quarter-hour in euro per megawatt-hour, Bundesnetzagentur | SMARD.de via Energy-Charts, CC BY 4.0. That is not revenue. A SMARD quarter-hour in megawatt-hours would be multiplied by 4 if it were read as power. That does not happen here: power comes from Energy-Charts in megawatts. Renewable share on the strip is the series “Renewable share of load”, not wind and solar alone. A missing value says “not published”. On an error or HTTP 429 the last valid response stays and is marked “last valid”.")}</p>
            </section>
            <section id="grossspeicher">
              <h2>{tx("06 Großspeicher-Modell", "06 Large-storage model")}</h2>
              <div className="methodik-phases" inert>
                <Phase label={tx("Laden", "Charge")} highlight="midday" />
                <Phase label={tx("Halten", "Hold")} highlight={null} />
                <Phase label={tx("Abgeben", "Discharge")} highlight="evening" />
              </div>
              <Formula label={tx("Geladene Energie vor 17 Uhr", "Energy charged before 17:00")}>
                <math display="block">
                  <mrow>
                    <msub><mi>E</mi><mtext>geladen</mtext></msub>
                    <mo>=</mo>
                    <munder>
                      <mo>∑</mo>
                      <mrow><mi>t</mi><mo>&lt;</mo><mtext>17 Uhr</mtext></mrow>
                    </munder>
                    <mo>min</mo>
                    <mo>(</mo><mi>Ü</mi><mo>,</mo><mi>P</mi><mo>,</mo><mi>Raum</mi><mo>)</mo>
                    <mo>·</mo>
                    <mi>Δ</mi><mi>t</mi>
                  </mrow>
                </math>
              </Formula>
              <Formula label={tx("Abgebbare Energie, Verluste nur auf der Abgabe", "Deliverable energy, losses only on discharge")}>
                <math display="block">
                  <mrow>
                    <msub><mi>E</mi><mtext>abgebbar</mtext></msub>
                    <mo>=</mo>
                    <msub><mi>E</mi><mtext>geladen</mtext></msub>
                    <mo>·</mo>
                    <mi>η</mi>
                    <mo>,</mo>
                    <mi>η</mi>
                    <mo>=</mo>
                    <mn>0,85</mn>
                  </mrow>
                </math>
              </Formula>
              <h3 id="wirkungsgrad">{tx("Wirkungsgrad", "Round-trip efficiency")}</h3>
              <p>{tx("Von 100 geladenen kWh kommen nicht 100 zurück. Wie viele, hängt davon ab, wo man misst. Der Standard in allen Rechenkernen ist 85 %. Die Spanne ist 80–90 %. Gemeint ist AC zu AC, einschließlich Wechselrichter, Trafo und Hilfsenergie.", "Of 100 kWh charged, 100 do not come back. How many come back depends on where you measure. The default in every calculation core is 85%. The range is 80–90%. That means AC to AC, including the inverter, the transformer and auxiliary energy.")}</p>
              <p>{tx("PNNL 2022, Grid Energy Storage Technology Cost and Performance Assessment (PNNL-33283, August 2022): der Lithium-Ionen-Round-Trip liegt je nach Dauer und Messstelle bei etwa 82,6–89,6 %. Im Bericht steht DC–DC bei 89,55 %, AC am Wechselrichter bei 86,00 % (89,55 % × 0,98²) und AC am Trafo bei 82,59 %.", "PNNL 2022, Grid Energy Storage Technology Cost and Performance Assessment (PNNL-33283, August 2022): lithium-ion round-trip efficiency is about 82.6–89.6% depending on duration and where it is measured. The report lists DC–DC at 89.55%, AC at the inverter at 86.00% (89.55% × 0.98²) and AC at the transformer at 82.59%.")}</p>
              <p>{tx("NREL ATB, Utility-Scale Battery Storage, setzt 85 % RTE für Planungsrechnungen an. Stand 23.10.2026.", "NREL ATB, Utility-Scale Battery Storage, uses 85% RTE for planning calculations. As of 23 October 2026.")}</p>
              <p>
                <a href="https://www.pnnl.gov/sites/default/files/media/file/ESGC%20Cost%20Performance%20Report%202022%20PNNL-33283.pdf">PNNL-33283</a>
                {" · "}
                <a href="https://atb.nrel.gov/electricity/2025/utility-scale_battery_storage">NREL ATB 2025</a>
              </p>
              <p>{tx("Ein fester Wert gilt für alle Leistungen und Ladezustände. In Wirklichkeit ist der Wirkungsgrad bei Teillast schlechter, und Hilfsenergie fällt auch im Stillstand an. Das Großspeicher-Modell bucht den ganzen Verlust bei der Abgabe. Der Standort-Rechner teilt ihn je zur Hälfte auf, als Wurzel aus dem Round-Trip auf dem Weg hinein und auf dem Weg hinaus. Die Summe ist gleich, nur der Ladezustand dazwischen sieht anders aus. Die beiden Modelle werden nicht vermischt.", "One fixed value applies at every power and state of charge. In practice efficiency is worse at part load, and auxiliary energy is used even while the battery is idle. The large-storage model books the whole loss on discharge. The site calculator splits it in half, as the square root of the round trip on the way in and on the way out. The sum is the same; only the state of charge in between looks different. The two models are not mixed.")}</p>
              <p>{tx("Geladen wird nur vor 17 Uhr und nur aus Überschuss, bis Leistung und freier Inhalt begrenzt sind. η = 0,85 wird erst bei der Abgabe angewendet. Nutzbar sind 80 % der Nennenergie. Aus 7,86 GWh Nennenergie werden damit höchstens 6,29 GWh Ladung und 5,34 GWh Abgabe.", "Charging happens only before 17:00 and only from surplus, limited by power and free capacity. η = 0.85 is applied only on discharge. The usable share is 80% of nameplate. From 7.86 GWh nameplate that is at most 6.29 GWh charged and 5.34 GWh delivered.")}</p>
              <p>{tx("Die Stromspeicher-Strategie setzt kein Mengenziel für Speicher. ×1 ist der registrierte Bestand, keine Zielstufe.", "The electricity-storage strategy sets no quantity target for storage. ×1 is the registered stock, not a target step.")}</p>
            </section>
            <section id="live">
              <h2>{tx("06b Überschuss, Export, Abregelung", "06b Surplus, export, curtailment")}</h2>
              <p>{tx("Überschuss Wind und Sonne ist die Summe von max(0, Wind an Land + Wind auf See + Sonne − Last) mal 0,25 h über den Tag. Dieselbe Definition wie der Ring und Abschnitt 06.", "Wind-and-solar surplus is the sum of max(0, onshore wind + offshore wind + solar − load) times 0.25 h over the day. Same definition as the ring and section 06.")}</p>
              <p>{tx("Export beobachtet integriert nur negative Grenzhandels-Leistung (Export) aus Energy-Charts total_power (Last inkl. Eigenverbrauch, 15 Min.). Die Modellschätzung je Viertelstunde: simuliert = max(0, beobachtet − Ladung aus Überschuss). Entladung ab 17 Uhr ändert den Export nicht.", "Observed export integrates only negative cross-border power (export) from Energy-Charts total_power (load including self-consumption, 15 min). The model estimate each quarter-hour: simulated = max(0, observed − charging from surplus). Discharge from 17:00 does not change export.")}</p>
              <p>
                {language === "de" ? (
                  <>
                    Gemessene EE-Abregelung bundesweit gibt es nur quartalsweise (
                    <a href={SMARD_QUARTERLY_TOPIC_URL}>Bundesnetzagentur/SMARD</a>, 2. Quartal 2026 am 12.10.2026:{" "}
                    {formatQuarterlyCurtailmentGwh("de")}). Tageswerte veröffentlicht niemand. Abregelung fließt nicht in
                    die Aufnahme.
                  </>
                ) : (
                  <>
                    Measured renewable curtailment for all of Germany is published only quarterly (
                    <a href={SMARD_QUARTERLY_TOPIC_URL}>Bundesnetzagentur/SMARD</a>, Q2 2026 on 12 Oct 2026:{" "}
                    {formatQuarterlyCurtailmentGwh("en")}). No daily figures exist. Curtailment is not included in
                    absorption.
                  </>
                )}
              </p>
              <p>{tx("Auf /live gelten zwei sichtbare Zeiträume: Der Ring oben rechnet den gewählten Kalendertag (heute laufend oder ein älterer Tag über ?tag=). Darunter steht der letzte vollständig veröffentlichte Tag mit Überschuss-Rechnung, Grafik und Tabelle. Beide Teile nutzen denselben Regler ×1…×10 (?x). Die Formeln sind identisch: Überschuss max(0, Wind an Land + Wind auf See + Sonne − Last), Laden nur vor 17 Uhr daraus, Export simuliert = max(0, Export beobachtet − Ladung), Entladung ab 17 Uhr auf die Abend-Residuallast mit η = 0,85 auf der Abgabe, nutzbar 10–90 % Nennenergie. Quelle Leistung und Grenzhandel: Energy-Charts total_power, 15-Minuten-Werte.", "On /live there are two visible periods: the ring at the top uses the chosen calendar day (today in progress or an older day via ?tag=). Below that is the last fully published day with surplus calculation, chart and table. Both share the same ×1…×10 control (?x). The formulas are the same: surplus max(0, onshore wind + offshore wind + solar − load), charging only before 17:00 from that surplus, simulated export = max(0, observed export − charging), discharge from 17:00 on the evening residual with η = 0.85 on delivery, usable 10–90% of nameplate. Source for power and cross-border trade: Energy-Charts total_power, 15-minute values.")}</p>
              <p>{tx("Die Aufnahme je ×1…×10 nutzt dieselbe Flotte wie die Uhr (Battery Charts, Stand siehe Seite). ×2, ×5 und ×10 vervielfachen Leistung und Energie. Euro gibt es nur bei ×1. Unsicherheit: Kupferplatte, keine Engpässe.", "Absorption at ×1…×10 uses the same fleet as the ring (Battery Charts, as-of on the page). ×2, ×5 and ×10 scale power and energy. Euro figures appear only at ×1. Uncertainty: copper plate, no bottlenecks.")}</p>
            </section>
            <section id="groesse">
              <h2>{tx("07 Speichergröße", "07 Storage size")}</h2>
              <Formula label={tx("Speichergröße aus der Tagesspitze", "Storage size from the daily peak")}>
                <math display="block">
                  <mtable>
                    <mtr>
                      <mtd><msub><mi>P</mi><mtext>Tag</mtext></msub></mtd>
                      <mtd><mo>=</mo></mtd>
                      <mtd><mrow><msub><mo>max</mo><mi>t</mi></msub><mo>max</mo><mo>(</mo><mn>0</mn><mo>,</mo><msub><mi>P</mi><mtext>net</mtext></msub><mo>(</mo><mi>t</mi><mo>)</mo><mo>−</mo><msub><mi>P</mi><mtext>limit</mtext></msub><mo>)</mo></mrow></mtd>
                    </mtr>
                    <mtr>
                      <mtd><msub><mi>P</mi><mtext>BESS</mtext></msub></mtd>
                      <mtd><mo>=</mo></mtd>
                      <mtd><mrow><mo>max</mo><mo>(</mo><mn>0</mn><mo>,</mo><msub><mi>P95</mi><mtext>Tag</mtext></msub><mo>(</mo><msub><mi>P</mi><mtext>Tag</mtext></msub><mo>)</mo><mo>)</mo></mrow></mtd>
                    </mtr>
                  </mtable>
                </math>
              </Formula>
              <Formula label={tx("Energie über das nutzbare Fenster 10–95 %", "Energy over the usable 10–95% window")}>
                <math display="block">
                  <mrow>
                    <msub><mi>E</mi><mtext>BESS</mtext></msub>
                    <mo>=</mo>
                    <mfrac>
                      <mrow><msub><mi>P95</mi><mtext>Tag</mtext></msub><mo>(</mo><msub><mi>E</mi><mtext>Überschuss</mtext></msub><mo>)</mo></mrow>
                      <mrow><msub><mi>η</mi><mtext>dis</mtext></msub><mo>·</mo><mn>0,85</mn></mrow>
                    </mfrac>
                    <mo>,</mo>
                    <msub><mi>η</mi><mtext>dis</mtext></msub>
                    <mo>=</mo>
                    <msqrt><mtext>RTE</mtext></msqrt>
                  </mrow>
                </math>
              </Formula>
              <p>
                {language === "de" ? (
                  <>
                    <var>P<sub>Tag</sub></var> ist der höchste Überschuss eines Tages, <var>E<sub>Überschuss</sub></var> die Summe dieses Tages. P95 darüber lässt die härtesten 5 % der Tage über der Grenze. Das ist Absicht. 0,85 im Nenner ist das nutzbare Fenster, 90 % minus 10 % des Ladezustands. Im Beispiel-Supermarkt ist der Round-Trip-Wirkungsgrad 0,85, also gilt je Richtung √0,85 ≈ 0,922. Die Handwerte 40 kW und 40 kWh umgehen diese Formel, weil die Größe dort von Hand gesetzt ist.
                  </>
                ) : (
                  <>
                    <var>P<sub>day</sub></var> is a day’s highest excess, and <var>E<sub>excess</sub></var> is that day’s sum. P95 across those days leaves the hardest 5% above the limit. That is intentional. The 0.85 in the denominator is the usable window, the upper state-of-charge bound minus the lower bound, that is 0.95 − 0.10. In the supermarket example the round-trip efficiency is 0.85, so each direction uses √0.85 ≈ 0.922. The hand values 40 kW and 40 kWh bypass this formula, because the size is set by hand there.
                  </>
                )}
              </p>
            </section>
            <section id="ampel">
              <h2>{tx("08 Anschluss-Ampel", "08 Connection light")}</h2>
              <div className="methodik-gauges">
                <Gauge pct={70} label={tx("passt", "fits")} />
                <Gauge pct={95} label={tx("knapp", "tight")} />
                <Gauge pct={120} label={tx("passt nicht", "does not fit")} />
              </div>
              <p>{tx("Unter 90 % der Anschlussleistung passt es. Ab 90 % bis zur Grenze ist es knapp. Darüber passt es nicht. Fehlt die Anschlussleistung, bleibt der Punkt grau und es gibt keine rote Linie. Die Farbe steht nie allein: der Text nennt den Zustand.", "Below 90% of the connection it fits. From 90% up to the limit it is tight. Above that it does not fit. If the connection capacity is missing, the dot stays grey and there is no red line. Colour never stands alone: the text names the state.")}</p>
            </section>
            <section id="netzdienlichkeit">
              <h2>{tx("09 Einschätzung netzdienlich", "09 Grid-support estimate")}</h2>
              <p>{tx(`Regel v1. Ein Intervall zählt als Spitze, wenn die Standortlast mindestens ${Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100)} % der Anschlussleistung erreicht. Einschätzung netzdienlich ab ${Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100)} % der Entladeenergie in diesen Intervallen und ohne neue Bezugsspitze. Darunter bis ${Math.round(GRID_SUPPORT_CONFIG.mixedMinShare * 100)} % heißt die Schätzung gemischt, darunter marktgetrieben. Eine neue Spitze liegt vor, sobald ein Ladeintervall die Bezugsspitze über die Spitze ohne Speicher hebt. Die Schwellen stehen nur an einer Stelle im Modell und sind vorläufig.`, `Rule v1. An interval counts as a peak when site load reaches at least ${Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100)}% of the connection. The estimate is grid-supportive from ${Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100)}% of discharge energy in those intervals and only without a new import peak. Down to ${Math.round(GRID_SUPPORT_CONFIG.mixedMinShare * 100)}% the estimate is mixed, and below that market-driven. A new peak exists as soon as a charging interval lifts the import above the peak without storage. The thresholds live in one place in the model and are provisional.`)}</p>
              <p>{tx("Die Marke heißt netzdienlich v1 · Einschätzung, kein Befund. Die Schrift bleibt neutral, ohne Grün und ohne Rot.", "The badge reads grid-supportive v1 · estimate, not a finding. The type stays neutral, with no green and no red.")}</p>
              <blockquote>
                <p>{tx("Ob netzdienlicher Speicherbetrieb im örtlichen Verteilnetz Netzausbau vermeidet, kann nur der Netzbetreiber beurteilen; ihm steht dabei ein Entscheidungsspielraum zu. Die Bundesnetzagentur durfte ihre Vorgaben (Positionspapier 2009, Leistungspreismodell) als angemessen ansehen.", "Whether grid-supportive storage operation avoids network expansion in the local distribution network can only be judged by the network operator; that operator has a margin of decision. The Federal Network Agency was entitled to regard its requirements (2009 position paper, capacity-price model) as appropriate.")}</p>
                <p>
                  <a href="https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html">{tx("BGH, Beschluss vom 15.07.2025, EnVR 1/24, Pressemitteilung 129/2025", "BGH, decision of 15 July 2025, EnVR 1/24, press release 129/2025")}</a>
                  {tx(". Stand 21.10.2026.", ". As of 21 October 2026.")}
                </p>
              </blockquote>
            </section>
            <section id="peak-erklaert">
              <h2>{tx("10 Peak Shaving, Schritt für Schritt", "10 Peak shaving, step by step")}</h2>
              <p>{tx("Die Geschichte auf der Startseite mit Zahlen: Die Abendspitze passt nicht durch den Anschluss, der Speicher nimmt sie weg.", "The homepage story in numbers: the evening peak does not fit through the connection, and the battery takes it away.")}</p>
              <Formula label={tx("Abgabe über der Anschlussgrenze", "Discharge above the connection limit")}>
                <math display="block">
                  <mrow>
                    <msub><mi>d</mi><mi>t</mi></msub>
                    <mo>=</mo>
                    <mo>min</mo>
                    <mo>(</mo>
                    <msub><mi>L</mi><mi>t</mi></msub>
                    <mo>−</mo>
                    <msub><mi>P</mi><mtext>Grenze</mtext></msub>
                    <mo>,</mo>
                    <mi>P</mi>
                    <mo>,</mo>
                    <msub><mtext>SoC</mtext><mi>t</mi></msub>
                    <mo>·</mo>
                    <msqrt><mi>η</mi></msqrt>
                    <mo>/</mo>
                    <mi>Δ</mi><mi>t</mi>
                    <mo>)</mo>
                  </mrow>
                </math>
              </Formula>
              <p>{tx("Abgegeben wird nur, wenn die Last über der Anschlussgrenze liegt. Der Ladezustand sinkt um die abgegebene Energie geteilt durch √η. Nachgeladen wird ab 19:30 Uhr mit höchstens 15 kW, und nur solange unter der Grenze Luft ist.", "Discharge happens only when load is above the connection limit. State of charge falls by the delivered energy divided by √η. Recharging starts at 19:30, at most 15 kW, and only while there is room under the limit.")}</p>
              <p>{tx("Annahmen: Speicher 40 kW / 40 kWh, startet voll (100 %), Wirkungsgrad 0,85, Anschluss 90 kW. Winter-Werktag des fiktiven Supermarkts ohne PV.", "Assumptions: battery 40 kW / 40 kWh, starts full (100%), efficiency 0.85, connection 90 kW. A winter weekday of the fictional supermarket, without PV.")}</p>
              <p>{tx("Spitze 119,6 kW um 17:30 Uhr. Über 90 kW von 17:00 bis 18:15 Uhr, fünf Viertelstunden. Der Speicher gibt 14,1 / 25,7 / 29,6 / 24,8 / 12,3 kW ab, zusammen 26,6 kWh.", "Peak 119.6 kW at 17:30. Above 90 kW from 17:00 to 18:15, five quarter-hours. The battery delivers 14.1 / 25.7 / 29.6 / 24.8 / 12.3 kW, 26.6 kWh in total.")}</p>
              <p>{tx("Gegenrechnung Ladezustand: 26,6 / 0,922 ≈ 28,85 kWh aus dem Speicher, also 40 − 28,85 = 11,15 kWh = 27,9 %. Der Bezug danach liegt höchstens bei 90,0 kW, genau auf der Linie. Die Ampel steht auf knapp, nicht auf passt. Ab 19:30 Uhr lädt er mit 15 kW nach und ist zum Tagesende wieder voll (40 kWh).", "State-of-charge check: 26.6 / 0.922 ≈ 28.85 kWh leaves the battery, so 40 − 28.85 = 11.15 kWh = 27.9%. Import afterwards stays at most at 90.0 kW, exactly on the line. The light reads tight, not fits. From 19:30 it recharges at 15 kW and is full again at the end of the day (40 kWh).")}</p>
              <p>{tx("Spitze −29,6 kW × 120 €/kW·a ≈ 3.550 €/a, Modellschätzung. Der Leistungspreis von 120 €/kW·a ist eine Annahme, kein Tarif.", "Peak −29.6 kW × 120 €/kW·a ≈ €3,550 per year, model estimate. The demand charge of 120 €/kW·a is an assumption, not a tariff.")}</p>
              <p>{tx("Ist der Speicher zu klein, sinkt die Spitze nur teilweise. Die Seite sagt dann: Der Anschluss passt noch nicht. Liegt die Last nie über der Grenze, gibt es keine Abgabe. Ist der Speicher leer, bevor die Spitze vorbei ist, geht der Rest über die Grenze.", "If the battery is too small, the peak only falls part of the way. The page then says the connection does not fit yet. If load never crosses the limit, there is no discharge. If the battery is empty before the peak is over, the rest goes over the limit.")}</p>
              <p>{tx("Der Lehrtag weiß, dass die Spitze kommt, und startet deshalb voll. Der Jahreslauf auf /site startet bei 50 %, lädt selbst vor und hält 10–95 % ein. Darum stimmen die Zahlen beider Ansichten nur zufällig überein, hier beide 26,6 kWh und 119,6 kW auf 90 kW. Der Leistungspreis hängt an der Jahreshöchstlast. Ein einziger verpasster Tag macht die Ersparnis kaputt. Darum rechnet /site ein ganzes Jahr und nimmt die Jahresspitze vorher und nachher. Der Lehrtag zeigt nur das Prinzip.", "The teaching day knows the peak is coming, and therefore starts full. The year run on /site starts at 50%, charges ahead on its own and stays inside 10–95%. The two views therefore match only by chance, here both at 26.6 kWh and 119.6 kW down to 90 kW. The demand charge follows the annual peak. One missed day wipes out the saving. That is why /site runs a whole year and takes the annual peak before and after. The teaching day only shows the principle.")}</p>
            </section>
            <section id="modelltag">
              <h2>{tx("11 Modelltag Bollingstedt", "11 Bollingstedt model day")}</h2>
              <p>{tx("Leistung und Inhalt sind die Summe zweier Einheiten im Marktstammdatenregister: SEE925543621515 und SEE922158261037. Zusammen sind das 103,5 MW und 238,5 MWh. Die Meldung des Betreibers nennt 238 MWh.", "Power and energy are the sum of two Marktstammdatenregister units: SEE925543621515 and SEE922158261037. Together that is 103.5 MW and 238.5 MWh. The operator’s release says 238 MWh.")}</p>
              <p>{tx("2,3 h ist 238,5 MWh geteilt durch 103,5 MW. Die C-Rate 0,43 ist 103,5 geteilt durch 238,5. Beides ist eine Rechnung aus den veröffentlichten Zahlen, keine Messung.", "2.3 h is 238.5 MWh divided by 103.5 MW. The C-rate 0.43 is 103.5 divided by 238.5. Both are the published figures divided, not a measurement.")}</p>
              <p>{tx("Die flexible Netzanschlussvereinbarung mit SH Netz begrenzt Bezug und Einspeisung dynamisch. Die Grenzwerte sind nicht veröffentlicht. Nach § 17 Abs. 2b EnWG kann der Netzbetreiber eine solche Vereinbarung anbieten, mit einer festen oder einer sich ändernden Grenze für die höchste Bezugs- oder Einspeiseleistung.", "The flexible grid connection agreement with SH Netz limits withdrawal and feed-in dynamically. The limits are not published. Under section 17 (2b) of the Energy Industry Act the network operator can offer such an agreement, with a fixed or a changing limit on the highest withdrawal or feed-in power.")}</p>
              <p>{tx(`Der Ring ist ein Modelltag. Er fährt 103,5 MW und 238,5 MWh gegen die Day-Ahead-Preise von gestern in der Gebotszone DE-LU. Der Wirkungsgrad ist der gemeinsame Standard, ${rtePct} % Round-Trip, Spanne 80–90 %, je Richtung die Wurzel daraus. Der Ladezustand bleibt zwischen 10 % und 90 %, der Start liegt bei 50 %, und der Tag endet nicht darunter. Modell: lädt mittags in den billigsten Viertelstunden und gibt abends (Vorrang 17–21 Uhr) in den teuersten ab, höchstens so viel, wie es an diesem Tag geladen hat. Das sind Annahmen, keine Messung am Standort. Die echte Fahrweise steht beim Betreiber und wird hier nicht übernommen.`, `The ring is a model day. It runs 103.5 MW and 238.5 MWh against yesterday’s day-ahead prices in the DE-LU bidding zone. Round-trip efficiency is the shared standard, ${rtePct}%, span 80–90%, and each direction uses the square root. The state of charge stays between 10% and 90%, the day starts at 50%, and it does not end below that. Model: it charges at midday in the cheapest quarter-hours and discharges in the evening (priority 17:00–21:00) in the most expensive ones, at most as much as it charged on this day. Those are assumptions, not a measurement at the site. The real operation is published by the operator and is not copied here.`)}</p>
              <p>{tx("Modellannahme für die Auswahl. Der Score einer Viertelstunde ist der Day-Ahead-Preis plus Abendzuschlag plus Volatilitätsterm. Der Abendzuschlag gilt von 17 bis 21 Uhr und ist 0,18 mal die Preisspanne des Tages, sonst null. Der Volatilitätsterm ist 0,12 mal die normierte Streuung mal dieselbe Preisspanne. Die normierte Streuung ist die Standardabweichung der Preise über die letzten vier Viertelstunden, geteilt durch die größte Standardabweichung des Tages. Abgegeben wird bei den höchsten Scores, geladen davor bei den niedrigsten Preisen.", "Model assumption for the choice. A quarter-hour’s score is the day-ahead price plus an evening bonus plus a volatility term. The evening bonus applies from 17:00 to 21:00 and is 0.18 times the day’s price range, otherwise zero. The volatility term is 0.12 times the normalised spread times that same price range. The normalised spread is the standard deviation of prices over the last four quarter-hours, divided by the day’s largest standard deviation. Discharge uses the highest scores, and charging before that uses the lowest prices.")}</p>
            </section>
            <section id="beispieltage">
              <h2>{tx("12 Beispieltage", "12 Example days")}</h2>
              <p>{tx("Vier Tage aus dem Fenster 27.10.2025 bis 26.10.2026 stehen auf der Startseite. Dieselbe Rechnung wie der Modelltag: 103,5 MW und 238,5 MWh, Wirkungsgrad 0,85 hin und zurück, je Richtung die Wurzel daraus (0,922). Ladezustand 10 bis 90 %, Start 50 %, Ende nicht darunter. Das ist eine Modellschätzung und keine Abrechnung, keine Prognose und nicht die Fahrweise von Bollingstedt.", "Four days from the window 27 October 2025 to 26 October 2026 are on the homepage. The same calculation as the model day: 103.5 MW and 238.5 MWh, round-trip efficiency 0.85, the square root of that in each direction (0.922). State of charge 10 to 90%, start 50%, and the day does not end below that. This is a model estimate, not a bill, not a forecast and not the operation at Bollingstedt.")}</p>
              <p>{tx("Warum diese Tage? 1. Der Tag mit dem höchsten Modellerlös. 2. Der beste Tag ohne negative Preise. 3. Der beste Herbsttag. 4. Der mittlere Tag als Vergleich.", "Why these days? 1. The day with the highest model revenue. 2. The best day without negative prices. 3. The best autumn day. 4. The middle day as a comparison.")}</p>
              <Formula label={tx("Modellerlös eines Tages, Euro", "Model revenue of one day, euro")}>
                <math display="block">
                  <mrow>
                    <mi>R</mi>
                    <mo>=</mo>
                    <munder>
                      <mo>∑</mo>
                      <mi>q</mi>
                    </munder>
                    <msub><mi>P</mi><mi>q</mi></msub>
                    <mo>·</mo>
                    <mi>Δ</mi><mi>t</mi>
                    <mo>·</mo>
                    <msub><mi>p</mi><mi>q</mi></msub>
                  </mrow>
                </math>
              </Formula>
              <p>{tx("P über null ist Abgabe ins Netz, P unter null ist Bezug. Δt ist 0,25 Stunden. p ist der Day-Ahead-Preis in Euro je Megawattstunde. Einheit von R: Euro. Quelle der Preise: Energy-Charts, Day-Ahead DE-LU, Bundesnetzagentur | SMARD.de, CC BY 4.0, Abruf 27.10.2026. P kommt aus dem Repo-Kern. Unsicherheit: Modell ohne Marktwirkung, Rundung ±0,5 Euro gegen den Kern. Intraday, Regelleistung, Netzentgelte, Umlagen, Steuern und Verschleiß sind nicht drin.", "P above zero is feed-in to the grid, P below zero is withdrawal. Δt is 0.25 hours. p is the day-ahead price in euro per megawatt-hour. The unit of R is euro. Price source: Energy-Charts, day-ahead DE-LU, Bundesnetzagentur | SMARD.de, CC BY 4.0, retrieved 27 October 2026. P comes from the repository core. Uncertainty: a model with no effect on the market, rounding ±0.5 euro against the core. Intraday, balancing power, grid fees, levies, taxes and wear are not included.")}</p>
              <h3>{tx("Preiswirkung und Grenze der Price-Taker-Annahme", "Price effect and the limit of the price-taker assumption")}</h3>
              <p>{tx("In den Beispieltagen auf der Startseite zeigen wir Euro-Erlös nur bei ×1 als Modellschätzung für den Beispielspeicher (103,5 MW / 238,5 MWh wie Bollingstedt). Unter /live gibt es keinen Euro-Betrag; ×1 bezeichnet dort die heutige Großspeicher-Flotte. Ab ×2, ×5 und ×10 zeigen wir keinen Euro-Wert.", "In the example days on the homepage we show euro revenue only at ×1 as a model estimate for the example battery (103.5 MW / 238.5 MWh like Bollingstedt). Under /live there is no euro figure; ×1 there means today’s large-storage fleet. From ×2, ×5 and ×10 we show no euro figure.")}</p>
              <p>{tx("Grund: Das Modell nimmt Day-Ahead-Preise unverändert an (Preisnehmer). Mehr Speicher würde in Wirklichkeit Preise und Spreads verschieben und andere Erlöse schmälern. Eine lineare Vervielfachung des ×1-Erlöses wäre deshalb irreführend. Aufnahme, Export und geladene Mengen skalieren mit dem Faktor. Die Abendspitze ändert sich mit dem Faktor, aber nicht linear (25.10.: ab ×2 bei 5,0 GW).", "Reason: the model takes day-ahead prices unchanged (price taker). More storage would in reality shift prices and spreads and erode other revenue. Multiplying the ×1 revenue linearly would therefore mislead. Absorption, export and charged energy scale with the factor. The evening peak changes with the factor, but not linearly (25 Oct: from ×2 at 5.0 GW).")}</p>
              <p>{tx("Im Datenkern existieren weiterhin skalierte Euro-Werte für Tests und den Build der Beispieltage. In der Oberfläche werden sie ab ×2 nicht gezeigt.", "In the data core, scaled euro values still exist for tests and building the example days. The UI does not show them from ×2 onward.")}</p>
              <p>{tx("Wirkungsgrad η ist die Wurzel aus 0,85, also 0,922 je Richtung. Quelle: der gemeinsame Standard, Spanne 80–90 %. Eine feste Annahme.", "Efficiency η is the square root of 0.85, so 0.922 in each direction. Source: the shared standard, range 80–90%. A fixed assumption.")}</p>
              <p>{tx("Ladezustand: der nächste Stand ist der alte Stand plus η mal Laden mal Δt, minus Abgabe mal Δt geteilt durch η. Grenzen 10 % und 90 %, Start 50 %, Ende mindestens der Start. Einheit Megawattstunden. Das ist eine Heuristik des Kerns.", "State of charge: the next level is the previous level plus η times charge times Δt, minus discharge times Δt divided by η. Limits 10% and 90%, start 50%, end at least the start. Unit: megawatt-hours. That is a heuristic of the core.")}</p>
              <p>{tx("Die Abgabe wählt der Kern nach einem Punktwert: Preis plus 0,18 mal die Tagesspanne zwischen 17 und 21 Uhr plus 0,12 mal die normierte Streuung mal die Tagesspanne. Einheit Euro je Megawattstunde. Heuristik, kein Optimum. Am 1. Mai 2026 liegen die Abgabe-Viertelstunden bei 18:45, 19:45 und 20:00, nicht bei den drei teuersten am Stück.", "The core picks discharge by a score: price plus 0.18 times the day’s spread between 17:00 and 21:00 plus 0.12 times the normalised spread times the day’s spread. Unit: euro per megawatt-hour. A heuristic, not an optimum. On 1 May 2026 the discharge quarter-hours are 18:45, 19:45 and 20:00, not the three most expensive in a row.")}</p>
              <p>{tx("Der Faktor zum mittleren Tag ist der Modellerlös geteilt durch 10.344 Euro. 10.344 Euro ist der Median der 365 Tageswerte, gerundet. Der Faktor auf der Seite ist auf eine Stelle gerundet.", "The factor versus the middle day is the model revenue divided by €10,344. €10,344 is the median of the 365 daily values, rounded. The factor on the page is rounded to one decimal place.")}</p>
              <p>{tx("Handrechnung 1. Mai 2026, ein Speicher, Modellschätzung. Laden 13:15, 13:30 und 13:45: je 103,5 MW mal 0,25 h mal 499,99 Euro je Megawattstunde = 12.937,24 Euro. 14:00 mit 103,403 MW = 12.925,16 Euro. Summe Laden 51.736,88 Euro, Geld erhalten, weil der Preis negativ ist. Abgabe 18:45 (176,26), 19:45 (232,99) und 20:00 (180,71), je 25,875 MWh: 4.560,73 + 6.028,62 + 4.675,87 = 15.265,22 Euro. Summe 67.002,10 Euro, gerundet 67.002 Euro. Bezug 103,476 MWh, gespeichert etwa 95,4 MWh, Abgabe 77,625 MWh ins Netz, Ende 54,7 %.", "Hand check, 1 May 2026, one battery, model estimate. Charging at 13:15, 13:30 and 13:45: 103.5 MW times 0.25 h times €499.99 per megawatt-hour = €12,937.24 each. 14:00 at 103.403 MW = €12,925.16. Charging total €51,736.88, money received because the price is negative. Discharge at 18:45 (€176.26), 19:45 (€232.99) and 20:00 (€180.71), 25.875 MWh each: 4,560.73 + 6,028.62 + 4,675.87 = €15,265.22. Total €67,002.10, rounded €67,002. Withdrawal 103.476 MWh, about 95.4 MWh stored, 77.625 MWh fed in, end 54.7%.")}</p>
              <p>{tx("Weitere Tage, ebenfalls Modellschätzung, auf Cent: 24. Juni 2026 ist −6.852,45 Euro Laden plus 55.555,95 Euro Abgabe = 48.703,51 Euro. 14. September 2026 ist −15.937,65 plus 55.375,61 = 39.437,95 Euro. 14. April 2026 ist −10.614,01 plus 20.957,97 = 10.343,96 Euro.", "Further days, also a model estimate, to the cent: 24 June 2026 is −€6,852.45 charging plus €55,555.95 discharging = €48,703.51. 14 September 2026 is −15,937.65 plus 55,375.61 = €39,437.95. 14 April 2026 is −10,614.01 plus 20,957.97 = €10,343.96.")}</p>
              <p>{tx("Gegenprüfung der Preise: SMARD-Chartdaten, Filter 4169, gegen Energy-Charts, alle 35.040 Viertelstunden gleich. Das ist derselbe Ursprung, Bundesnetzagentur und EPEX, also eine Prüfung der Übertragung und keine unabhängige Quelle.", "Price cross-check: SMARD chart data, filter 4169, against Energy-Charts, all 35,040 quarter-hours equal. That is the same origin, Bundesnetzagentur and EPEX, so it checks the transfer and is not an independent source.")}</p>
              <p>{tx("Am 1. Mai 2026 lag Solar nach Energy-Charts bei höchstens 48,3 GW, Wind im Mittel bei 11,1 GW. Am 24. Juni Wind im Mittel 1,7 GW. Am 14. September Solar höchstens 37,6 GW. Am 14. April Solar höchstens 27,6 GW. Die Werte sind teils vorläufig und gehen nicht in den Erlös ein.", "On 1 May 2026 solar on Energy-Charts peaked at 48.3 GW, and wind averaged 11.1 GW. On 24 June wind averaged 1.7 GW. On 14 September solar peaked at 37.6 GW. On 14 April solar peaked at 27.6 GW. The values are partly preliminary and do not enter the revenue.")}</p>
              <p>{tx("Mit perfekter Vorschau und mehreren Zyklen wäre im Modell das Zwei- bis Dreifache möglich. Der Kern rechnet bewusst vorsichtiger.", "With a perfect preview and several cycles, two to three times as much would be possible in the model. The core deliberately calculates more cautiously.")}</p>
              <h3>{tx("Was ein Profi fragt", "What a specialist asks")}</h3>
              <p>{tx("Warum nur etwa 0,35 Zyklen am Tag? Und warum liegt die Abgabe nicht bei den drei teuersten Viertelstunden? Der Kern wählt einen Teilzyklus nach einem Punktwert, Preis plus Abendzuschlag 17–21 Uhr plus Schwankung, nicht nach strengem Optimum. Das ist eine bewusste, vorsichtige Heuristik, kein Fahrplan eines echten Betreibers.", "Why only about 0.35 cycles a day? And why is discharge not in the three most expensive quarter-hours? The core picks one partial cycle by a score, price plus an evening bonus from 17:00 to 21:00 plus a swing term, not by a strict optimum. That is a deliberate, cautious heuristic, not an operator’s schedule.")}</p>
            </section>
            <SzenarienMethodik language={language} />
            <NetzMethodik language={language} />
            <section id="quellen">
              <details className="site-fold">
              <summary><h2>{tx("15 Quellen", "15 Sources")}</h2></summary>
              <ul>
                <li><a href="https://energy-charts.info/">Energy-Charts</a> · Fraunhofer ISE, CC BY 4.0</li>
                <li><a href="https://battery-charts.de/de/battery-charts-de/">Battery Charts</a> · RWTH, MaStR, CC BY 4.0</li>
                <li><a href="https://www.smard.de/">SMARD</a> · {tx("Regelzonen, CC BY 4.0", "Control areas, CC BY 4.0")}</li>
                <li><a href="https://www.bundeswirtschaftsministerium.de/Redaktion/DE/FAQ/Stromspeicher-Strategie/faq-stromspeicher-strategie.html">{tx("Bundeswirtschaftsministerium · Stromspeicher-Strategie", "Federal Ministry for Economic Affairs · storage strategy")}</a></li>
                <li><a href="https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html">BGH · PM 129/2025</a></li>
                <li><a href={REFERENCE_PARK.mastrUnits[0].href}>MaStR {REFERENCE_PARK.mastrUnits[0].seeId}</a> · <a href={REFERENCE_PARK.mastrUnits[1].href}>MaStR {REFERENCE_PARK.mastrUnits[1].seeId}</a> · <a href={REFERENCE_PARK.sources[2].href}>ECO STOR</a> · <a href={REFERENCE_PARK.sources[3].href}>SH Netz</a></li>
                <li><a href="https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Umwelt/UGR/private-haushalte/Tabellen/stromverbrauch-haushalte.html">Destatis</a> · {tx("Haushaltsstrom, Stand 27. September 2023", "Household electricity, as of 27 September 2023")}</li>
                <li><a href="https://doi.org/10.3390/en13123290">Meinecke et al. 2020, SimBench</a> · {tx("Open Access, CC BY, MDPI", "Open access, CC BY, MDPI")}</li>
                <li><a href="https://doi.org/10.1109/TPWRS.2018.2829021">Thurner et al. 2018, pandapower</a> · BSD-3-Clause</li>
                <li><a href="https://doi.org/10.34890/752">Meinecke et al., CIRED 2019</a></li>
                <li><a href="https://simbench.de">SimBench</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> · {tx("Universität Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE", "University of Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE")}</li>
              </ul>
              <p>{tx(`Beispiel-Supermarkt und Beispiel-Quartier sind fiktiv und als Beispieldaten markiert. Bollingstedt zeigt die veröffentlichten Eckdaten. Der Tagesverlauf, wenn er gezeigt wird, ist ein Modelltag und nicht die echte Fahrweise. ${EURO_SCOPE.de} Kein Angebot, keine Anschlusszusage.`, `The example supermarket and the example neighbourhood are fictional and marked as example data. Bollingstedt shows the published key figures. The daily profile, when one is shown, is a model day and not the real operation. ${EURO_SCOPE.en} Not a quote and not a connection offer.`)}</p>
              </details>
              <details className="site-fold" id="glossar">
              <summary><h3>{tx("Glossar", "Glossary")}</h3></summary>
              <dl>
                {GLOSSARY.map((entry) => (
                  <div key={entry.id}>
                    <dt id={`begriff-${entry.id}`}>{language === "de" ? entry.term.de : entry.term.en}</dt>
                    <dd>{language === "de" ? entry.text.de : entry.text.en}</dd>
                  </div>
                ))}
              </dl>
              </details>
              <p><Link href="/site?view=netz">{tx("Zum Standort", "To the site")}</Link></p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}

function Formula({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="methodik-formula">
      {children}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function Phase({ label, highlight }: { label: string; highlight: "midday" | "evening" | null }) {
  return (
    <figure>
      <DayRing
        points={PHASE_POINTS}
        label={label}
        description={label}
        highlight={highlight}
        showShift={false}
        showHourTicks={false}
        chargedGwh={0}
      />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function Gauge({ pct, label }: { pct: number; label: string }) {
  const sweep = Math.min(300, (pct / 130) * 300);
  return (
    <figure>
      <svg viewBox="-60 -60 120 120" width="120" height="120" role="img" aria-label={`${pct} %, ${label}`}>
        <path d={arc(48, 200, 200 + 300)} fill="none" stroke="#C5CED6" strokeWidth="8" />
        <path d={arc(48, 200, 200 + sweep)} fill="none" stroke="#1E9CB0" strokeWidth="8" />
        <path d={arc(48, 200 + (100 / 130) * 300 - 1, 200 + (100 / 130) * 300 + 1)} fill="none" stroke="#FF5A4E" strokeWidth="8" />
        <text x="0" y="6" textAnchor="middle" fontSize="16" fontFamily="var(--font-plex-mono), monospace" fill="currentColor">{pct}%</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function arc(radius: number, startDeg: number, endDeg: number) {
  const p = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [radius * Math.sin(rad), -radius * Math.cos(rad)];
  };
  const [x1, y1] = p(startDeg);
  const [x2, y2] = p(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${r2(x1)} ${r2(y1)} A ${r2(radius)} ${r2(radius)} 0 ${large} 1 ${r2(x2)} ${r2(y2)}`;
}

/** Hundredths, so the methodik scale paths match between the server and the browser. */
function r2(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/** One synthetic surplus day. Laden, Halten and Abgeben are the same ring with a different highlight. */
const PHASE_POINTS: LiveDispatchPoint[] = Array.from({ length: 96 }, (_, index) => {
  const hour = index / 4;
  const night = 20;
  const midday = -8;
  const evening = 36;
  let ohne = night;
  if (hour >= 6 && hour < 10) {
    ohne = night + ((midday - night) * (hour - 6)) / 4;
  } else if (hour >= 10 && hour < 15) {
    ohne = midday;
  } else if (hour >= 15 && hour < 18) {
    ohne = midday + ((evening - midday) * (hour - 15)) / 3;
  } else if (hour >= 18 && hour < 22) {
    ohne = evening;
  } else if (hour >= 22) {
    ohne = evening + ((night - evening) * (hour - 22)) / 2;
  }
  const charging = hour >= 10 && hour < 15;
  const discharging = hour >= 17 && hour < 22;
  const soc = hour < 10 ? 0.12 : hour < 15 ? 0.12 + (0.7 * (hour - 10)) / 5 : hour < 17 ? 0.82 : hour < 22 ? 0.82 - (0.55 * (hour - 17)) / 5 : 0.27;
  const chargeMw = charging ? 500 : 0;
  const dischargeMw = discharging ? 420 : 0;
  return {
    hour,
    ohneMw: ohne * 1000,
    mitMw: ohne * 1000 + chargeMw - dischargeMw,
    chargeMw,
    dischargeMw,
    soc,
  };
});

/** Same shape as the national miniature, drawn in kilowatts around a 90 kW line. Not a measured site. */
const KW_MINI: LiveDispatchPoint[] = PHASE_POINTS.map((point) => {
  const kw = 55 + point.ohneMw / 1000;
  return { ...point, ohneMw: kw, mitMw: kw, chargeMw: 0, dischargeMw: 0 };
});
