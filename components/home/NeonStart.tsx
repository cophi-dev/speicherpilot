import Link from "next/link";

import type { CompleteTagPageModel } from "@/lib/tagPageProps.server";

import { NeonDayChart } from "./NeonDayChart";
import styles from "./neonStart.module.css";

interface NeonStartProps {
  readonly model: CompleteTagPageModel;
}

const fmtOneDecimal = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fmtTwoDecimals = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDayKeyDe(dayKey: string): string {
  const parts = dayKey.split("-");
  if (parts.length !== 3) {
    return dayKey;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dayKey;
  }
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekdayRaw = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    timeZone: "UTC",
  }).format(utcDate);
  const weekday = weekdayRaw.replace(/\.$/, "");
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${weekday}, ${dd}.${mm}.${year}`;
}

function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function NeonStart({ model }: NeonStartProps) {
  const slots = Array.isArray(model.day?.slots) ? model.day.slots : [];
  const preise = Array.isArray(model.preisTag) ? model.preisTag : [];
  const formattedDate = formatDayKeyDe(model.dayKey);

  let maxRestGw: number | null = null;
  let maxRestHm = "";
  let minRestGw: number | null = null;
  let minRestHm = "";

  for (const slot of slots) {
    const restGw = (slot.loadMw - slot.windMw - slot.solarMw) / 1000;
    if (!Number.isFinite(restGw)) {
      continue;
    }
    if (maxRestGw === null || restGw > maxRestGw) {
      maxRestGw = restGw;
      maxRestHm = formatHm(slot.hourBerlin, slot.minuteBerlin);
    }
    if (minRestGw === null || restGw < minRestGw) {
      minRestGw = restGw;
      minRestHm = formatHm(slot.hourBerlin, slot.minuteBerlin);
    }
  }

  let minPrice: { readonly eurPerMwh: number; readonly hm: string } | null = null;
  let maxPrice: { readonly eurPerMwh: number; readonly hm: string } | null = null;

  for (const item of preise) {
    if (!Number.isFinite(item.eurPerMwh)) {
      continue;
    }
    if (minPrice === null || item.eurPerMwh < minPrice.eurPerMwh) {
      minPrice = { eurPerMwh: item.eurPerMwh, hm: item.hm };
    }
    if (maxPrice === null || item.eurPerMwh > maxPrice.eurPerMwh) {
      maxPrice = { eurPerMwh: item.eurPerMwh, hm: item.hm };
    }
  }

  return (
    <div className={styles.page}>
      {/* ==================== 1. HERO ==================== */}
      <section className={`${styles.section} ${styles.heroSection}`} aria-labelledby="neon-hero-title">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>
                <span className={styles.kickerDot} aria-hidden="true" />
                Strommarkt &amp; Stromnetz · Öffentliche Daten
              </p>
              <h1 id="neon-hero-title" className={styles.heroTitle}>
                Fahrweise schlägt Größe.
              </h1>
              <p className={styles.heroLead}>
                Im Oktober-2026-Modell erzeugt reines Laden nach Preis ab etwa der 3,9-fachen Flotte
                eine neue Monatsspitze der bundesweiten Restlast.
              </p>

              <div className={styles.heroActions}>
                <Link href="/kompromiss" className={styles.btnPrimary}>
                  Kompromiss ausprobieren
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/knoten" className={styles.btnSecondary}>
                  Knoten ansehen
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <p className={styles.heroMeta}>
                Modell Oktober 2026, doppelte Flotte (×2), perfekte Voraussicht · Energy-Charts,
                SMARD, Battery Charts
              </p>
            </div>

            <aside className={styles.proofCard} aria-label="Kompromiss-Beweis Oktober-2026-Modell">
              <div className={styles.proofHeader}>
                <span className={styles.proofHeaderLabel}>
                  Kompromiss-Beweis · Modell Oktober 2026, doppelte Flotte (×2), perfekte Voraussicht
                </span>
              </div>

              <div className={styles.proofBody}>
                <div className={styles.proofBigRow}>
                  <div className={styles.proofMetric}>
                    <span className={`${styles.proofValue} ${styles.proofValueAccent} ${styles.num}`}>
                      70{"\u00a0"}%
                    </span>
                    <span className={styles.proofUnit}>
                      der möglichen Spitzensenkung (2,51 von 3,59{"\u00a0"}GW)
                    </span>
                  </div>
                  <div className={styles.proofMetric}>
                    <span className={`${styles.proofValue} ${styles.num}`}>
                      0,36{"\u00a0"}%
                    </span>
                    <span className={styles.proofUnit}>
                      weniger Day-Ahead-Erlös (Modell)
                    </span>
                  </div>
                </div>

                <p className={styles.proofSentence}>
                  70{"\u00a0"}% der möglichen Spitzensenkung (2,51 von 3,59{"\u00a0"}GW) für 0,36
                  {"\u00a0"}% weniger Day-Ahead-Erlös (Modell) – bezogen auf die bundesweite
                  Restlast-Spitze.
                </p>

                <div className={styles.barList}>
                  <div className={styles.barItem}>
                    <div className={styles.barHead}>
                      <span className={styles.barName}>Preisfahren allein</span>
                      <span className={`${styles.barNumbers} ${styles.num}`}>
                        −0,37{"\u00a0"}GW · 100,00{"\u00a0"}% Day-Ahead-Erlös (Modell)
                      </span>
                    </div>
                    <div className={styles.barTrack} aria-hidden="true">
                      <div className={`${styles.barFill} ${styles.barFillCoral}`} style={{ width: "10.3%" }} />
                    </div>
                  </div>

                  <div className={`${styles.barItem} ${styles.barItemHighlight}`}>
                    <div className={styles.barHead}>
                      <span className={styles.barName}>Kompromiss (knapp 7× so viel Senkung)</span>
                      <span className={`${styles.barNumbers} ${styles.num}`}>
                        −2,51{"\u00a0"}GW · 99,64{"\u00a0"}% Day-Ahead-Erlös (Modell)
                      </span>
                    </div>
                    <div className={styles.barTrack} aria-hidden="true">
                      <div className={`${styles.barFill} ${styles.barFillWarm}`} style={{ width: "69.9%" }} />
                    </div>
                  </div>

                  <div className={styles.barItem}>
                    <div className={styles.barHead}>
                      <span className={styles.barName}>Spitze zuerst</span>
                      <span className={`${styles.barNumbers} ${styles.num}`}>
                        −3,59{"\u00a0"}GW · 99,11{"\u00a0"}% Day-Ahead-Erlös (Modell)
                      </span>
                    </div>
                    <div className={styles.barTrack} aria-hidden="true">
                      <div className={`${styles.barFill} ${styles.barFillMint}`} style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.proofFoot}>
                Gemessene bundesweite Restlast-Spitze Oktober 2026: 64,41{"\u00a0"}GW · national,
                ein Netzknoten, kein (n−1).
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ==================== 2. ZWEI LAGER, EIN RECHENTISCH ==================== */}
      <section className={styles.section} aria-labelledby="neon-lager-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.kicker}>01 · Zwei Lager, ein Rechentisch</p>
            <h2 id="neon-lager-title" className={styles.sectionTitle}>
              Was Speicherentwickler und Netzplaner hier nachrechnen
            </h2>
            <p className={styles.sectionLead}>
              Marktlogik und Netzlogik reden oft aneinander vorbei. SpeicherPilot legt beide
              Fragestellungen auf dieselbe öffentliche Viertelstundengrundlage.
            </p>
          </div>

          <div className={styles.splitGrid}>
            <article className={`${styles.roleCard} ${styles.roleCardMarket}`}>
              <span className={styles.roleTag}>Für Speicherentwickler &amp; Projektierer</span>
              <h3 className={styles.cardTitle}>
                Was kostet Rücksicht auf die Spitze im Modell?
              </h3>
              <p className={styles.cardText}>
                Die Sorge, Rücksicht auf die bundesweite Restlast-Spitze zerstöre die
                Wirtschaftlichkeit, lässt sich auf öffentlichen Daten prüfen. Im Modell Oktober
                2026, doppelte Flotte (×2), perfekte Voraussicht, erzielt der Kompromiss 70
                {"\u00a0"}% der möglichen Spitzensenkung (2,51 von 3,59{"\u00a0"}GW) für 0,36
                {"\u00a0"}% weniger Day-Ahead-Erlös (Modell) – knapp 7× so viel Senkung wie
                Preisfahren allein (0,37{"\u00a0"}GW).
              </p>
              <dl className={styles.factBox}>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>Kompromiss (×2)</dt>
                  <dd className={`${styles.factVal} ${styles.num}`}>
                    2,51{"\u00a0"}GW Senkung · 99,64{"\u00a0"}% Day-Ahead-Erlös (Modell)
                  </dd>
                </div>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>Restlast-Deckel 62{"\u00a0"}GW</dt>
                  <dd className={`${styles.factVal} ${styles.num}`}>
                    2,41{"\u00a0"}GW Senkung · 99,67{"\u00a0"}% des Day-Ahead-Modellerlöses
                  </dd>
                </div>
              </dl>
              <div className={styles.cardActions}>
                <Link href="/kompromiss" className={styles.textLink}>
                  Kompromiss ausprobieren <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className={`${styles.roleCard} ${styles.roleCardGrid}`}>
              <span className={styles.roleTag}>Für Netzplaner &amp; Netzbetreiber</span>
              <h3 className={styles.cardTitle}>
                Wann entlastet der Speicher — und wann kippt die Spitze?
              </h3>
              <p className={styles.cardText}>
                Gleichzeitiges Laden zu niedrigen Börsenpreisen kann neue Höchstlasten erzeugen. Im
                Oktober-2026-Modell erzeugt reines Laden nach Preis ab etwa der 3,9-fachen Flotte
                eine neue Monatsspitze der bundesweiten Restlast – und längere Speicherdauer senkt
                die Spitze bei halber Leistung etwa gleich stark.
              </p>
              <dl className={styles.factBox}>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>Kipppunkt (Preisfahren)</dt>
                  <dd className={`${styles.factVal} ${styles.num}`}>
                    Ab ≈ ×3,9 neue Monatsspitze (×10: 92,8 statt 64,4{"\u00a0"}GW)
                  </dd>
                </div>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>Dauer vs. Leistung</dt>
                  <dd className={`${styles.factVal} ${styles.num}`}>
                    ×5 mit 4{"\u00a0"}h −14,1{"\u00a0"}GW vs. ×10 mit 1,76{"\u00a0"}h −14,0
                    {"\u00a0"}GW
                  </dd>
                </div>
              </dl>
              <div className={styles.cardActions}>
                <Link href="/knoten" className={styles.textLink}>
                  Knoten ansehen <span aria-hidden="true">→</span>
                </Link>
                <Link href="/monat" className={styles.textLinkMuted}>
                  Flotte &amp; Monat ansehen <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ==================== 3. GESTERN IM NETZ ==================== */}
      <section className={styles.section} id="gestern" aria-labelledby="neon-gestern-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={`${styles.kicker} ${styles.num}`}>
              02 · Gestern · {formattedDate} · Datenstand {model.dataStand}
            </p>
            <h2 id="neon-gestern-title" className={styles.sectionTitle}>
              Gestern im Netz
            </h2>
            <p className={styles.sectionLead}>
              Echte Viertelstundendaten vom letzten vollständigen Tag: bundesweite Restlast
              (Verbrauch minus Wind und Sonne) und Day-Ahead-Börsenpreis (DE-LU) ungeschnitten im
              Tagesverlauf.
            </p>
          </div>

          <div className={styles.kpiStrip} aria-label={`Kennzahlen vom ${formattedDate}`}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Höchste Restlast des Tages</span>
              <span className={`${styles.kpiVal} ${styles.num}`}>
                {maxRestGw !== null ? `${fmtOneDecimal.format(maxRestGw)}\u00a0GW` : "—"}
              </span>
              <span className={`${styles.kpiSub} ${styles.num}`}>
                {maxRestGw !== null ? `${maxRestHm}\u00a0Uhr · Energy-Charts` : "Keine Lastdaten"}
              </span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Day-Ahead-Preisspanne</span>
              <span className={`${styles.kpiVal} ${styles.num}`}>
                {minPrice !== null && maxPrice !== null
                  ? `${fmtTwoDecimals.format(minPrice.eurPerMwh)}–${fmtTwoDecimals.format(maxPrice.eurPerMwh)}\u00a0€/MWh`
                  : "—"}
              </span>
              <span className={`${styles.kpiSub} ${styles.num}`}>
                {minPrice !== null && maxPrice !== null
                  ? `Tief ${minPrice.hm}\u00a0Uhr · Hoch ${maxPrice.hm}\u00a0Uhr`
                  : "Keine Preisdaten"}
              </span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Tiefste Restlast des Tages</span>
              <span className={`${styles.kpiVal} ${styles.num}`}>
                {minRestGw !== null ? `${fmtOneDecimal.format(minRestGw)}\u00a0GW` : "—"}
              </span>
              <span className={`${styles.kpiSub} ${styles.num}`}>
                {minRestGw !== null
                  ? `${minRestHm}\u00a0Uhr · ${slots.length} Viertelstunden`
                  : "Keine Lastdaten"}
              </span>
            </div>
          </div>

          <div className={styles.dayChartCard}>
            <div className={styles.dayChartBar}>
              <span className={`${styles.dayChartTitle} ${styles.num}`}>
                Tagesverlauf · {formattedDate}
              </span>
              <div className={styles.dayLegend} aria-label="Kurvenlegende">
                <span className={styles.legendItem}>
                  <span className={`${styles.legendSwatch} ${styles.swatchLoad}`} aria-hidden="true" />
                  Restlast (GW, links)
                </span>
                {preise.length > 0 && (
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.swatchPrice}`} aria-hidden="true" />
                    Day-Ahead-Preis (€/MWh, rechts)
                  </span>
                )}
              </div>
            </div>

            <div className={styles.dayChartBody}>
              <NeonDayChart slots={slots} preise={preise} dayLabel={formattedDate} />
            </div>

            <div className={styles.dayChartFoot}>
              <span className={`${styles.dayChartMeta} ${styles.num}`}>
                Datenstand {model.dataStand} · Quellen: Energy-Charts &amp; SMARD (DE-LU)
              </span>
              <Link href={`/tag/${model.dayKey}`} className={styles.textLink}>
                Ganzen Tag ansehen <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 4. DREI BEFUNDE + KNOTEN-BEFUND ==================== */}
      <section className={styles.section} aria-labelledby="neon-befunde-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.kicker}>
              03 · Modell Oktober 2026, doppelte Flotte (×2), perfekte Voraussicht
            </p>
            <h2 id="neon-befunde-title" className={styles.sectionTitle}>
              Drei Befunde aus dem Oktober-Modell
            </h2>
            <p className={styles.sectionLead}>
              Täglich neu sind die Tagesdaten oben. Diese Befunde stammen fest aus dem
              Oktober-2026-Modell (Stand Oktober 2026, perfekte Voraussicht).
            </p>
          </div>

          <div className={styles.findingsGrid}>
            <article className={styles.findingCard}>
              <span className={styles.findingTag}>Befund 01 · Kompromiss</span>
              <div className={`${styles.findingFigure} ${styles.num}`}>
                70{"\u00a0"}% Senkung · −0,36{"\u00a0"}%
              </div>
              <p className={styles.cardText}>
                70{"\u00a0"}% der möglichen Spitzensenkung (2,51 von 3,59{"\u00a0"}GW) für 0,36
                {"\u00a0"}% weniger Day-Ahead-Erlös (Modell) – bezogen auf die bundesweite
                Restlast-Spitze. Preisfahren allein senkt um 0,37{"\u00a0"}GW; der Kompromiss senkt
                knapp 7× so viel.
              </p>
              <span className={styles.findingMeta}>
                Modell Oktober 2026, doppelte Flotte (×2), perfekte Voraussicht
              </span>
              <div className={styles.cardActions}>
                <Link href="/kompromiss" className={styles.textLink}>
                  Kompromiss ausprobieren <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className={styles.findingCard}>
              <span className={styles.findingTag}>Befund 02 · Dauer</span>
              <div className={`${styles.findingFigure} ${styles.num}`}>
                −14,1{"\u00a0"}GW vs. −14,0{"\u00a0"}GW
              </div>
              <p className={styles.cardText}>
                Mehr Stunden statt doppelter Leistung – etwa gleich stark: ×5 mit 4{"\u00a0"}h
                −14,1{"\u00a0"}GW, ×10 mit 1,76{"\u00a0"}h −14,0{"\u00a0"}GW – bei halber Leistung,
                bezogen auf die bundesweite Restlast-Spitze im Oktober-2026-Modell.
              </p>
              <span className={styles.findingMeta}>
                Modell Oktober 2026, perfekte Voraussicht · Flottenvergleich
              </span>
              <div className={styles.cardActions}>
                <Link href="/monat" className={styles.textLink}>
                  Flotte &amp; Dauer prüfen <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className={styles.findingCard}>
              <span className={styles.findingTag}>Befund 03 · Restlast-Deckel</span>
              <div className={`${styles.findingFigure} ${styles.num}`}>
                2,41{"\u00a0"}GW vs. 0,37{"\u00a0"}GW
              </div>
              <p className={styles.cardText}>
                Deckel, der die Restlast bei 62{"\u00a0"}GW hält: 2,41{"\u00a0"}GW Senkung bei
                99,67{"\u00a0"}% des Day-Ahead-Modellerlöses. Ein reines Zeitfenster 16–21{"\u00a0"}
                Uhr ändert im Modell nichts (0,37{"\u00a0"}GW, wie Preisfahren) – fast so viel wie
                der Kompromiss.
              </p>
              <span className={styles.findingMeta}>
                Modell Oktober 2026, doppelte Flotte (×2), perfekte Voraussicht
              </span>
              <div className={styles.cardActions}>
                <Link href="/kompromiss" className={styles.textLink}>
                  Deckel im Kompromiss prüfen <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </div>

          <article className={styles.knotenCard} aria-labelledby="neon-knoten-title">
            <div className={styles.knotenBody}>
              <span className={styles.findingTag}>Knoten-Befund · Windknoten Nord · 24.10.2026</span>
              <h3 id="neon-knoten-title" className={styles.knotenTitle}>
                0 statt 6 Viertelstunden über der Grenze – für 0,4{"\u00a0"}% weniger
                Day-Ahead-Erlös (Modell)
              </h3>
              <p className={styles.cardText}>
                Windknoten Nord, doppelte Flotte, 24.10.2026: Fährt der Speicher nur nach
                Marktpreis, liegt der Knoten 6 Viertelstunden über der Grenze. Knotentreu gefahren:
                0 Viertelstunden – für 0,4{"\u00a0"}% weniger Day-Ahead-Erlös (Modell).
              </p>
            </div>
            <div className={styles.knotenAction}>
              <Link href="/knoten" className={styles.btnSecondary}>
                Knoten ansehen <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* ==================== 5. TRANSPARENZ & MODELLGRENZEN ==================== */}
      <section
        className={`${styles.section} ${styles.transparencySection}`}
        aria-labelledby="neon-transparenz-title"
      >
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.kicker}>04 · Transparenz &amp; Modellgrenzen</p>
            <h2 id="neon-transparenz-title" className={styles.sectionTitle}>
              Nachvollziehbare Annahmen, klare Grenzen
            </h2>
          </div>

          <div className={styles.transparencyBox}>
            <div className={styles.transparencyGrid}>
              <div className={styles.transCell}>
                <span className={styles.transLabel}>Marktmodell &amp; Voraussicht</span>
                <p className={styles.transText}>
                  Nur Day-Ahead, Preisnehmer, perfekte Voraussicht; Start=Ende SoC 50{"\u00a0"}%;
                  der Erlösverlust ist damit eine Modellgröße (eher Untergrenze), keine Prognose.
                </p>
              </div>

              <div className={styles.transCell}>
                <span className={styles.transLabel}>Speicher &amp; Netzebene</span>
                <p className={styles.transText}>
                  Round-Trip-Wirkungsgrad 85{"\u00a0"}%, nutzbarer SoC 10–90{"\u00a0"}%.
                  Bundesweites Flottenmodell (ein Netzknoten, kein (n−1), keine Abregelung);
                  Knoten-Szenario getrennt unter <Link href="/knoten" className={styles.inlineLink}>/knoten</Link>.
                </p>
              </div>

              <div className={styles.transCell}>
                <span className={styles.transLabel}>Öffentliche Quellen</span>
                <p className={styles.transText}>
                  Energy-Charts (Fraunhofer ISE), SMARD (Bundesnetzagentur) und Battery Charts.
                  Feste Schwellen, keine Laufzeit-KI.{" "}
                  <Link href="/methodik" className={styles.inlineLink}>
                    Lizenzen je Quelle in der Methodik
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className={styles.transparencyFoot}>
              <p className={styles.legalLine}>
                Szenarien zur Einordnung, keine Beratung oder Prüfung eines Anschlusses.
              </p>
              <Link href="/methodik" className={styles.btnSecondary}>
                Methodik &amp; Lizenzen <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 6. Wer hier rechnet ==================== */}
      <section className={styles.section} id="autor" aria-labelledby="neon-autor-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.kicker}>05 · Wer hier rechnet</p>
            <h2 id="neon-autor-title" className={styles.sectionTitle}>
              Phillipp Zarindast
            </h2>
          </div>

          <div className={styles.authorLayout}>
            <div className={styles.authorMetaCol}>
              {/* PLATZHALTER Porträt: erst mit freigegebenem Foto */}
              <div className={styles.authorCard}>
                <div className={styles.authorName}>Phillipp Zarindast</div>
                <p className={styles.authorRole}>
                  Hochspannungs- &amp; Umspannwerkskonstruktion
                </p>
                <p className={styles.authorScope}>
                  Unabhängiges Rechenprojekt ausschließlich auf öffentlichen Strommarkt- und
                  Netzdaten.
                </p>
              </div>
            </div>

            <div className={styles.authorBody}>
              <p className={styles.authorBio}>
                Im Arbeitsalltag der Hochspannungs- und Umspannwerkskonstruktion sehe ich, wie
                unterschiedlich Speicherprojektierer und Netzplaner auf dasselbe Stromnetz schauen.
                Die einen optimieren auf Börsenpreise, die anderen planen für Gleichzeitigkeit und
                Abendspitzen — selten auf derselben Datenbasis.
              </p>

              <div className={styles.authorLinks}>
                <a
                  href="https://www.linkedin.com/in/phillipp-zarindast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnPrimary}
                >
                  LinkedIn <span aria-hidden="true">→</span>
                </a>
                <a
                  href="https://x.com/pphhiillliipppp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnSecondary}
                >
                  X (@pphhiillliipppp) <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
