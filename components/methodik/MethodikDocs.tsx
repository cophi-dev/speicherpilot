"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyRing } from "@/components/day-ring/EmptyRing";
import { useLanguage } from "@/components/language-context";
import { FLOWER_BERGEDORF } from "@/lib/flowerBergedorf";
import { GLOSSARY } from "@/lib/glossary";
import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";

const CHAPTERS = [
  { id: "was", de: "Was gerechnet wird", en: "What is calculated" },
  { id: "einheiten", de: "Daten und Einheiten", en: "Data and units" },
  { id: "grossspeicher", de: "Großspeicher-Modell", en: "Large-storage model" },
  { id: "groesse", de: "Speichergröße", en: "Storage size" },
  { id: "ampel", de: "Anschluss-Ampel", en: "Connection light" },
  { id: "netzdienlichkeit", de: "Einschätzung netzdienlich", en: "Grid-support estimate" },
  { id: "quellen", de: "Quellen", en: "Sources" },
] as const;

export function MethodikDocs() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div className="methodik">
      <section className="day-hero methodik-hero" aria-labelledby="methodik-title">
        <div className="day-hero-inner">
          <p className="day-kicker">{tx("Methodik · Referenz", "Method · reference")}</p>
          <h1 id="methodik-title">{tx("Jede Zahl auf SpeicherPilot lässt sich hier nachrechnen.", "Every figure on SpeicherPilot can be recomputed here.")}</h1>
          <div className="methodik-scales">
            <figure>
              <ScaleRing mode="gw" />
              <figcaption>{tx("Netz Deutschland · GW", "Germany grid · GW")}</figcaption>
            </figure>
            <figure>
              <ScaleRing mode="kw" />
              <figcaption>{tx("Standort · kW", "Site · kW")}</figcaption>
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
            <section id="was">
              <h2>{tx("01 Was gerechnet wird", "01 What is calculated")}</h2>
              <p>{tx("Zwei Sichten, ein Kern. Der Projektierer sieht Größe, Zyklen und die abgegebene Energie eines Tages. Der Netzbetreiber sieht Kilowatt am Anschluss, die Ampel und die Einschätzung netzdienlich. Keine Zahl steht in beiden Helden.", "Two views, one core. The developer sees size, cycles and the energy delivered on one day. The grid operator sees kilowatts at the connection, the traffic light and the grid-support estimate. No figure appears in both heroes.")}</p>
              <p>{tx("Die nationale Uhr auf /live und der Startseite ist die Residuallast Deutschlands in Polarform. Der Standort-Ring ist dieselbe Form in Kilowatt. Die GW-Skala kommt auf /site nicht vor.", "The national clock on /live and the homepage is Germany’s residual load in polar form. The site ring is the same form in kilowatts. The GW scale does not appear on /site.")}</p>
            </section>
            <section id="einheiten">
              <h2>{tx("02 Daten und Einheiten", "02 Data and units")}</h2>
              <div className="methodik-table"><table>
                <thead>
                  <tr><th>{tx("Größe", "Quantity")}</th><th>{tx("Einheit", "Unit")}</th><th>{tx("Quelle", "Source")}</th></tr>
                </thead>
                <tbody>
                  <tr><td>{tx("Residuallast", "Residual load")}</td><td>{tx("MW, in der Uhr GW", "MW, and GW on the clock")}</td><td>{tx("Energy-Charts, Last − Wind − Sonne", "Energy-Charts, load − wind − solar")}</td></tr>
                  <tr><td>{tx("Großspeicher", "Large storage")}</td><td>MW, MWh</td><td>battery-charts.de aus dem MaStR</td></tr>
                  <tr><td>{tx("Anschluss", "Connection")}</td><td>kW</td><td>{tx("Eingabe oder Beispiel", "Input or example")}</td></tr>
                  <tr><td>{tx("Wirkungsgrad, live", "Efficiency, live")}</td><td>0,90 auf der Abgabe</td><td>MORE_STORAGE_ROUND_TRIP</td></tr>
                  <tr><td>{tx("Wirkungsgrad, Standort", "Efficiency, site")}</td><td>√RTE je Richtung</td><td>planSite / sizeStorage</td></tr>
                </tbody>
              </table></div>
              <p>{tx("Eine nationale Reihe heißt Deutschland. Sie wird nicht als Hamburg oder als Norden beschriftet. 50Hertz ist die Regelzone, nicht die Stadt. TransnetBW zeigt, dass im Norden mehr Wind steht als im Süden, und ist kein Engpass.", "A national series is called Germany. It is not labelled as Hamburg or as the north. 50Hertz is the control area, not the city. TransnetBW shows that the north has more wind than the south, and is not a congestion.")}</p>
            </section>
            <section id="grossspeicher">
              <h2>{tx("03 Großspeicher-Modell", "03 Large-storage model")}</h2>
              <div className="methodik-phases" aria-hidden="true">
                <Phase label={tx("Laden", "Charge")} />
                <Phase label={tx("Halten", "Hold")} />
                <Phase label={tx("Abgeben", "Discharge")} />
              </div>
              <Formula label={tx("Geladene Energie vor 17 Uhr", "Energy charged before 17:00")}>
                <math display="block">
                  <mtable>
                    <mtr>
                      <mtd><msub><mi>E</mi><mtext>geladen</mtext></msub></mtd>
                      <mtd><mo>=</mo></mtd>
                      <mtd><mrow><mo>∑</mo><msub><mi>t</mi><mn>17</mn></msub></mrow></mtd>
                    </mtr>
                    <mtr>
                      <mtd></mtd>
                      <mtd></mtd>
                      <mtd><mrow><mo>min</mo><mo>(</mo><mi>Ü</mi><mo>,</mo><mi>P</mi><mo>,</mo><mi>Raum</mi><mo>)</mo><mo>·</mo><mn>0,25 h</mn></mrow></mtd>
                    </mtr>
                  </mtable>
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
                    <mn>0,9</mn>
                  </mrow>
                </math>
              </Formula>
              <p>{tx("Das ist dispatchPeakFleet. Geladen wird nur vor 17 Uhr und nur aus Überschuss, bis Leistung und freier Inhalt begrenzt sind. η = 0,9 steht in MORE_STORAGE_ROUND_TRIP und wird erst bei der Abgabe angewendet. Der Standort-Rechner teilt denselben Wirkungsgrad anders auf: dort ist η_dis = √RTE auf dem Weg hinein und auf dem Weg hinaus. Die beiden Modelle werden nicht vermischt.", "That is dispatchPeakFleet. Charging happens only before 17:00 and only from surplus, limited by power and free capacity. η = 0.9 lives in MORE_STORAGE_ROUND_TRIP and is applied only on discharge. The site calculator splits the same round-trip efficiency differently: there η_dis = √RTE on the way in and on the way out. The two models are not mixed.")}</p>
              <p>{tx("Die Stromspeicher-Strategie setzt kein Mengenziel für Speicher. ×1 ist der registrierte Bestand, keine Zielstufe.", "The electricity-storage strategy sets no quantity target for storage. ×1 is the registered stock, not a target step.")}</p>
            </section>
            <section id="groesse">
              <h2>{tx("04 Speichergröße", "04 Storage size")}</h2>
              <Formula label="sizeStorage">
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
              <p>{tx("P_Tag ist der höchste Überschuss eines Tages, E_Überschuss die Summe dieses Tages. P95 darüber lässt die härtesten 5 % der Tage über der Grenze. Das ist Absicht. 0,85 ist SOC_MAX − SOC_MIN, also 0,95 − 0,10. Im Beispiel-Supermarkt ist RTE = 0,9, also η_dis = √0,9. Die Handwerte 40 kW und 40 kWh umgehen diese Formel, weil autoSize dort aus ist.", "P_day is a day’s highest excess, and E_excess is that day’s sum. P95 across those days leaves the hardest 5% above the limit. That is intentional. 0.85 is SOC_MAX − SOC_MIN, that is 0.95 − 0.10. In the supermarket example RTE = 0.9, so η_dis = √0.9. The hand values 40 kW and 40 kWh bypass this formula, because autoSize is off there.")}</p>
            </section>
            <section id="ampel">
              <h2>{tx("05 Anschluss-Ampel", "05 Connection light")}</h2>
              <div className="methodik-gauges">
                <Gauge pct={70} label={tx("passt", "fits")} />
                <Gauge pct={95} label={tx("knapp", "tight")} />
                <Gauge pct={120} label={tx("passt nicht", "does not fit")} />
              </div>
              <p>{tx("Unter 90 % der Anschlussleistung passt es. Ab 90 % bis zur Grenze ist es knapp. Darüber passt es nicht. Fehlt die Anschlussleistung, bleibt der Punkt grau und es gibt keine rote Linie. Die Farbe steht nie allein: der Text nennt den Zustand.", "Below 90% of the connection it fits. From 90% up to the limit it is tight. Above that it does not fit. If the connection capacity is missing, the dot stays grey and there is no red line. Colour never stands alone: the text names the state.")}</p>
            </section>
            <section id="netzdienlichkeit">
              <h2>{tx("06 Einschätzung netzdienlich", "06 Grid-support estimate")}</h2>
              <p>{tx(`Regel v1. Ein Intervall zählt als Spitze, wenn die Standortlast mindestens ${Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100)} % der Anschlussleistung erreicht. Einschätzung netzdienlich ab ${Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100)} % der Entladeenergie in diesen Intervallen und ohne neue Bezugsspitze. Darunter bis ${Math.round(GRID_SUPPORT_CONFIG.mixedMinShare * 100)} % heißt die Schätzung gemischt, darunter marktgetrieben. Eine neue Spitze liegt vor, sobald ein Ladeintervall die Bezugsspitze über die Spitze ohne Speicher hebt. Die Schwellen stehen nur in GRID_SUPPORT_CONFIG und sind vorläufig.`, `Rule v1. An interval counts as a peak when site load reaches at least ${Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100)}% of the connection. The estimate is grid-supportive from ${Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100)}% of discharge energy in those intervals and only without a new import peak. Down to ${Math.round(GRID_SUPPORT_CONFIG.mixedMinShare * 100)}% the estimate is mixed, and below that market-driven. A new peak exists as soon as a charging interval lifts the import above the peak without storage. The thresholds live only in GRID_SUPPORT_CONFIG and are provisional.`)}</p>
              <p>{tx("Die Marke heißt netzdienlich v1 · Einschätzung, kein Befund. Die Schrift bleibt neutral, ohne Grün und ohne Rot.", "The badge reads grid-supportive v1 · estimate, not a finding. The type stays neutral, with no green and no red.")}</p>
              <blockquote>
                <p>{tx("Ob netzdienlicher Speicherbetrieb im örtlichen Verteilnetz Netzausbau vermeidet, kann nur der Netzbetreiber beurteilen; ihm steht dabei ein Entscheidungsspielraum zu. Die Bundesnetzagentur durfte ihre Vorgaben (Positionspapier 2009, Leistungspreismodell) als angemessen ansehen.", "Whether grid-supportive storage operation avoids network expansion in the local distribution network can only be judged by the network operator; that operator has a margin of decision. The Federal Network Agency was entitled to regard its requirements (2009 position paper, capacity-price model) as appropriate.")}</p>
                <p>
                  <a href="https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html">{tx("BGH, Beschluss vom 15.07.2025, EnVR 1/24, Pressemitteilung 129/2025", "BGH, decision of 15 July 2025, EnVR 1/24, press release 129/2025")}</a>
                  {tx(". Stand 21.10.2026.", ". As of 21 October 2026.")}
                </p>
              </blockquote>
            </section>
            <section id="quellen">
              <h2>{tx("07 Quellen", "07 Sources")}</h2>
              <ul>
                <li><a href="https://energy-charts.info/">Energy-Charts</a> · Fraunhofer ISE, CC BY 4.0</li>
                <li><a href="https://battery-charts.de/de/battery-charts-de/">Battery Charts</a> · RWTH, MaStR, CC BY 4.0</li>
                <li><a href="https://www.smard.de/">SMARD</a> · {tx("Regelzonen, CC BY 4.0", "Control areas, CC BY 4.0")}</li>
                <li><a href="https://www.bundeswirtschaftsministerium.de/Redaktion/DE/FAQ/Stromspeicher-Strategie/faq-stromspeicher-strategie.html">{tx("Bundeswirtschaftsministerium · Stromspeicher-Strategie", "Federal Ministry for Economic Affairs · storage strategy")}</a></li>
                <li><a href="https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html">BGH · PM 129/2025</a></li>
                <li><a href={FLOWER_BERGEDORF.sources[0].href}>Flower</a> · <a href={FLOWER_BERGEDORF.sources[1].href}>pv magazine</a></li>
                <li><a href="https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Umwelt/UGR/private-haushalte/Tabellen/stromverbrauch-haushalte.html">Destatis</a> · {tx("Haushaltsstrom, Stand 27. September 2023", "Household electricity, as of 27 September 2023")}</li>
              </ul>
              <p>{tx("Beispiel-Supermarkt und Beispiel-Quartier sind fiktiv und als Beispieldaten markiert. Flower zeigt nur veröffentlichte Eckdaten. Euro-Beträge stehen nur im aufklappbaren Annahmen-Block und dort als Modellschätzung. Kein Angebot, keine Anschlusszusage.", "The example supermarket and the example neighbourhood are fictional and marked as example data. Flower shows only published key figures. Euro amounts appear only in the collapsible assumptions block, and there as a model estimate. Not a quote and not a connection offer.")}</p>
              <h3>{tx("Glossar", "Glossary")}</h3>
              <dl>
                {GLOSSARY.map((entry) => (
                  <div key={entry.id}>
                    <dt>{language === "de" ? entry.term.de : entry.term.en}</dt>
                    <dd>{language === "de" ? entry.text.de : entry.text.en}</dd>
                  </div>
                ))}
              </dl>
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

function ScaleRing({ mode }: { mode: "gw" | "kw" }) {
  const colors = mode === "gw"
    ? ["#9BF6E6", "#1E9CB0", "#2F6FC0", "#5E62C8", "#F2A25C", "#FF6655"]
    : ["#9BF6E6", "#2CC8B8", "#1E9CB0", "#2F6FC0", "#5E62C8", "#F2A25C", "#FF6655", "#E0364A"];
  const span = 358 / colors.length;
  return (
    <svg viewBox="-80 -80 160 160" width="160" height="160" aria-hidden="true">
      {colors.map((color, index) => {
        const start = 1 + index * span;
        const end = start + span - 1;
        return <path key={color} d={sector(52, 74, start, end)} fill={color} />;
      })}
      <circle cx="0" cy="0" r="52" fill="none" stroke="#C5CED6" strokeDasharray="3 4" />
    </svg>
  );
}

function Phase({ label }: { label: string }) {
  return (
    <figure>
      <EmptyRing label={label} />
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

function sector(inner: number, outer: number, startDeg: number, endDeg: number) {
  const p = (radius: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [radius * Math.sin(rad), -radius * Math.cos(rad)];
  };
  const [x1, y1] = p(outer, startDeg);
  const [x2, y2] = p(outer, endDeg);
  const [x3, y3] = p(inner, endDeg);
  const [x4, y4] = p(inner, startDeg);
  return `M ${x1} ${y1} A ${outer} ${outer} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 0 0 ${x4} ${y4} Z`;
}

function arc(radius: number, startDeg: number, endDeg: number) {
  const p = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [radius * Math.sin(rad), -radius * Math.cos(rad)];
  };
  const [x1, y1] = p(startDeg);
  const [x2, y2] = p(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}
