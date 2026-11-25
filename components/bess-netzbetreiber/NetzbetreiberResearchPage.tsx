"use client";

import Link from "next/link";
import { type CSSProperties, useMemo } from "react";

import { BessKarte3d } from "@/components/bess-netzbetreiber/BessKarte3d.client";
import { BessKarteOhneKoordinateTable } from "@/components/bess-netzbetreiber/BessKarteOhneKoordinateTable";
import { NetzbetreiberBlBessBars } from "@/components/bess-netzbetreiber/NetzbetreiberMoreBars";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { BkgAttribution, BmweQuelle } from "@/components/bess-netzbetreiber/KarteQuellen";
import type { KarteKernzahlen } from "@/lib/bessKarte3d/kernzahlen";
import { K4_SATZ } from "@/lib/bessKarte3d/k4";
import { blNetto } from "@/lib/bessKarte3d/logic";
import type {
  BundeslaenderGeoJson,
  Karte3dSummary,
} from "@/lib/bessKarte3d/types";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";

/** Nur die Felder aus bundle.json, die die Seite braucht (speicherpilot 14:42: kein ganzes Bundle im Client). */
export type NetzbetreiberClientDaten = {
  stichtagMastr: string | null;
  uenbEbene: { inBetriebBruttoGw: number; inBetriebNettoGw: number | null };
};

/**
 * /netzbetreiber: Hero = Gesamtzahl + große Karte, darunter Kernerkenntnisse (Phillipp 25.11 13:34).
 * Texte der Kernerkenntnisse: Freigabe speicherpilot 25.11 14:40
 * (/workspace/antigravity/ergebnisse/karte_hero_redispatch_text_freigabe.md), 1:1 übernommen.
 */
export function NetzbetreiberResearchPage({
  nb,
  karteSummary,
  geoJson,
  kern,
}: {
  nb: NetzbetreiberClientDaten;
  karteSummary: Karte3dSummary;
  geoJson: BundeslaenderGeoJson;
  kern: KarteKernzahlen;
}) {
  const stichtagRaw = karteSummary.meta.stichtag ?? nb.stichtagMastr ?? "";
  const stichtagDe = /^\d{4}-\d{2}-\d{2}$/.test(stichtagRaw)
    ? stichtagRaw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3.$2.$1")
    : stichtagRaw;

  const totalNettoGw = karteSummary.totals.nettoMw / 1000;
  const heroZahl = formatQuantity(totalNettoGw, "de", 2);
  const heroCh = String(heroZahl.replace(/\s/g, "").length + 2);

  const blNettoRows = useMemo(
    () => blNetto(karteSummary.bundeslaender),
    [karteSummary.bundeslaender],
  );

  const abregSumme = useMemo(() => {
    let gesamt = 0;
    let offshore = 0;
    const offshoreTeile: { kuerzel: string; gwh: number }[] = [];
    for (const b of karteSummary.bundeslaender) {
      gesamt += b.abregelung2025Gwh ?? 0;
      const off = b.abregelung2025OffshoreGwh ?? 0;
      offshore += off;
      if (off >= 1) offshoreTeile.push({ kuerzel: b.kuerzel, gwh: off });
    }
    offshoreTeile.sort((x, y) => y.gwh - x.gwh);
    return { gesamt, offshore, offshoreTeile };
  }, [karteSummary.bundeslaender]);

  const pct = (v: number) => insertDisplayUnitNbsp(formatQuantityUnit(Math.round(v), "de", 0, "%"));

  const heroZahlBlock = (
    <div className={styles.heroZahlRow}>
      <p
        className="v4-riesenzahl num"
        aria-hidden="true"
        style={{ "--v4-ries-ch": heroCh } as CSSProperties}
      >
        {heroZahl}
        <span className="v4-riesenzahl-unit">GW</span>
      </p>
      <p className={`${styles.heroZahlText} num`}>
        <span className="sr-only">{heroZahl} Gigawatt </span>
        {`netto in Betrieb: ${formatQuantity(karteSummary.totals.n, "de", 0)} Batteriespeicher ab 1\u00a0MW an ${formatQuantity(karteSummary.totals.lokationen, "de", 0)} Lokationen (Marktstammdatenregister)`}
      </p>
    </div>
  );

  return (
    <div className={styles.netzbetreiberV4} data-testid="netzbetreiber-page">
      <section className={styles.heroSection} aria-labelledby="nb-h1">
        <div className={`v4-content ${styles.heroHead}`}>
          <p className="v4-kicker num">BESS-Karte · Datenstand {stichtagDe}</p>
          <h1 id="nb-h1" className={styles.heroH1}>
            Wo stehen Deutschlands Batteriespeicher?
          </h1>
          <div className={styles.heroZahlMobile}>{heroZahlBlock}</div>
        </div>
        <div className={`v4-content ${styles.heroStage}`}>
          <BessKarte3d summary={karteSummary} geoJson={geoJson} hero overlay={heroZahlBlock} />
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="kern-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">Kernerkenntnisse</p>
          <h2 id="kern-title" className="v4-chapter-h2">
            Was die Karte zeigt
          </h2>
        </div>
        <div className={`v4-content ${styles.kernGrid}`}>
          <article className={styles.kernItem} aria-labelledby="kern-redispatch">
            <h3 id="kern-redispatch" className={styles.kernTitle}>
              Speicher stehen nicht dort, wo am meisten abgeregelt wird
            </h3>
            <p className={styles.kernText}>
              Beim EE-Redispatch regelt der Netzbetreiber vor allem Wind- und Solaranlagen ab, weil sonst eine
              Leitung oder ein Umspannwerk überlastet würde. Zu viel Strom insgesamt braucht es dafür nicht. Ein
              Speicher entlastet nur, wenn er vor dem Engpass steht, also auf der Seite mit dem Überschuss, und
              genau dann lädt. Großspeicher fahren heute vor allem nach Börsen- und Regelenergiepreisen. Die
              gelten in ganz Deutschland gleich und kennen keinen Netzengpass.
            </p>
            <p className={styles.kernText}>
              Brandenburg, Bayern und Schleswig-Holstein regeln je GW Wind und PV am meisten ab und haben je GW
              18 bis 26{"\u00a0"}MW Speicher. Sachsen und Sachsen-Anhalt regeln wenig ab und haben 44 bis 54
              {"\u00a0"}MW. Je Land zeigt sich kein Zusammenhang.
            </p>
            <p className={`${styles.kernSmall} num`}>
              {K4_SATZ} Quellen: BMWE, BT-Drs.{"\u00a0"}21/5933, und BNetzA, EE-Statistik Oktober 2026. Die
              Länderebene ist grob, Engpässe sitzen an einzelnen Netzknoten. Verglichen wird der Standort 2026
              mit dem Redispatch 2025, nicht die Fahrweise.
            </p>
          </article>
          <article className={styles.kernItem} aria-labelledby="kern-konzentration">
            <p className={`${styles.kernZahl} num`}>{pct(kern.topAnteilPct)}</p>
            <h3 id="kern-konzentration" className={styles.kernTitle}>
              55 Lokationen tragen fast die Hälfte
            </h3>
            <p className={styles.kernText}>
              55 der 550 Lokationen, also jede zehnte, vereinen 48{"\u00a0"}% der Nettoleistung. Jede davon hat
              mindestens 17{"\u00a0"}MW, die größte, Westfalen{"\u00a0"}1, allein 140{"\u00a0"}MW. Die übrigen 495
              teilen sich den Rest.
            </p>
          </article>
          <article className={styles.kernItem} aria-labelledby="kern-zubau">
            <p className={`${styles.kernZahl} num`}>{pct(kern.zubauAnteilPct)}</p>
            <h3 id="kern-zubau" className={styles.kernTitle}>
              Der Bestand ist jung
            </h3>
            <p className={styles.kernText}>
              62{"\u00a0"}% der heutigen Nettoleistung gingen erst 2025 und 2026 in Betrieb: 0,82{"\u00a0"}GW
              2025 und 2,05{"\u00a0"}GW 2026 bis zum 24.11. Den größten Teil der Einträge aus 2026 hat der
              Netzbetreiber im Register noch nicht geprüft, Nachmeldungen kommen dazu.
            </p>
          </article>
        </div>
      </section>

      <details className={styles.moreData}>
        <summary className={styles.moreDataSummary}>Mehr Daten</summary>
        <div className={styles.moreDataBody}>
          <BessKarteOhneKoordinateTable
            rows={karteSummary.ohneKoordinate}
            sumNettoMw={karteSummary.totals.ohneKoordinateNettoMw}
            sumBruttoMw={karteSummary.totals.ohneKoordinateBruttoMw}
          />
          <section aria-labelledby="g4-more">
            <p className="v4-chapter-num num">Bundesländer (netto)</p>
            <h2 id="g4-more" className="v4-chapter-h2">
              BESS-Nettoleistung je Bundesland (alle 16 Länder)
            </h2>
            <NetzbetreiberBlBessBars rows={blNettoRows} />
            <p className="v4-subline num">
              EE-Redispatch 2025 laut BMWE (Werte je Land in der Karte unter Zweite Ebene): gesamt{" "}
              {insertDisplayUnitNbsp(formatQuantityUnit(abregSumme.gesamt, "de", 2, "GWh"))} inkl.{" "}
              {insertDisplayUnitNbsp(formatQuantityUnit(abregSumme.offshore, "de", 2, "GWh"))} Wind Offshore (
              {abregSumme.offshoreTeile
                .map((t) => `${t.kuerzel} ${formatQuantity(t.gwh, "de", 2)}`)
                .join(", ")}
              ); ohne Offshore{" "}
              {insertDisplayUnitNbsp(formatQuantityUnit(abregSumme.gesamt - abregSumme.offshore, "de", 2, "GWh"))}.
              Hamburg und Berlin: k.{"\u00a0"}A.
            </p>
            <p className="v4-subline">
              Alle 16 Länder inkl. der{" "}
              {formatQuantity(karteSummary.totals.ohneKoordinateN, "de", 0)}{" "}
              Einheiten ohne Koordinate (
              {insertDisplayUnitNbsp(
                formatQuantityUnit(
                  karteSummary.totals.ohneKoordinateNettoMw,
                  "de",
                  1,
                  "MW",
                ),
              )}{" "}
              netto). ÜNB in Betrieb brutto{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(
                  nb.uenbEbene.inBetriebBruttoGw,
                  "de",
                  2,
                  "GW",
                ),
              )}
              , netto{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(
                  nb.uenbEbene.inBetriebNettoGw ?? 0,
                  "de",
                  2,
                  "GW",
                ),
              )}
              . Mehr in der{" "}
              <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
                Methodik
              </Link>
              .
            </p>
          </section>
        </div>
      </details>

      <div id="karte-quellen" className={`v4-chapter-foot v4-content num ${styles.chapterFoot}`}>
        <p>
          Quellen: Marktstammdatenregister (dl-de/by-2-0), Stichtag {stichtagDe}. Redispatch-Maßnahmen mit EE
          2025 (Karte ohne Wind Offshore):
        </p>
        <BmweQuelle />
        <BkgAttribution />
        <p>
          <Link href="/methodik#bess-karte-3d" className="v4-text-link">
            Methodik Karte
          </Link>{" "}
          ·{"\u00a0"}
          <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
            Methodik Netzbetreiber
          </Link>
        </p>
      </div>
    </div>
  );
}
