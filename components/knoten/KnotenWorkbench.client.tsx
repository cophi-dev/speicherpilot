"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";

import { SimulatorSubnav } from "@/components/simulator/SimulatorSubnav";
import { KnotenChart } from "@/components/knoten/KnotenChart.client";
import { KnotenSingleLine } from "@/components/knoten/KnotenSingleLine.client";
import styles from "@/components/knoten/knoten.module.css";
import { useKnotenTheme } from "@/components/knoten/useKnotenTheme";
import {
  buildAnalyticsReportText,
  buildKnotenRecommendation,
  parseQuarterHourCsv,
  SAMPLE_SUBSTATION_PROFILES,
  simulateCustomKnotenBess,
  type SampleSubstationProfile,
} from "@/lib/knoten/customProfileSim";
import { knotenFazitSatz } from "@/lib/knoten/knotenFazit";
import {
  KNOTEN_BELEGUNG_LABELS,
  KNOTEN_BELEGUNGEN,
  KNOTEN_FAKTOREN,
  KNOTEN_LIMIT_MW,
  KNOTEN_NODE_LABELS,
  KNOTEN_TYPEN,
  type KnotenBelegung,
  type KnotenCurvePayload,
  type KnotenDayRow,
  type KnotenFaktor,
  type KnotenTyp,
} from "@/lib/knoten/knotenTypes";

const CUSTOM_LIMITS_MW = [40, 60, 80, 100, 120] as const;
const CUSTOM_BESS_POWER_MW = [10, 15, 20, 30, 40] as const;
const CUSTOM_BESS_HOURS = [2, 4] as const;

type WorkbenchTab = "modell" | "eigenes";

function slotTimeLabel(index: number): string {
  const totalMinutes = index * 15;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

type KnotenScenarioState = {
  belegung: KnotenBelegung;
  typ: KnotenTyp;
  k: KnotenFaktor;
  tag: string;
  row: KnotenDayRow;
  curve: KnotenCurvePayload;
};

function cacheKey(belegung: KnotenBelegung, typ: KnotenTyp, k: KnotenFaktor, tag: string) {
  return `${belegung}|${typ}|${k}|${tag}`;
}

function qs(belegung: KnotenBelegung, typ: KnotenTyp, k: KnotenFaktor, tag: string) {
  return `/knoten?belegung=${belegung}&typ=${typ}&k=${k}&tag=${tag}`;
}

function apiQs(belegung: KnotenBelegung, typ: KnotenTyp, k: KnotenFaktor, tag: string) {
  return `/api/knoten?belegung=${belegung}&typ=${typ}&k=${k}&tag=${tag}`;
}

export function KnotenWorkbench({
  belegung: initialBelegung,
  typ: initialTyp,
  k: initialK,
  tag: initialTag,
  row: initialRow,
  curve: initialCurve,
  bounds,
}: {
  belegung: KnotenBelegung;
  typ: KnotenTyp;
  k: KnotenFaktor;
  tag: string;
  row: KnotenDayRow;
  curve: KnotenCurvePayload;
  bounds: { min: string; max: string };
}) {
  const { colors } = useKnotenTheme();
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("modell");
  const [scenario, setScenario] = useState<KnotenScenarioState>({
    belegung: initialBelegung,
    typ: initialTyp,
    k: initialK,
    tag: initialTag,
    row: initialRow,
    curve: initialCurve,
  });
  const [activeSelection, setActiveSelection] = useState({
    belegung: initialBelegung,
    typ: initialTyp,
    k: initialK,
    tag: initialTag,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [customLimitMw, setCustomLimitMw] = useState<number>(KNOTEN_LIMIT_MW);
  const [customProfile, setCustomProfile] = useState<{
    id?: string;
    values: number[];
    label: string;
    note?: string;
  }>(() => {
    const def = SAMPLE_SUBSTATION_PROFILES[2]!;
    return { id: def.id, values: def.values, label: def.label, note: def.description };
  });
  const [customError, setCustomError] = useState<string | null>(null);
  const [customBessMw, setCustomBessMw] = useState<number>(20);
  const [customBessHours, setCustomBessHours] = useState<number>(2);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cacheRef = useRef<Map<string, KnotenScenarioState>>(
    new Map([
      [
        cacheKey(initialBelegung, initialTyp, initialK, initialTag),
        {
          belegung: initialBelegung,
          typ: initialTyp,
          k: initialK,
          tag: initialTag,
          row: initialRow,
          curve: initialCurve,
        },
      ],
    ]),
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const next: KnotenScenarioState = {
      belegung: initialBelegung,
      typ: initialTyp,
      k: initialK,
      tag: initialTag,
      row: initialRow,
      curve: initialCurve,
    };
    cacheRef.current.set(cacheKey(initialBelegung, initialTyp, initialK, initialTag), next);
    setScenario(next);
    setActiveSelection({ belegung: initialBelegung, typ: initialTyp, k: initialK, tag: initialTag });
  }, [initialBelegung, initialCurve, initialK, initialRow, initialTag, initialTyp]);

  const { typ, k, tag, row, curve } = scenario;
  const fazit = knotenFazitSatz(typ, row);
  const dateBounds = bounds;
  const isCustom = activeTab === "eigenes";

  const switchScenario = useCallback(
    (nextBelegung: KnotenBelegung, nextTyp: KnotenTyp, nextK: KnotenFaktor, nextTag: string) => {
      if (!nextTag) return;
      const key = cacheKey(nextBelegung, nextTyp, nextK, nextTag);
      setActiveSelection({ belegung: nextBelegung, typ: nextTyp, k: nextK, tag: nextTag });

      const nextUrl = qs(nextBelegung, nextTyp, nextK, nextTag);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextUrl);
      }

      const cached = cacheRef.current.get(key);
      if (cached) {
        abortRef.current?.abort();
        setScenario(cached);
        setIsUpdating(false);
        return;
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setIsUpdating(true);

      fetch(apiQs(nextBelegung, nextTyp, nextK, nextTag), { signal: ctrl.signal })
        .then((res) => {
          if (!res.ok) throw new Error("Knotendaten konnten nicht geladen werden");
          return res.json() as Promise<KnotenScenarioState>;
        })
        .then((payload) => {
          if (ctrl.signal.aborted) return;
          const resolvedKey = cacheKey(payload.belegung, payload.typ, payload.k, payload.tag);
          cacheRef.current.set(key, payload);
          cacheRef.current.set(resolvedKey, payload);
          setScenario(payload);
          setActiveSelection({
            belegung: payload.belegung,
            typ: payload.typ,
            k: payload.k,
            tag: payload.tag,
          });
          if (typeof window !== "undefined") {
            window.history.replaceState(
              null,
              "",
              qs(payload.belegung, payload.typ, payload.k, payload.tag),
            );
          }
          setIsUpdating(false);
        })
        .catch((err: Error) => {
          if (err.name === "AbortError") return;
          setIsUpdating(false);
        });
    },
    [],
  );

  const onChipClick = useCallback(
    (
      event: MouseEvent<HTMLAnchorElement>,
      nextBelegung: KnotenBelegung,
      nextTyp: KnotenTyp,
      nextK: KnotenFaktor,
      nextTag: string,
    ) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      switchScenario(nextBelegung, nextTyp, nextK, nextTag);
    },
    [switchScenario],
  );

  const customSim = useMemo(
    () =>
      isCustom
        ? simulateCustomKnotenBess(
            customProfile.values,
            customLimitMw,
            customBessMw,
            customBessMw * customBessHours,
          )
        : null,
    [customBessHours, customBessMw, customLimitMw, customProfile.values, isCustom],
  );

  const activeCurve: KnotenCurvePayload = useMemo(
    () =>
      customSim
        ? { base: customSim.base, fm: customSim.market, fk: customSim.withBess }
        : curve,
    [curve, customSim],
  );

  const recommendation = useMemo(
    () =>
      customSim
        ? customSim.recommendation
        : buildKnotenRecommendation(curve.base, curve.fm, curve.fk, customLimitMw),
    [curve.base, curve.fk, curve.fm, customLimitMw, customSim],
  );

  const onCsvFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseQuarterHourCsv(text, file.name);
      if (parsed.ok) {
        setCustomProfile({ values: parsed.values, label: parsed.label, note: parsed.note });
        setCustomError(null);
        setActiveTab("eigenes");
      } else {
        setCustomError(parsed.error);
      }
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  }, []);

  const onSelectSample = useCallback((sample: SampleSubstationProfile) => {
    setCustomLimitMw(sample.defaultLimitMw);
    setCustomProfile({
      id: sample.id,
      values: sample.values,
      label: sample.label,
      note: sample.description,
    });
    setCustomError(null);
  }, []);

  const onDownloadCsv = useCallback(() => {
    const header = customSim
      ? "Uhrzeit;Basislast_MW;Markt_MW;Mit_BESS_Knotentreu_MW;BESS_Leistung_MW;SoC_Prozent;Grenze_MW"
      : "Uhrzeit;Ohne_Speicher_MW;Markt_MW;Knotentreu_MW;Grenze_MW";
    const fmt = (n: number) => n.toFixed(2).replace(".", ",");
    const rows = activeCurve.base.map((baseVal, i) => {
      if (customSim) {
        return `${slotTimeLabel(i)};${fmt(baseVal)};${fmt(customSim.market[i] ?? 0)};${fmt(customSim.withBess[i] ?? 0)};${fmt(customSim.bessDispatchMw[i] ?? 0)};${fmt(customSim.socPct[i] ?? 0)};${customLimitMw}`;
      }
      return `${slotTimeLabel(i)};${fmt(baseVal)};${fmt(activeCurve.fm[i] ?? 0)};${fmt(activeCurve.fk[i] ?? 0)};${customLimitMw}`;
    });
    const csv = `\uFEFF${[header, ...rows].join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = customSim
      ? `speicherpilot-eigenes-uw-${customBessMw}mw-${customLimitMw}mw.csv`
      : `speicherpilot-knoten-${typ}-x${k}-${tag}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [activeCurve.base, activeCurve.fk, activeCurve.fm, customBessMw, customLimitMw, customSim, k, tag, typ]);

  const onCopyReport = useCallback(() => {
    const text = buildAnalyticsReportText({
      profileName: isCustom ? customProfile.label : `${KNOTEN_NODE_LABELS[typ]} · ×${k} · ${tag}`,
      limitMw: customLimitMw,
      recommendation,
      bessLabel: isCustom ? `${customBessMw}\u00A0MW / ${customBessMw * customBessHours}\u00A0MWh` : "Modellknoten",
    });
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2400);
      });
    }
  }, [customBessHours, customBessMw, customLimitMw, customProfile.label, isCustom, k, recommendation, tag, typ]);

  const onDate = useCallback(
    (next: string) => {
      switchScenario(activeSelection.belegung, activeSelection.typ, activeSelection.k, next);
    },
    [activeSelection.belegung, activeSelection.k, activeSelection.typ, switchScenario],
  );

  const verlustLabel =
    row.verlustPct > 0.05
      ? `nur ${row.verlustPct.toFixed(1).replace(".", ",")}\u00A0% weniger Erlös`
      : "ohne Erlösverlust";

  const canApplyRecommended =
    isCustom &&
    recommendation.recommendedPowerMw > 0 &&
    (customBessMw !== recommendation.recommendedPowerMw ||
      customBessHours !== recommendation.recommendedHours);

  const verdictClass =
    recommendation.level === "high"
      ? styles.verdictHigh
      : recommendation.level === "medium"
        ? styles.verdictMedium
        : styles.verdictLow;

  return (
    <div className={styles.root} data-testid="knoten-page">
      <SimulatorSubnav />

      <div className={styles.pageIntro}>
        <h1 className="v4-h1" style={{ marginBottom: "0.25rem" }}>
          Dein Knoten
        </h1>
        <p className="v4-lead" style={{ maxWidth: "56ch", marginBottom: "0.6rem" }}>
          80{"\u00A0"}MW Umspannwerk: Wann überlastet reines Preisfahren den Trafo — und was bringt ein
          Leistungsdeckel (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG)?{" "}
          <Link href="/methodik#knoten-modell" className="v4-text-link">
            Methodik
          </Link>
        </p>
      </div>

      {/* Clean 2-Tab Switcher: Modellknoten vs. Eigenes Umspannwerk (CSV lokal) */}
      <div className={styles.tabBar} role="tablist" aria-label="Knoten-Modus">
        <button
          type="button"
          role="tab"
          aria-selected={!isCustom}
          className={`${styles.tabBtn}${!isCustom ? ` ${styles.tabBtnActive}` : ""}`}
          onClick={() => setActiveTab("modell")}
          data-testid="knoten-tab-modell"
        >
          Modellknoten (Wind · Solar · Stadt)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isCustom}
          className={`${styles.tabBtn}${isCustom ? ` ${styles.tabBtnActive}` : ""}`}
          onClick={() => setActiveTab("eigenes")}
          data-testid="knoten-tab-eigenes"
        >
          Eigenes Umspannwerk (CSV lokal)
        </button>
      </div>

      {/* TAB 1: Modellknoten Controls */}
      {!isCustom ? (
        <div className={styles.controlBar}>
          <div className={styles.controlGroup}>
            <p className={styles.chipGroupLabel}>Knotentyp</p>
            <div className={styles.chipRow} role="group" aria-label="Knotentyp">
              {KNOTEN_TYPEN.map((id) => (
                <Link
                  key={id}
                  href={qs(activeSelection.belegung, id, activeSelection.k, activeSelection.tag)}
                  scroll={false}
                  prefetch={false}
                  data-no-nav-progress=""
                  onClick={(e) => onChipClick(e, activeSelection.belegung, id, activeSelection.k, activeSelection.tag)}
                  className={`${styles.chip}${id === activeSelection.typ ? ` ${styles.chipActive}` : ""}`}
                  aria-current={id === activeSelection.typ ? "true" : undefined}
                >
                  {KNOTEN_NODE_LABELS[id]}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.chipGroupLabel}>Flottenstufe</p>
            <div className={styles.chipRow} role="group" aria-label="Flottenstufe">
              {KNOTEN_FAKTOREN.map((f) => (
                <Link
                  key={f}
                  href={qs(activeSelection.belegung, activeSelection.typ, f, activeSelection.tag)}
                  scroll={false}
                  prefetch={false}
                  data-no-nav-progress=""
                  onClick={(e) => onChipClick(e, activeSelection.belegung, activeSelection.typ, f, activeSelection.tag)}
                  className={`${styles.chip}${f === activeSelection.k ? ` ${styles.chipActive}` : ""}`}
                  aria-current={f === activeSelection.k ? "true" : undefined}
                >
                  ×{f}
                </Link>
              ))}
            </div>
          </div>

          <details className={styles.filterDetails}>
            <summary className={styles.filterSummary}>
              Belegung &amp; Tag: <strong>{KNOTEN_BELEGUNG_LABELS[activeSelection.belegung]}</strong> ·{" "}
              <strong>{activeSelection.tag}</strong>
            </summary>
            <div className={styles.filterDetailsBody}>
              <div className={styles.controlGroup}>
                <p className={styles.chipGroupLabel}>Belegung</p>
                <div className={styles.chipRow} role="group" aria-label="Belegung">
                  {KNOTEN_BELEGUNGEN.map((b) => (
                    <Link
                      key={b}
                      href={qs(b, activeSelection.typ, activeSelection.k, activeSelection.tag)}
                      scroll={false}
                      prefetch={false}
                      data-no-nav-progress=""
                      onClick={(e) => onChipClick(e, b, activeSelection.typ, activeSelection.k, activeSelection.tag)}
                      className={`${styles.chip}${b === activeSelection.belegung ? ` ${styles.chipActive}` : ""}`}
                      aria-current={b === activeSelection.belegung ? "true" : undefined}
                    >
                      {KNOTEN_BELEGUNG_LABELS[b]}
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.controls}>
                <label htmlFor="knoten-tag" className={styles.chipGroupLabel}>
                  Tag
                </label>
                <input
                  id="knoten-tag"
                  type="date"
                  className={styles.dateInput}
                  value={activeSelection.tag}
                  min={dateBounds.min}
                  max={dateBounds.max}
                  onChange={(e) => onDate(e.target.value)}
                  data-testid="knoten-tag-input"
                />
              </div>
            </div>
          </details>
        </div>
      ) : (
        /* TAB 2: Eigenes Umspannwerk (CSV lokal) Controls */
        <div className={styles.controlBar}>
          <div style={{ width: "100%" }}>
            <p className={styles.privacyBadge} data-testid="knoten-privacy-badge">
              100{"\u00A0"}% lokal im Browser — keine Datei verlässt Ihr Gerät, kein Server-Upload, kein Login.
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
              {SAMPLE_SUBSTATION_PROFILES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className={`${styles.miniBtn}${customProfile.id === sample.id ? ` ${styles.miniBtnActive}` : ""}`}
                  onClick={() => onSelectSample(sample)}
                  data-testid={`knoten-sample-${sample.id}`}
                >
                  {sample.shortLabel}
                </button>
              ))}
            </div>
            {customError ? (
              <p className={styles.customError} role="alert" style={{ marginTop: "0.5rem" }}>
                {customError}
              </p>
            ) : null}
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.chipGroupLabel}>BESS-Leistung</p>
            <div className={styles.chipRow} role="group" aria-label="Speicherleistung in MW">
              {CUSTOM_BESS_POWER_MW.map((mw) => (
                <button
                  key={mw}
                  type="button"
                  className={`${styles.chip}${customBessMw === mw ? ` ${styles.chipActive}` : ""}`}
                  aria-pressed={customBessMw === mw}
                  onClick={() => setCustomBessMw(mw)}
                >
                  {mw}
                  {"\u00A0"}MW
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.chipGroupLabel}>Dauer</p>
            <div className={styles.chipRow} role="group" aria-label="Speicherdauer in Stunden">
              {CUSTOM_BESS_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`${styles.chip}${customBessHours === h ? ` ${styles.chipActive}` : ""}`}
                  aria-pressed={customBessHours === h}
                  onClick={() => setCustomBessHours(h)}
                >
                  {h}
                  {"\u00A0"}h ({customBessMw * h}
                  {"\u00A0"}MWh)
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.chipGroupLabel}>Grenze</p>
            <div className={styles.chipRow} role="group" aria-label="Knotengrenze in MW">
              {CUSTOM_LIMITS_MW.map((limit) => (
                <button
                  key={limit}
                  type="button"
                  className={`${styles.chip}${customLimitMw === limit ? ` ${styles.chipActive}` : ""}`}
                  aria-pressed={customLimitMw === limit}
                  onClick={() => setCustomLimitMw(limit)}
                >
                  ±{limit}
                  {"\u00A0"}MW
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instant 2-Card Aha Comparison: Markt vs. Knotentreu */}
      <div className={`${styles.smoothPanel}${isUpdating ? ` ${styles.smoothPanelUpdating}` : ""}`} aria-busy={isUpdating}>
        <div className={styles.ahaGrid} data-testid="knoten-aha-grid">
          <div className={`${styles.ahaCard}${recommendation.qhOverMarket > 0 ? ` ${styles.ahaCardAlert}` : ""}`}>
            <span className={styles.ahaKicker}>Reines Preisfahren (Markt)</span>
            <strong className={styles.ahaNumber}>
              {recommendation.qhOverMarket}× Überlast
            </strong>
            <span className={styles.ahaSub}>
              Max. {Math.round(recommendation.maxUtilMarketPct)}
              {"\u00A0"}% Trafo-Auslastung (±{customLimitMw}
              {"\u00A0"}MW)
            </span>
          </div>
          <div className={`${styles.ahaCard} ${styles.ahaCardOk}`}>
            <span className={styles.ahaKicker}>Knotentreu (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG)</span>
            <strong className={styles.ahaNumber}>
              {recommendation.qhOverKnoten}× Überlast
            </strong>
            <span className={styles.ahaSub}>
              Max. {Math.round(recommendation.maxUtilKnotenPct)}
              {"\u00A0"}% · {isCustom ? `${customBessMw}\u00A0MW / ${customBessMw * customBessHours}\u00A0MWh` : verlustLabel}
            </span>
          </div>
        </div>

        {/* Concise Fazit or Custom Recommendation Strip */}
        {!isCustom ? (
          <p className={styles.fazitCompact} data-testid="knoten-fazit">
            {fazit}
          </p>
        ) : (
          <div className={styles.verdictStrip} data-testid="knoten-verdict-strip" style={{ marginBottom: "0.75rem" }}>
            <div className={styles.verdictMain}>
              <span className={`${styles.verdictBadge} ${verdictClass}`}>
                {recommendation.badgeLabel}
              </span>
              <p className={styles.verdictHeadline}>
                <strong>{customProfile.label}:</strong> {recommendation.recommendedMode}
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
                  onClick={() => {
                    setCustomBessMw(recommendation.recommendedPowerMw);
                    setCustomBessHours(recommendation.recommendedHours);
                  }}
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
              <button
                type="button"
                className={styles.miniBtn}
                onClick={onDownloadCsv}
                data-testid="knoten-csv-export"
              >
                CSV exportieren
              </button>
            </div>
          </div>
        )}

        <KnotenSingleLine
          base={activeCurve.base}
          fm={activeCurve.fm}
          fk={activeCurve.fk}
          socPct={customSim?.socPct}
          limitMw={customLimitMw}
          isCustom={isCustom}
          colors={colors}
        />

        <div className={styles.legend} aria-hidden="true">
          <span className={styles.legendItem}>
            <span style={{ width: 14, height: 2, background: colors.gray, display: "inline-block" }} /> ohne Speicher
          </span>
          <span className={styles.legendItem}>
            <span style={{ width: 14, height: 2, background: colors.rust, display: "inline-block" }} /> Markt
          </span>
          <span className={styles.legendItem}>
            <span style={{ width: 14, height: 2, background: colors.teal, display: "inline-block" }} /> knotentreu
          </span>
          <span className={styles.legendItem}>
            <span
              style={{
                width: 14,
                height: 0,
                borderTop: `2px dashed ${colors.muted}`,
                display: "inline-block",
              }}
            />{" "}
            Grenze (±{customLimitMw}
            {"\u00A0"}MW)
          </span>
        </div>

        <KnotenChart typ={typ} day={tag} k={k} curve={activeCurve} colors={colors} />
      </div>

      {/* Single quiet footer bar on Modellknoten for CSV Export + Limit check */}
      {!isCustom ? (
        <details className={styles.accordionCard} style={{ marginTop: "1rem" }}>
          <summary className={styles.accordionSummary}>
            <span>
              <strong>Datenexport (CSV) &amp; eigene Grenze (±{customLimitMw}{"\u00A0"}MW)</strong>
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
                  onClick={() => setCustomLimitMw(limit)}
                >
                  ±{limit}
                  {"\u00A0"}MW
                </button>
              ))}
            </div>
            <div className={styles.utilityHeadActions} style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={onDownloadCsv}
                data-testid="knoten-csv-export"
              >
                96{"\u00A0"}Viertelstunden als CSV
              </button>
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
        </details>
      ) : null}
    </div>
  );
}
