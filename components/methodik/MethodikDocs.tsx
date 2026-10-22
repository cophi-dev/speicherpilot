"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import { DayRing } from "@/components/day-ring/DayRing";
import { useLanguage } from "@/components/language-context";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { FLOWER_BERGEDORF } from "@/lib/flowerBergedorf";
import { GLOSSARY } from "@/lib/glossary";
import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";

function sourceHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function sources(language: "de" | "en") {
  const de = language === "de";
  const flower = FLOWER_BERGEDORF.sources[0];
  const magazine = FLOWER_BERGEDORF.sources[1];
  return [
    {
      publisher: "Fraunhofer ISE",
      title: "Energy-Charts",
      meta: "CC BY 4.0",
      href: "https://energy-charts.info/",
    },
    {
      publisher: "RWTH Aachen",
      title: "Battery Charts, Marktstammdatenregister",
      meta: "CC BY 4.0",
      href: "https://battery-charts.de/de/battery-charts-de/",
    },
    {
      publisher: "Bundesnetzagentur",
      title: "SMARD",
      meta: de ? "Regelzonen, CC BY 4.0" : "Control areas, CC BY 4.0",
      href: "https://www.smard.de/",
    },
    {
      publisher: de ? "Bundeswirtschaftsministerium" : "Federal Ministry for Economic Affairs",
      title: de ? "Stromspeicher-Strategie" : "Electricity storage strategy",
      meta: de ? "FAQ der Strategie" : "Strategy FAQ",
      href: "https://www.bundeswirtschaftsministerium.de/Redaktion/DE/FAQ/Stromspeicher-Strategie/faq-stromspeicher-strategie.html",
    },
    {
      publisher: "Bundesgerichtshof",
      title: de ? "Pressemitteilung 129/2025, EnVR 1/24" : "Press release 129/2025, EnVR 1/24",
      meta: de ? "15.07.2025 · Abruf 21.10.2026" : "15 July 2025 · retrieved 21 October 2026",
      href: "https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html",
    },
    {
      publisher: flower.publisher,
      title: de ? "Baubeginn des Speichers in Hamburg" : "Construction start of the Hamburg storage system",
      meta: "10.09.2026",
      href: flower.href,
    },
    {
      publisher: magazine.publisher,
      title: de ? "Spatenstich für den Speicher in Hamburg" : "Groundbreaking for the Hamburg storage system",
      meta: "10.09.2026",
      href: magazine.href,
    },
    {
      publisher: "Destatis",
      title: de ? "Stromverbrauch der privaten Haushalte" : "Household electricity use",
      meta: de ? "Stand 27.09.2023" : "As of 27 September 2023",
      href: "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Umwelt/UGR/private-haushalte/Tabellen/stromverbrauch-haushalte.html",
    },
  ];
}

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
            <section id="was">
              <h2>{tx("01 Was gerechnet wird", "01 What is calculated")}</h2>
              <p>{tx("Zwei Sichten, ein Kern. Der Projektierer sieht Größe, Zyklen und die abgegebene Energie eines Tages. Der Netzbetreiber sieht Kilowatt am Anschluss, die Ampel und die Einschätzung netzdienlich.", "Two views, one core. The developer sees size, cycles and the energy delivered on one day. The grid operator sees kilowatts at the connection, the traffic light and the grid-support estimate.")}</p>
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
                  <tr><td>{tx("Wirkungsgrad, live", "Efficiency, live")}</td><td>{tx("0,90 auf der Abgabe", "0.90 on discharge")}</td><td>{tx("Wirkungsgrad der Live-Rechnung, nur bei der Abgabe", "Efficiency of the live calculation, only on discharge")}</td></tr>
                  <tr><td>{tx("Wirkungsgrad, Standort", "Efficiency, site")}</td><td>{tx("Wurzel aus dem Wirkungsgrad je Richtung", "Square root of the round-trip efficiency, each way")}</td><td>{tx("Standort-Rechnung", "Site calculation")}</td></tr>
                </tbody>
              </table></div>
              <p>{tx("Eine nationale Reihe heißt Deutschland. Sie wird nicht als Hamburg oder als Norden beschriftet. 50Hertz ist die Regelzone, nicht die Stadt. TransnetBW zeigt, dass im Norden mehr Wind steht als im Süden, und ist kein Engpass.", "A national series is called Germany. It is not labelled as Hamburg or as the north. 50Hertz is the control area, not the city. TransnetBW shows that the north has more wind than the south, and is not a congestion.")}</p>
            </section>
            <section id="grossspeicher">
              <h2>{tx("03 Großspeicher-Modell", "03 Large-storage model")}</h2>
              <div className="methodik-phases" aria-hidden="true">
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
                    <mi mathvariant="normal">Δ</mi><mi>t</mi>
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
                    <mi mathvariant="normal">η</mi>
                    <mo>,</mo>
                    <mi mathvariant="normal">η</mi>
                    <mo>=</mo>
                    <mn>0,9</mn>
                  </mrow>
                </math>
              </Formula>
              <p>{tx("Geladen wird nur vor 17 Uhr und nur aus Überschuss, bis Leistung und freier Inhalt begrenzt sind. Der Wirkungsgrad 0,90 gilt auf der Abgabe. Der Standort-Rechner teilt denselben Wirkungsgrad anders auf: dort gilt die Wurzel aus dem Wirkungsgrad auf dem Weg hinein und auf dem Weg hinaus. Die beiden Modelle werden nicht vermischt.", "Charging happens only before 17:00 and only from surplus, limited by power and free capacity. The efficiency is 0.90 on discharge. The site calculator splits the same round-trip efficiency differently: the square root applies on the way in and on the way out. The two models are not mixed.")}</p>
              <p>{tx("Die Stromspeicher-Strategie setzt kein Mengenziel für Speicher. ×1 ist der registrierte Bestand, keine Zielstufe.", "The electricity-storage strategy sets no quantity target for storage. ×1 is the registered stock, not a target step.")}</p>
            </section>
            <section id="groesse">
              <h2>{tx("04 Speichergröße", "04 Storage size")}</h2>
              <Formula label={tx("Leistung aus dem höchsten Tagesüberschuss", "Power from a day’s highest excess")}>
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
                      <mrow><msub><mi mathvariant="normal">η</mi><mtext>dis</mtext></msub><mo>·</mo><mn>0,85</mn></mrow>
                    </mfrac>
                    <mo>,</mo>
                    <msub><mi mathvariant="normal">η</mi><mtext>dis</mtext></msub>
                    <mo>=</mo>
                    <msqrt><mtext>RTE</mtext></msqrt>
                  </mrow>
                </math>
              </Formula>
              <p>{tx("Die Tagesleistung ist der höchste Überschuss eines Tages, die Überschussenergie die Summe dieses Tages. Das 95-Prozent-Maß darüber lässt die härtesten 5 % der Tage über der Grenze. Das ist Absicht. 0,85 ist der nutzbare Anteil zwischen 10 % und 95 % Füllstand. Im Beispiel-Supermarkt ist der Wirkungsgrad 0,9, also die Wurzel daraus je Richtung. Die Handwerte 40 kW und 40 kWh umgehen diese Formel, weil die Größe dort fest vorgegeben ist.", "Daily power is a day’s highest excess, and the excess energy is that day’s sum. The 95 percent measure across those days leaves the hardest 5% above the limit. That is intentional. 0.85 is the usable share between 10% and 95% state of charge. In the supermarket example the round-trip efficiency is 0.9, so each direction uses its square root. The hand values 40 kW and 40 kWh bypass this formula, because the size is fixed there.")}</p>
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
              <p>{tx(`Regel v1. Ein Intervall zählt als Spitze, wenn die Standortlast mindestens ${Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100)} % der Anschlussleistung erreicht. Einschätzung netzdienlich ab ${Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100)} % der Entladeenergie in diesen Intervallen und ohne neue Bezugsspitze. Darunter bis ${Math.round(GRID_SUPPORT_CONFIG.mixedMinShare * 100)} % heißt die Schätzung gemischt, darunter marktgetrieben. Eine neue Spitze liegt vor, sobald ein Ladeintervall die Bezugsspitze über die Spitze ohne Speicher hebt. Die Schwellen sind vorläufig.`, `Rule v1. An interval counts as a peak when site load reaches at least ${Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100)}% of the connection. The estimate is grid-supportive from ${Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100)}% of discharge energy in those intervals and only without a new import peak. Down to ${Math.round(GRID_SUPPORT_CONFIG.mixedMinShare * 100)}% the estimate is mixed, and below that market-driven. A new peak exists as soon as a charging interval lifts the import above the peak without storage. The thresholds are provisional.`)}</p>
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
              <details className="site-fold">
              <summary><h2>{tx("07 Quellen", "07 Sources")}</h2></summary>
              <ol className="methodik-sources">
                {sources(language).map((source) => (
                  <li key={source.href}>
                    <p className="src-pub">{source.publisher}</p>
                    <p className="src-title">{source.title}</p>
                    <p className="src-meta">{source.meta}</p>
                    <a href={source.href} target="_blank" rel="noopener noreferrer">
                      {sourceHost(source.href)} <span aria-hidden="true">↗</span>
                      <span className="sr-only">{tx(" (öffnet in neuem Tab)", " (opens in a new tab)")}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <p>{tx("Beispiel-Supermarkt und Beispiel-Quartier sind fiktiv und als Beispieldaten markiert. Flower zeigt nur veröffentlichte Eckdaten. Euro-Beträge sind Modellschätzungen mit Beispielannahmen (z. B. Leistungspreis 120 €/kW·a) und als solche gekennzeichnet. Kein Angebot, keine Anschlusszusage.", "The example supermarket and the example neighbourhood are fictional and marked as example data. Flower shows only published key figures. Euro amounts are model estimates with example assumptions (for example a demand charge of 120 €/kW·a) and are labelled as such. Not a quote and not a connection offer.")}</p>
              </details>
              <details className="site-fold" id="glossar">
              <summary><h3>{tx("Glossar", "Glossary")}</h3></summary>
              <dl className="methodik-glossary">
                {[...GLOSSARY].sort((a, b) => (language === "de" ? a.term.de : a.term.en).localeCompare(language === "de" ? b.term.de : b.term.en, language === "de" ? "de" : "en")).map((entry) => (
                  <div key={entry.id} id={`begriff-${entry.id}`}>
                    <dt>{language === "de" ? entry.term.de : entry.term.en}</dt>
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
