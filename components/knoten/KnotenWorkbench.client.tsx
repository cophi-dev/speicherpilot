"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";

import { SimulatorSubnav } from "@/components/simulator/SimulatorSubnav";
import { KnotenChart } from "@/components/knoten/KnotenChart.client";
import { KnotenSingleLine } from "@/components/knoten/KnotenSingleLine.client";
import styles from "@/components/knoten/knoten.module.css";
import { useKnotenTheme } from "@/components/knoten/useKnotenTheme";
import {
  buildKnotenDiagnosis,
  buildSampleCustomProfile,
  parseQuarterHourCsv,
  simulateCustomKnotenBess,
} from "@/lib/knoten/customProfileSim";
import { knotenEuroHinweis, knotenFazitSatz } from "@/lib/knoten/knotenFazit";
import { KNOTEN_ZACKEN_HINWEIS_DE } from "@/lib/knoten/knotenZackenHinweis";
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
const CUSTOM_BESS_POWER_MW = [10, 20, 40] as const;
const CUSTOM_BESS_HOURS = [2, 4] as const;

function formatDeMw(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}\u00A0MW`;
}

function slotTimeLabel(index: number): string {
  const totalMinutes = index * 15;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function summarizeSeries(values: number[], limitMw: number) {
  let qhOver = 0;
  let maxAbs = 0;
  for (const v of values) {
    const abs = Math.abs(v);
    if (abs > limitMw + 1e-6) qhOver += 1;
    if (abs > maxAbs) maxAbs = abs;
  }
  return { qhOver, maxAbs };
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
  const [customProfile, setCustomProfile] = useState<{ values: number[]; label: string } | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customBessMw, setCustomBessMw] = useState<number>(20);
  const [customBessHours, setCustomBessHours] = useState<number>(2);
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

  const { belegung, typ, k, tag, row, curve } = scenario;
  const fazit = knotenFazitSatz(typ, row);
  const euro = knotenEuroHinweis(row);
  const dateBounds = bounds;

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
      customProfile
        ? simulateCustomKnotenBess(
            customProfile.values,
            customLimitMw,
            customBessMw,
            customBessMw * customBessHours,
          )
        : null,
    [customBessHours, customBessMw, customLimitMw, customProfile],
  );

  const activeCurve: KnotenCurvePayload = useMemo(
    () =>
      customSim
        ? { base: customSim.base, fm: customSim.base, fk: customSim.withBess }
        : curve,
    [curve, customSim],
  );

  const diagnosis = useMemo(
    () =>
      customSim
        ? customSim.diagnosis
        : buildKnotenDiagnosis(curve.base, curve.fk, customLimitMw, "knotentreuer Fahrweise"),
    [curve.base, curve.fk, customLimitMw, customSim],
  );

  const onCsvFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseQuarterHourCsv(text, file.name);
      if (parsed.ok) {
        setCustomProfile({ values: parsed.values, label: parsed.label });
        setCustomError(null);
      } else {
        setCustomError(parsed.error);
      }
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  }, []);

  const onLoadSampleProfile = useCallback(() => {
    setCustomProfile({
      values: buildSampleCustomProfile(),
      label: "Beispiel-Umspannwerk (PV-Mittag + Abendspitze)",
    });
    setCustomError(null);
  }, []);

  const limitStats = useMemo(
    () => ({
      base: summarizeSeries(activeCurve.base, customLimitMw),
      markt: summarizeSeries(activeCurve.fm, customLimitMw),
      knoten: summarizeSeries(activeCurve.fk, customLimitMw),
    }),
    [activeCurve.base, activeCurve.fk, activeCurve.fm, customLimitMw],
  );

  const onDownloadCsv = useCallback(() => {
    const header = customSim
      ? "Uhrzeit;Basislast_MW;Mit_BESS_Knotentreu_MW;BESS_Leistung_MW;SoC_Prozent;Grenze_MW"
      : "Uhrzeit;Ohne_Speicher_MW;Markt_MW;Knotentreu_MW;Grenze_MW";
    const fmt = (n: number) => n.toFixed(2).replace(".", ",");
    const rows = activeCurve.base.map((baseVal, i) => {
      if (customSim) {
        return `${slotTimeLabel(i)};${fmt(baseVal)};${fmt(customSim.withBess[i] ?? 0)};${fmt(customSim.bessDispatchMw[i] ?? 0)};${fmt(customSim.socPct[i] ?? 0)};${customLimitMw}`;
      }
      const fmVal = activeCurve.fm[i] ?? 0;
      const fkVal = activeCurve.fk[i] ?? 0;
      return `${slotTimeLabel(i)};${fmt(baseVal)};${fmt(fmVal)};${fmt(fkVal)};${customLimitMw}`;
    });
    const csv = `\uFEFF${[header, ...rows].join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = customSim
      ? `speicherpilot-eigenes-profil-${customBessMw}mw-${customLimitMw}mw.csv`
      : `speicherpilot-knoten-${typ}-x${k}-${tag}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [activeCurve.base, activeCurve.fk, activeCurve.fm, customBessMw, customLimitMw, customSim, k, tag, typ]);

  const onDate = useCallback(
    (next: string) => {
      switchScenario(activeSelection.belegung, activeSelection.typ, activeSelection.k, next);
    },
    [activeSelection.belegung, activeSelection.k, activeSelection.typ, switchScenario],
  );

  return (
    <div className={styles.root} data-testid="knoten-page">
      <SimulatorSubnav />
      <div className={styles.pageIntro}>
        <h1 className="v4-h1" style={{ marginBottom: "0.35rem" }}>
          Dein Knoten
        </h1>
        <p className="v4-lead" style={{ maxWidth: "58ch", marginBottom: "0.5rem" }}>
          80{"\u00A0"}MW Umspannwerk (2 × 40{"\u00A0"}MVA HS/MS): Wann überlastet Preisfahren den Knoten — und was
          kostet knotentreues Fahren (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG)?{" "}
          <Link href="/methodik#knoten-modell" className="v4-text-link">
            Methodik
          </Link>
        </p>
      </div>

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
            Weitere Filter: <strong>{KNOTEN_BELEGUNG_LABELS[activeSelection.belegung]}</strong> ·{" "}
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

      <div className={`${styles.smoothPanel}${isUpdating ? ` ${styles.smoothPanelUpdating}` : ""}`} aria-busy={isUpdating}>
        {customProfile ? (
          <div className={styles.customBanner} role="status">
            <span>
              <strong>Eigenes Profil aktiv (100{"\u00A0"}% lokal im Browser):</strong> {customProfile.label} · BESS{" "}
              {customBessMw}{"\u00A0"}MW / {customBessMw * customBessHours}{"\u00A0"}MWh
            </span>
            <button
              type="button"
              className={styles.miniBtn}
              onClick={() => {
                setCustomProfile(null);
                setCustomError(null);
              }}
            >
              Zurück zum Modellknoten
            </button>
          </div>
        ) : (
          <>
            <p className={styles.fazit} data-testid="knoten-fazit">
              {fazit}
            </p>
            {euro ? (
              <p className={styles.footnote} data-testid="knoten-euro">
                {euro}
              </p>
            ) : null}
          </>
        )}

        <KnotenSingleLine
          base={activeCurve.base}
          fm={activeCurve.fm}
          fk={activeCurve.fk}
          socPct={customSim?.socPct}
          limitMw={customLimitMw}
          isCustom={customProfile != null}
          colors={colors}
        />

        <div className={styles.legend} aria-hidden="true">
          <span className={styles.legendItem}>
            <span style={{ width: 14, height: 2, background: colors.gray, display: "inline-block" }} /> ohne Speicher
          </span>
          {!customProfile ? (
            <span className={styles.legendItem}>
              <span style={{ width: 14, height: 2, background: colors.rust, display: "inline-block" }} /> Markt
            </span>
          ) : null}
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
            Grenze / Schraffur
          </span>
        </div>

        <p className={styles.footnote}>{KNOTEN_ZACKEN_HINWEIS_DE}</p>

        <KnotenChart typ={typ} day={tag} k={k} curve={activeCurve} colors={colors} />
      </div>

      <div className={styles.accordionStack}>
        <details className={styles.accordionCard} open={customProfile != null}>
          <summary className={styles.accordionSummary}>
            <span>
              <strong>Eigenes Lastprofil testen (100{"\u00A0"}% lokal im Browser) &amp; CSV-Export</strong>
              <span className={styles.accordionSub}>
                Eigene 96{"\u00A0"}Viertelstunden lokal simulieren oder aktuelle Kurve exportieren
              </span>
            </span>
          </summary>
          <div className={styles.accordionBody}>
            <p className={styles.privacyBadge} data-testid="knoten-privacy-badge">
              100{"\u00A0"}% lokal im Browser — keine Datei verlässt Ihr Gerät, kein Server-Upload, kein Login. Akzeptiert generische 96-Viertelstunden-CSVs (z.{"\u00A0"}B. „Uhrzeit;Last_MW“).
            </p>

            <div className={styles.utilityHeadActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={onCsvFileChange}
                className={styles.srFileInput}
                aria-label="Eigene 96-Viertelstunden-CSV lokal laden"
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
                onClick={onLoadSampleProfile}
                data-testid="knoten-sample-profile"
              >
                Beispiel-Profil testen
              </button>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={onDownloadCsv}
                data-testid="knoten-csv-export"
              >
                96{"\u00A0"}Viertelstunden als CSV
              </button>
            </div>

            {customError ? (
              <p className={styles.customError} role="alert">
                {customError}
              </p>
            ) : null}

            {customProfile ? (
              <div className={styles.customSizingRow}>
                <div className={styles.controlGroup}>
                  <p className={styles.chipGroupLabel}>Eigener BESS (Leistung)</p>
                  <div className={styles.chipRow} role="group" aria-label="Speicherleistung in MW">
                    {CUSTOM_BESS_POWER_MW.map((mw) => (
                      <button
                        key={mw}
                        type="button"
                        className={`${styles.chip}${customBessMw === mw ? ` ${styles.chipActive}` : ""}`}
                        aria-pressed={customBessMw === mw}
                        onClick={() => setCustomBessMw(mw)}
                      >
                        {mw}{"\u00A0"}MW
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
                        onClick={() => setCustomBessHours(h)}
                      >
                        {h}{"\u00A0"}h ({customBessMw * h}{"\u00A0"}MWh)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <details className={styles.accordionCard}>
          <summary className={styles.accordionSummary}>
            <span>
              <strong>Diagnose &amp; eigene Knotengrenze (±{customLimitMw}{"\u00A0"}MW)</strong>
              <span className={styles.accordionSub}>
                3-Satz-Auswertung &amp; Schwellwert-Sensitivität (±40 bis ±120{"\u00A0"}MW)
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
                  onClick={() => setCustomLimitMw(limit)}
                >
                  ±{limit}
                  {"\u00A0"}MW{limit === KNOTEN_LIMIT_MW ? " (Standard)" : ""}
                </button>
              ))}
            </div>

            <div className={styles.diagnosisBox} data-testid="knoten-diagnosis">
              <p className={styles.chipGroupLabel} style={{ marginTop: 0 }}>
                Automatische Knoten-Diagnose
              </p>
              <ul className={styles.diagnosisList}>
                {diagnosis.sentences.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>

            <dl className={styles.utilityGrid}>
              <div className={styles.utilityStat}>
                <dt>Ohne Speicher über ±{customLimitMw}{"\u00A0"}MW</dt>
                <dd>
                  <strong>{limitStats.base.qhOver}{"\u00A0"}Viertelstunden</strong>
                  <span className={styles.utilitySub}>Max. {formatDeMw(limitStats.base.maxAbs)}</span>
                </dd>
              </div>
              {!customProfile ? (
                <div className={styles.utilityStat}>
                  <dt>Markt-Fahrplan über ±{customLimitMw}{"\u00A0"}MW</dt>
                  <dd>
                    <strong>{limitStats.markt.qhOver}{"\u00A0"}Viertelstunden</strong>
                    <span className={styles.utilitySub}>Max. {formatDeMw(limitStats.markt.maxAbs)}</span>
                  </dd>
                </div>
              ) : null}
              <div className={styles.utilityStat}>
                <dt>Knotentreu über ±{customLimitMw}{"\u00A0"}MW</dt>
                <dd>
                  <strong>{limitStats.knoten.qhOver}{"\u00A0"}Viertelstunden</strong>
                  <span className={styles.utilitySub}>Max. {formatDeMw(limitStats.knoten.maxAbs)}</span>
                </dd>
              </div>
            </dl>

            <p className={styles.footnote}>
              {customProfile
                ? "Die lokale Browser-Simulation optimiert den BESS deterministisch auf Spitzenkappung und Rückspeise-Aufnahme an Ihrer gewählten Grenze (Wirkungsgrad 92\u00A0%, Start-SoC 50\u00A0%)."
                : "Der Speicherfahrplan „knotentreu“ ist fest auf die 80\u00A0MW Modellgrenze optimiert. Die Schwellwert-Auswertung zeigt direkt an denselben 96\u00A0Viertelstunden, wie empfindlich der Knoten auf engere oder weitere Betriebsmittelgrenzen reagiert."}
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}