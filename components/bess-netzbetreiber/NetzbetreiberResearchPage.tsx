"use client";

import Link from "next/link";
import { type CSSProperties, useMemo, useState } from "react";

import { BessKarte3d } from "@/components/bess-netzbetreiber/BessKarte3d.client";
import { BessKarteOhneKoordinateTable } from "@/components/bess-netzbetreiber/BessKarteOhneKoordinateTable";
import {
  NetzbetreiberBlBessBars,
  NetzbetreiberEeStockBars,
  NetzbetreiberG3Bars,
} from "@/components/bess-netzbetreiber/NetzbetreiberMoreBars";
import { NetzbetreiberVnbBars } from "@/components/bess-netzbetreiber/NetzbetreiberVnbBars";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { blNetto } from "@/lib/bessKarte3d/logic";
import type {
  BundeslaenderGeoJson,
  Karte3dSummary,
} from "@/lib/bessKarte3d/types";
import { computeNetzbetreiberHeadlines } from "@/lib/bessNetzbetreiber/computeHeadlines";
import {
  prepareGrowthStacks,
  prepareVnbBars,
  truncateVnbLabel,
} from "@/lib/bessNetzbetreiber/prepareModel";
import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";

type ManifestShape = {
  stichtagMastr?: string;
};

const EON_HYPH = "\u2011";

export function NetzbetreiberResearchPage({
  model,
  karteSummary,
  geoJson,
}: {
  model: BessNetzbetreiberBundle;
  karteSummary: Karte3dSummary;
  geoJson: BundeslaenderGeoJson;
}) {
  const [eonIncludeMitnetz, setEonIncludeMitnetz] = useState(true);

  const manifest = model.manifest as ManifestShape;
  const headlines = useMemo(
    () => computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz }),
    [model, eonIncludeMitnetz],
  );

  const vnbRanking = model.vnbRanking;
  const growth = useMemo(
    () =>
      prepareGrowthStacks(model.growthDefault, {
        showMitnetz: eonIncludeMitnetz,
      }),
    [model.growthDefault, eonIncludeMitnetz],
  );

  const vnbBarRows = useMemo(() => {
    const { rows } = prepareVnbBars(vnbRanking);
    return rows.map((r) => {
      const { full, short } = truncateVnbLabel(r.label, 28);
      return {
        ...r,
        fullLabel: full,
        shortLabel: short,
        displayMw: r.nettoMw,
        capped: false,
        isEonGroup: r.key.startsWith("eon") || r.key === "mitnetz_envia",
      };
    });
  }, [vnbRanking]);

  const stichtagRaw =
    karteSummary.meta.stichtag ?? manifest.stichtagMastr ?? headlines.stichtag;
  const stichtagDe = /^\d{4}-\d{2}-\d{2}$/.test(stichtagRaw)
    ? stichtagRaw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3.$2.$1")
    : stichtagRaw;

  const totalNettoGw = karteSummary.totals.nettoMw / 1000;
  const eonGwFormatted = formatQuantityUnit(headlines.eonNettoGw, "de", 2, "GW");
  const eonGwParts = eonGwFormatted.replace(/\s*GW$/i, "").trim();
  const heroCh = String(eonGwParts.replace(/\s/g, "").length + 2);

  const blNettoRows = useMemo(
    () => blNetto(karteSummary.bundeslaender),
    [karteSummary.bundeslaender],
  );

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

  const vnbOver50Count = useMemo(() => {
    const vnbOnly = vnbRanking.filter((r) => r.operatorClass !== "uenb");
    return vnbOnly.filter((r) => r.nettoMw > 50).length;
  }, [vnbRanking]);

  const h1 = eonIncludeMitnetz ? (
    <>
      Mehr als die Hälfte der Großspeicher-Leistung hängt an{" "}
      <span className={styles.eonNowrap}>E.ON{EON_HYPH}Netzen</span>.
    </>
  ) : (
    "Der Großteil der ≥1-MW-Speicher liegt an westdeutschen Verteilnetzen."
  );

  return (
    <div className={styles.netzbetreiberV4} data-testid="netzbetreiber-page">
      <section className="v4-kopf" aria-labelledby="nb-h1">
        <div className="v4-kopf-inner v4-content">
          <p className="v4-kicker num">
            BESS-Karte · NETZBETREIBER · DATENSTAND {stichtagDe}
          </p>
          <p
            id="nb-leitfrage"
            className="v4-subline"
            style={{ marginBottom: "0.35rem", fontWeight: 500 }}
          >
            Wo stehen Deutschlands Batteriespeicher?
          </p>

          <div className="v4-kopf-intro">
            <h1 id="nb-h1" className="v4-h1" style={{ maxWidth: "22ch" }}>
              {h1}
            </h1>
            <div className="v4-kopf-subgrid">
              <p className={`v4-subline ${styles.leadTight}`}>
                Marktstammdatenregister, Stand {stichtagDe}:{" "}
                {formatQuantity(karteSummary.totals.n, "de", 0)}{" "}
                Batteriespeicher ab 1&nbsp;MW sind in Betrieb, zusammen{" "}
                {insertDisplayUnitNbsp(
                  formatQuantityUnit(totalNettoGw, "de", 2, "GW"),
                )}{" "}
                netto.{" "}
                <button
                  type="button"
                  className={styles.mitnetzLink}
                  onClick={() => setEonIncludeMitnetz((v) => !v)}
                >
                  {eonIncludeMitnetz ? (
                    <>
                      MITNETZ im{" "}
                      <span className={styles.eonNowrap}>
                        E.ON{EON_HYPH}Konzern
                      </span>{" "}
                      eingeschlossen
                    </>
                  ) : (
                    "ohne mitteldeutsche Tochter"
                  )}
                  {/* Punkt im Button, damit er bei Umbruch nicht allein hängt */}
                  <span aria-hidden="true">.</span>
                </button>
              </p>
              <div className="v4-preis-block">
                <p className="v4-preis-label num">Bestand (netto)</p>
                <p className="v4-preis-value num">
                  {insertDisplayUnitNbsp(
                    formatQuantityUnit(totalNettoGw, "de", 2, "GW"),
                  )}{" "}
                  netto in Betrieb, MaStR
                </p>
              </div>
            </div>
          </div>

          <div className={`v4-kopf-hero ${styles.netzbetreiberHeroCompact}`}>
            <div className="v4-kopf-zahl">
              <p
                className="v4-riesenzahl num"
                aria-hidden="true"
                style={{ "--v4-ries-ch": heroCh } as CSSProperties}
              >
                {eonGwParts}
                <span className="v4-riesenzahl-unit">GW</span>
              </p>
              <div className="v4-kern-row">
                <span>
                  netto an{" "}
                  <span className={styles.eonNowrap}>
                    E.ON{EON_HYPH}Netzen
                  </span>
                  ,{" "}
                  {insertDisplayUnitNbsp(
                    formatQuantityUnit(
                      headlines.eonSharePctTotalNetto,
                      "de",
                      0,
                      "%",
                    ),
                  )}{" "}
                  der Nettoleistung in Betrieb
                </span>
              </div>
            </div>
          </div>

          <div className={styles.heroNotesRow}>
            <p className={styles.flowPara}>
              Zubau mit Inbetriebnahme 2026:{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(headlines.zubau2026Gw, "de", 2, "GW"),
              )}{" "}
              netto, davon{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(headlines.zubau2026EonGw, "de", 2, "GW"),
              )}{" "}
              an <span className={styles.eonNowrap}>E.ON{EON_HYPH}Netzen</span> (
              {insertDisplayUnitNbsp(
                formatQuantityUnit(headlines.zubau2026EonSharePct, "de", 0, "%"),
              )}
              ; brutto{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(headlines.zubau2026BruttoGw, "de", 2, "GW"),
              )}{" "}
              /{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(headlines.zubau2026EonBruttoGw, "de", 2, "GW"),
              )}
              ). ÜNB in Betrieb (netto):{" "}
              {insertDisplayUnitNbsp(
                formatQuantityUnit(
                  model.uenbEbene.inBetriebNettoGw ??
                    model.uenbEbene.inBetriebBruttoGw,
                  "de",
                  2,
                  "GW",
                ),
              )}{" "}
              ({model.uenbEbene.inBetriebUnits ?? "—"} Einheiten, Konzeptfilter).
            </p>
            <p className={styles.nettoDefNote}>
              <strong>Hinweis Nettoleistung:</strong>{" "}
              {karteSummary.meta.nettoDefinition}
            </p>
          </div>
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="karte-3d-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">01 — Interaktive Speicherkarte</p>
          <h2 id="karte-3d-title" className="v4-chapter-h2">
            Standorte in Betrieb, Ende 2017 bis heute
          </h2>
          <p className="v4-tag-side">
            {formatQuantity(karteSummary.totals.lokationenKartiert, "de", 0)}{" "}
            kartierte Lokationen (
            {insertDisplayUnitNbsp(
              formatQuantityUnit(
                karteSummary.totals.nettoMw -
                  karteSummary.totals.ohneKoordinateNettoMw,
                "de",
                1,
                "MW",
              ),
            )}{" "}
            netto), eine Säule je Lokation.{" "}
            <Link href="/methodik#bess-karte-3d" className="v4-text-link">
              Methodik zur Karte
            </Link>
            .
          </p>
        </div>
        <div className="v4-content">
          <BessKarte3d summary={karteSummary} geoJson={geoJson} />
          <BessKarteOhneKoordinateTable
            rows={karteSummary.ohneKoordinate}
            sumNettoMw={karteSummary.totals.ohneKoordinateNettoMw}
            sumBruttoMw={karteSummary.totals.ohneKoordinateBruttoMw}
          />
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="g2-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">02 — Verteilnetzbetreiber</p>
          <h2 id="g2-title" className="v4-chapter-h2">
            Nettoleistung (Top 13)
          </h2>
          <p className="v4-tag-side">
            Nur {vnbOver50Count} Verteilnetzbetreiber haben mehr als 50&nbsp;MW
            netto. MITNETZ liegt vor Westnetz. Balken der{" "}
            <span className={styles.eonNowrap}>E.ON{EON_HYPH}Gruppe</span> in
            Rostorange, übrige Verteilnetzbetreiber grau.
          </p>
        </div>
        <div className="v4-content v4-luecke-wrap">
          <NetzbetreiberVnbBars rows={vnbBarRows} />
        </div>
      </section>

      <details className={styles.moreData}>
        <summary className={styles.moreDataSummary}>Mehr Daten</summary>
        <div className={styles.moreDataBody}>
          <section aria-labelledby="g3-more">
            <p className="v4-chapter-num num">Zubau 2026 (netto)</p>
            <h2 id="g3-more" className="v4-chapter-h2">
              Bestand vor 2026 und Zubau 2026 (netto)
            </h2>
            <NetzbetreiberG3Bars rows={growth} />
          </section>
          <section aria-labelledby="g4-more">
            <p className="v4-chapter-num num">Bundesländer (netto)</p>
            <h2 id="g4-more" className="v4-chapter-h2">
              BESS-Nettoleistung je Bundesland (alle 16 Länder)
            </h2>
            <NetzbetreiberBlBessBars rows={blNettoRows} />
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

      <p className={`v4-chapter-foot v4-content num ${styles.chapterFoot}`}>
        Quellen: Marktstammdatenregister (dl-de/by-2-0), EE-Abregelung 2025:
        BMWE-Antwort vom 12.05.2026 (Schriftliche Frage 70), Ländergrenzen ©{"\u00a0"}GeoBasis-DE / BKG
        (2026), dl-de/by-2-0, Stichtag {stichtagDe}.{" "}
        <Link href="/methodik#bess-karte-3d" className="v4-text-link">
          Methodik Karte
        </Link>{" "}
        ·{" "}
        <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
          Methodik Netzbetreiber
        </Link>
      </p>
    </div>
  );
}
