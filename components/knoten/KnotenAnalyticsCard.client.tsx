"use client";

import { useCallback, useState, type ChangeEvent, type RefObject } from "react";

import styles from "@/components/knoten/knoten.module.css";
import {
  buildAnalyticsReportText,
  SAMPLE_SUBSTATION_PROFILES,
  type KnotenRecommendation,
  type SampleSubstationProfile,
} from "@/lib/knoten/customProfileSim";
import { KNOTEN_LIMIT_MW } from "@/lib/knoten/knotenTypes";

const CUSTOM_LIMITS_MW = [40, 60, 80, 100, 120] as const;
const CUSTOM_BESS_POWER_MW = [10, 15, 20, 30, 40] as const;
const CUSTOM_BESS_HOURS = [2, 4] as const;

function fmtMw(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}\u00A0MW`;
}

export function KnotenAnalyticsCard({
  profileName,
  isCustom,
  customNote,
  customError,
  customLimitMw,
  customBessMw,
  customBessHours,
  recommendation,
  fileInputRef,
  onSelectLimit,
  onSelectBessPower,
  onSelectBessHours,
  onApplyRecommendedSizing,
  onCsvFileChange,
  onSelectSample,
  onResetCustom,
  onDownloadCsv,
}: {
  profileName: string;
  isCustom: boolean;
  customNote: string | null;
  customError: string | null;
  customLimitMw: number;
  customBessMw: number;
  customBessHours: number;
  recommendation: KnotenRecommendation;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectLimit: (mw: number) => void;
  onSelectBessPower: (mw: number) => void;
  onSelectBessHours: (h: number) => void;
  onApplyRecommendedSizing: (mw: number, hours: number) => void;
  onCsvFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSelectSample: (sample: SampleSubstationProfile) => void;
  onResetCustom: () => void;
  onDownloadCsv: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const bessLabel = isCustom
    ? `${customBessMw}\u00A0MW / ${customBessMw * customBessHours}\u00A0MWh`
    : "Modellknoten";

  const onCopyReport = useCallback(() => {
    const text = buildAnalyticsReportText({
      profileName,
      limitMw: customLimitMw,
      recommendation,
      bessLabel,
    });
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2400);
      });
    }
  }, [bessLabel, customLimitMw, profileName, recommendation]);

  const verdictClass =
    recommendation.level === "high"
      ? styles.verdictHigh
      : recommendation.level === "medium"
        ? styles.verdictMedium
        : styles.verdictLow;

  const canApplyRecommended =
    isCustom &&
    recommendation.recommendedPowerMw > 0 &&
    (customBessMw !== recommendation.recommendedPowerMw ||
      customBessHours !== recommendation.recommendedHours);

  return (
    <div className={styles.accordionStack}>
      {/* Compact always-visible BESS Verdict Strip */}
      <div className={styles.verdictStrip} data-testid="knoten-verdict-strip">
        <div className={styles.verdictMain}>
          <span className={`${styles.verdictBadge} ${verdictClass}`}>
            {recommendation.badgeLabel}
          </span>
          <p className={styles.verdictHeadline}>
            <strong>Empfehlung:</strong> {recommendation.recommendedMode}
            {recommendation.recommendedPowerMw > 0 ? (
              <>
                {" "}
                · Mindestgröße{" "}
                <strong>
                  {recommendation.recommendedPowerMw}
                  {"\u00A0"}MW / {recommendation.recommendedEnergyMwh}
                  {"\u00A0"}MWh
                </strong>
              </>
            ) : null}
          </p>
        </div>
        <div className={styles.verdictActions}>
          {canApplyRecommended ? (
            <button
              type="button"
              className={styles.miniBtn}
              onClick={() =>
                onApplyRecommendedSizing(
                  recommendation.recommendedPowerMw,
                  recommendation.recommendedHours,
                )
              }
              data-testid="knoten-apply-sizing"
            >
              Empfohlene Größe anwenden
            </button>
          ) : null}
          <button
            type="button"
            className={styles.miniBtn}
            onClick={onCopyReport}
            data-testid="knoten-copy-report"
          >
            {copied ? "Kurzbericht kopiert ✓" : "Kurzbericht kopieren"}
          </button>
        </div>
      </div>

      {/* Accordion 1: Local CSV Import & Sample Substations */}
      <details className={styles.accordionCard} open={isCustom}>
        <summary className={styles.accordionSummary}>
          <span>
            <strong>Eigenes Umspannwerk prüfen (CSV 100{"\u00A0"}% lokal) &amp; Export</strong>
            <span className={styles.accordionSub}>
              Viertelstunden-Export direkt im Browser analysieren — kein Upload, kein Login
            </span>
          </span>
        </summary>
        <div className={styles.accordionBody}>
          <p className={styles.privacyBadge} data-testid="knoten-privacy-badge">
            100{"\u00A0"}% lokal im Browser — keine Datei verlässt Ihr Gerät, kein Server-Upload, kein Login.
            Akzeptiert 96-Viertelstunden- oder Mehrtages-CSVs (z.{"\u00A0"}B. „Uhrzeit;Last_MW“, Spitzentag wird
            automatisch erkannt).
          </p>

          <div className={styles.utilityHeadActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={onCsvFileChange}
              className={styles.srFileInput}
              aria-label="Eigene Viertelstunden-CSV lokal laden"
            />
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => fileInputRef.current?.click()}
              data-testid="knoten-csv-import"
            >
              Eigene CSV laden (lokal)
            </button>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={onDownloadCsv}
              data-testid="knoten-csv-export"
            >
              96{"\u00A0"}Viertelstunden als CSV
            </button>
            {isCustom ? (
              <button type="button" className={styles.miniBtn} onClick={onResetCustom}>
                Zurück zum Modellknoten
              </button>
            ) : null}
          </div>

          <p className={styles.chipGroupLabel} style={{ marginTop: "0.85rem" }}>
            Oder realistisches Beispiel-Umspannwerk mit 1 Klick testen
          </p>
          <div className={styles.sampleGrid}>
            {SAMPLE_SUBSTATION_PROFILES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className={styles.sampleBtn}
                onClick={() => onSelectSample(sample)}
                data-testid={`knoten-sample-${sample.id}`}
              >
                <strong>{sample.shortLabel}</strong>
                <span>{sample.description}</span>
              </button>
            ))}
          </div>

          {customNote ? <p className={styles.footnote}>{customNote}</p> : null}
          {customError ? (
            <p className={styles.customError} role="alert">
              {customError}
            </p>
          ) : null}

          {isCustom ? (
            <div className={styles.customSizingRow}>
              <div className={styles.controlGroup}>
                <p className={styles.chipGroupLabel}>BESS-Leistung</p>
                <div className={styles.chipRow} role="group" aria-label="Speicherleistung in MW">
                  {CUSTOM_BESS_POWER_MW.map((mw) => (
                    <button
                      key={mw}
                      type="button"
                      className={`${styles.chip}${customBessMw === mw ? ` ${styles.chipActive}` : ""}`}
                      aria-pressed={customBessMw === mw}
                      onClick={() => onSelectBessPower(mw)}
                    >
                      {mw}
                      {"\u00A0"}MW
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.controlGroup}>
                <p className={styles.chipGroupLabel}>Speicherdauer</p>
                <div className={styles.chipRow} role="group" aria-label="Speicherdauer in Stunden">
                  {CUSTOM_BESS_HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`${styles.chip}${customBessHours === h ? ` ${styles.chipActive}` : ""}`}
                      aria-pressed={customBessHours === h}
                      onClick={() => onSelectBessHours(h)}
                    >
                      {h}
                      {"\u00A0"}h ({customBessMw * h}
                      {"\u00A0"}MWh)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </details>

      {/* Accordion 2: Full 3-Mode Comparison, Limit Sensitivity & Engineering Diagnosis */}
      <details className={styles.accordionCard}>
        <summary className={styles.accordionSummary}>
          <span>
            <strong>Fahrweisen-Vergleich, Diagnose &amp; Grenze (±{customLimitMw}{"\u00A0"}MW)</strong>
            <span className={styles.accordionSub}>
              Ohne Speicher vs. Markt vs. Knotentreu · Schwellwerte ±40 bis ±120{"\u00A0"}MW
            </span>
          </span>
        </summary>
        <div className={styles.accordionBody}>
          <div className={styles.chipRow} role="group" aria-label="Eigene Knotengrenze in MW">
            {CUSTOM_LIMITS_MW.map((limit) => (
              <button
                key={limit}
                type="button"
                className={`${styles.chip}${customLimitMw === limit ? ` ${styles.chipActive}` : ""}`}
                aria-pressed={customLimitMw === limit}
                onClick={() => onSelectLimit(limit)}
              >
                ±{limit}
                {"\u00A0"}MW{limit === KNOTEN_LIMIT_MW ? " (Standard)" : ""}
              </button>
            ))}
          </div>

          <dl className={styles.utilityGrid}>
            <div className={styles.utilityStat}>
              <dt>Ohne Speicher (±{customLimitMw}{"\u00A0"}MW)</dt>
              <dd>
                <strong>
                  {recommendation.qhOverBase}
                  {"\u00A0"}Viertelstunden
                </strong>
                <span className={styles.utilitySub}>
                  Max. {fmtMw(recommendation.maxAbsBaseMw)} ({Math.round(recommendation.maxUtilBasePct)}
                  {"\u00A0"}%)
                </span>
              </dd>
            </div>
            <div className={styles.utilityStat}>
              <dt>Reines Preisfahren (Markt)</dt>
              <dd>
                <strong>
                  {recommendation.qhOverMarket}
                  {"\u00A0"}Viertelstunden
                </strong>
                <span className={styles.utilitySub}>
                  Max. {fmtMw(recommendation.maxAbsMarketMw)} ({Math.round(recommendation.maxUtilMarketPct)}
                  {"\u00A0"}%)
                </span>
              </dd>
            </div>
            <div className={styles.utilityStat}>
              <dt>Knotentreu (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG)</dt>
              <dd>
                <strong>
                  {recommendation.qhOverKnoten}
                  {"\u00A0"}Viertelstunden
                </strong>
                <span className={styles.utilitySub}>
                  Max. {fmtMw(recommendation.maxAbsKnotenMw)} ({Math.round(recommendation.maxUtilKnotenPct)}
                  {"\u00A0"}%)
                </span>
              </dd>
            </div>
          </dl>

          <div className={styles.diagnosisBox} data-testid="knoten-diagnosis">
            <p className={styles.chipGroupLabel} style={{ marginTop: 0 }}>
              Automatische Knoten-Diagnose
            </p>
            <ul className={styles.diagnosisList}>
              {recommendation.sentences.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <p className={styles.footnote}>
            {isCustom
              ? "Lokale Browser-Simulation: vergleicht den ungesteuerten Preis-Fahrplan (Laden in typischen Niedrigpreisfenstern, Entladen in Preisspitzen) mit einem knotentreuen Spitzenkappungs-BESS (Wirkungsgrad 92\u00A0%, Start-SoC 50\u00A0%)."
              : "Der Speicherfahrplan „knotentreu“ ist fest auf die 80\u00A0MW Modellgrenze optimiert. Die Schwellwert-Auswertung zeigt direkt an denselben 96\u00A0Viertelstunden, wie empfindlich der Knoten auf engere oder weitere Betriebsmittelgrenzen reagiert."}
          </p>
        </div>
      </details>
    </div>
  );
}
