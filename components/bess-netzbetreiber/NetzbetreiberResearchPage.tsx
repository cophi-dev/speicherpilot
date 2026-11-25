"use client";

import Link from "next/link";
import { type CSSProperties, useMemo } from "react";

import { BessKarte3d } from "@/components/bess-netzbetreiber/BessKarte3d.client";
import { BessKarteOhneKoordinateTable } from "@/components/bess-netzbetreiber/BessKarteOhneKoordinateTable";
import {
  NetzbetreiberBlBessBars,
  NetzbetreiberEeStockBars,
} from "@/components/bess-netzbetreiber/NetzbetreiberMoreBars";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { BkgAttribution, BmweQuelle } from "@/components/bess-netzbetreiber/KarteQuellen";
import type { KarteKernzahlen } from "@/lib/bessKarte3d/kernzahlen";
import { blNetto } from "@/lib/bessKarte3d/logic";
import type {
  BundeslaenderGeoJson,
  Karte3dSummary,
} from "@/lib/bessKarte3d/types";
import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";

type ManifestShape = {
  stichtagMastr?: string;
};

/**
 * /netzbetreiber: Hero = Gesamtzahl + große Karte, darunter Kernerkenntnisse (Phillipp 25.11 13:34).
 * Die Texte der Kernerkenntnisse sind ENTWURF bis zur Freigabe durch speicherpilot
 * (/workspace/antigravity/ergebnisse/karte_hero_redispatch_text.md).
 */
export function NetzbetreiberResearchPage({
  model,
  karteSummary,
  geoJson,
  kern,
}: {
  model: BessNetzbetreiberBundle;
  karteSummary: Karte3dSummary;
  geoJson: BundeslaenderGeoJson;
  kern: KarteKernzahlen;
}) {
  const manifest = model.manifest as ManifestShape;

  const stichtagRaw = karteSummary.meta.stichtag ?? manifest.stichtagMastr ?? "";
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

  const eeStock = model.eeStockBundeslaender;
  const g5Data = useMemo(() => {
    const nettoByBl = new Map(
      karteSummary.bundeslaender.map((b) => [b.bundesland, b.nettoMw]),
    );
    return eeStock.map((r) => ({
      bundesland: r.bundesland,
      wind: r.windOnshoreGw,
      pv: r.pvGw,
      bessNettoMw: nettoByBl.get(r.bundesland) ?? 0,
    }));
  }, [eeStock, karteSummary.bundeslaender]);

  const zubau25 = kern.zubauJahre.find((z) => z.jahr === 2025)?.nettoMw ?? 0;
  const zubau26 = kern.zubauJahre.find((z) => z.jahr === 2026)?.nettoMw ?? 0;
  const pct = (v: number) => insertDisplayUnitNbsp(formatQuantityUnit(Math.round(v), "de", 0, "%"));
  const gw = (mw: number) => insertDisplayUnitNbsp(formatQuantityUnit(mw / 1000, "de", 2, "GW"));

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
        <div className={`v4-content ${styles.kernGrid}`} data-entwurf="speicherpilot-freigabe-offen">
          <article className={styles.kernItem} aria-labelledby="kern-redispatch">
            <h3 id="kern-redispatch" className={styles.kernTitle}>
              Speicher stehen nicht dort, wo am meisten abgeregelt wird
            </h3>
            <p className={styles.kernText}>
              Beim EE-Redispatch regelt der Netzbetreiber Wind- und Solaranlagen ab, weil eine Leitung voll ist,
              nicht weil insgesamt zu viel Strom da ist. Ein Speicher hilft dabei nur, wenn er vor dem Engpass
              steht und genau dann lädt, wenn sonst abgeregelt würde. Großspeicher fahren heute aber nach dem
              Börsenpreis, der in ganz Deutschland gleich ist, und sehen den Engpass nicht. Entsprechend gibt es
              je Land keinen Zusammenhang zwischen Speicher und Abregelung (Rangkorrelation −0,02).
            </p>
            <p className={`${styles.kernSmall} num`}>
              Speicher-MW je GW Wind+PV gegen Abregelung ohne Wind Offshore je GW, 14 Länder, BMWE 2025. Die
              Länderebene ist grob, Engpässe sitzen an einzelnen Netzknoten. Die Standortwahl folgt heute
              Netzanschluss und Markt, nicht der Abregelung.
            </p>
          </article>
          <article className={styles.kernItem} aria-labelledby="kern-konzentration">
            <p className={`${styles.kernZahl} num`}>{pct(kern.topAnteilPct)}</p>
            <h3 id="kern-konzentration" className={styles.kernTitle}>
              {kern.topLokationen} Lokationen tragen fast die Hälfte
            </h3>
            <p className={styles.kernText}>
              {kern.topLokationen} der {formatQuantity(kern.lokationen, "de", 0)} Lokationen, also jede zehnte,
              haben zusammen {pct(kern.topAnteilPct)} der Nettoleistung (je mindestens{" "}
              {insertDisplayUnitNbsp(formatQuantityUnit(Math.floor(kern.topMinMw), "de", 0, "MW"))}). Die übrigen{" "}
              {formatQuantity(kern.lokationen - kern.topLokationen, "de", 0)} teilen sich den Rest.
            </p>
          </article>
          <article className={styles.kernItem} aria-labelledby="kern-zubau">
            <p className={`${styles.kernZahl} num`}>{pct(kern.zubauAnteilPct)}</p>
            <h3 id="kern-zubau" className={styles.kernTitle}>
              Der Bestand ist jung
            </h3>
            <p className={styles.kernText}>
              {pct(kern.zubauAnteilPct)} der heutigen Nettoleistung gingen erst 2025 und 2026 in Betrieb:{" "}
              {gw(zubau25)} 2025 und {gw(zubau26)} 2026 bis zum {stichtagDe.replace(/\.\d{4}$/, ".")}
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
              EE-Redispatch 2025 laut BMWE (Hover auf dem Ländernamen): gesamt{" "}
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
                  model.uenbEbene.inBetriebBruttoGw,
                  "de",
                  2,
                  "GW",
                ),
              )}
              , netto{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(
                  model.uenbEbene.inBetriebNettoGw ?? 0,
                  "de",
                  2,
                  "GW",
                ),
              )}{" "}
              — siehe{" "}
              <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
                Methodik
              </Link>
              .
            </p>
          </section>
          {eeStock.length > 0 ? (
            <section aria-labelledby="g5-more">
              <p className="v4-chapter-num num">Erneuerbare &amp; BESS</p>
              <h2 id="g5-more" className="v4-chapter-h2">
                BESS-Nettoleistung je Bundesland (MaStR)
              </h2>
              <NetzbetreiberEeStockBars rows={g5Data} />
            </section>
          ) : null}
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
