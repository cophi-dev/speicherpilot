"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { SimulatorSubnav } from "@/components/simulator/SimulatorSubnav";
import { KnotenChart } from "@/components/knoten/KnotenChart.client";
import styles from "@/components/knoten/knoten.module.css";
import { useKnotenTheme } from "@/components/knoten/useKnotenTheme";
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

function qs(belegung: KnotenBelegung, typ: KnotenTyp, k: KnotenFaktor, tag: string) {
  return `/knoten?belegung=${belegung}&typ=${typ}&k=${k}&tag=${tag}`;
}

export function KnotenWorkbench({
  belegung,
  typ,
  k,
  tag,
  row,
  curve,
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
  const router = useRouter();
  const [customLimitMw, setCustomLimitMw] = useState<number>(KNOTEN_LIMIT_MW);
  const fazit = knotenFazitSatz(typ, row);
  const euro = knotenEuroHinweis(row);
  const dateBounds = bounds;

  const limitStats = useMemo(
    () => ({
      base: summarizeSeries(curve.base, customLimitMw),
      markt: summarizeSeries(curve.fm, customLimitMw),
      knoten: summarizeSeries(curve.fk, customLimitMw),
    }),
    [curve.base, curve.fk, curve.fm, customLimitMw],
  );

  const onDownloadCsv = useCallback(() => {
    const header = "Uhrzeit;Ohne_Speicher_MW;Markt_MW;Knotentreu_MW;Grenze_MW";
    const rows = curve.base.map((baseVal, i) => {
      const fmVal = curve.fm[i] ?? 0;
      const fkVal = curve.fk[i] ?? 0;
      const fmt = (n: number) => n.toFixed(2).replace(".", ",");
      return `${slotTimeLabel(i)};${fmt(baseVal)};${fmt(fmVal)};${fmt(fkVal)};${customLimitMw}`;
    });
    const csv = `\uFEFF${[header, ...rows].join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speicherpilot-knoten-${typ}-x${k}-${tag}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [curve.base, curve.fk, curve.fm, customLimitMw, k, tag, typ]);

  const onDate = useCallback(
    (next: string) => {
      router.push(qs(belegung, typ, k, next));
    },
    [router, belegung, typ, k],
  );

  return (
    <div className={styles.root} data-testid="knoten-page">
      <SimulatorSubnav />
      <p className={styles.chipRow}>
        <span className={styles.modell}>MODELLKNOTEN</span>
      </p>
      <h1 className="v4-h1" style={{ marginBottom: "0.5rem" }}>
        Dein Knoten
      </h1>
      <p className="v4-lead" style={{ maxWidth: "60ch" }}>
        Drei Modellknoten (Wind Nord, Solar Süd, Stadt) mit 80{"\u00A0"}MW Grenze am Umspannwerk (2 × 40{"\u00A0"}MVA
        HS/MS): Wann überlastet reines Preisfahren den Knoten — und wie viel Day-Ahead-Erlös kostet eine knotentreue
        Fahrweise (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG)? Den nationalen Erlös-Spitzen-Kompromiss zeigt{" "}
        <Link href="/kompromiss" className="v4-text-link">
          Kompromiss
        </Link>
        .
      </p>
      <p className={styles.chipRow}>
        <Link href="/methodik#knoten-modell" className="v4-text-link">
          Quellen und Grenzen
        </Link>
      </p>

      <div className={styles.controlBar}>
        <div className={styles.controlGroup}>
          <p className={styles.chipGroupLabel}>Knotentyp</p>
          <div className={styles.chipRow} role="group" aria-label="Knotentyp">
            {KNOTEN_TYPEN.map((id) => (
              <Link
                key={id}
                href={qs(belegung, id, k, tag)}
                className={`${styles.chip}${id === typ ? ` ${styles.chipActive}` : ""}`}
                aria-current={id === typ ? "true" : undefined}
              >
                {KNOTEN_NODE_LABELS[id]}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <p className={styles.chipGroupLabel}>Flottenstufe am Knoten</p>
          <div className={styles.chipRow} role="group" aria-label="Flottenstufe">
            {KNOTEN_FAKTOREN.map((f) => (
              <Link
                key={f}
                href={qs(belegung, typ, f, tag)}
                className={`${styles.chip}${f === k ? ` ${styles.chipActive}` : ""}`}
                aria-current={f === k ? "true" : undefined}
              >
                ×{f}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <p className={styles.chipGroupLabel}>Belegung</p>
          <div className={styles.chipRow} role="group" aria-label="Belegung">
            {KNOTEN_BELEGUNGEN.map((b) => (
              <Link
                key={b}
                href={qs(b, typ, k, tag)}
                className={`${styles.chip}${b === belegung ? ` ${styles.chipActive}` : ""}`}
                aria-current={b === belegung ? "true" : undefined}
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
            value={tag}
            min={dateBounds.min}
            max={dateBounds.max}
            onChange={(e) => onDate(e.target.value)}
            data-testid="knoten-tag-input"
          />
        </div>
      </div>

      <p className={styles.fazit} data-testid="knoten-fazit">
        {fazit}
      </p>
      {euro ? (
        <p className={styles.footnote} data-testid="knoten-euro">
          {euro}
        </p>
      ) : null}

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
          Grenze / Schraffur
        </span>
      </div>

      <p className={styles.footnote}>{KNOTEN_ZACKEN_HINWEIS_DE}</p>

      <KnotenChart typ={typ} day={tag} k={k} curve={curve} colors={colors} />

      <section className={styles.utilityCard} aria-labelledby="knoten-utility-title">
        <div className={styles.utilityHead}>
          <div>
            <p className={styles.chipGroupLabel} style={{ marginTop: 0 }}>
              Grenzwert-Sensitivität &amp; Datenexport
            </p>
            <h2 id="knoten-utility-title" className={styles.utilityTitle}>
              Eigene Knotengrenze testen &amp; 96{"\u00A0"}Viertelstunden exportieren
            </h2>
          </div>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={onDownloadCsv}
            data-testid="knoten-csv-export"
          >
            96{"\u00A0"}Viertelstunden als CSV
          </button>
        </div>

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

        <dl className={styles.utilityGrid}>
          <div className={styles.utilityStat}>
            <dt>Ohne Speicher über ±{customLimitMw}{"\u00A0"}MW</dt>
            <dd>
              <strong>{limitStats.base.qhOver}{"\u00A0"}Viertelstunden</strong>
              <span className={styles.utilitySub}>Max. {formatDeMw(limitStats.base.maxAbs)}</span>
            </dd>
          </div>
          <div className={styles.utilityStat}>
            <dt>Markt-Fahrplan über ±{customLimitMw}{"\u00A0"}MW</dt>
            <dd>
              <strong>{limitStats.markt.qhOver}{"\u00A0"}Viertelstunden</strong>
              <span className={styles.utilitySub}>Max. {formatDeMw(limitStats.markt.maxAbs)}</span>
            </dd>
          </div>
          <div className={styles.utilityStat}>
            <dt>Knotentreu über ±{customLimitMw}{"\u00A0"}MW</dt>
            <dd>
              <strong>{limitStats.knoten.qhOver}{"\u00A0"}Viertelstunden</strong>
              <span className={styles.utilitySub}>Max. {formatDeMw(limitStats.knoten.maxAbs)}</span>
            </dd>
          </div>
        </dl>

        <p className={styles.footnote}>
          Der Speicherfahrplan „knotentreu“ ist fest auf die 80{"\u00A0"}MW Modellgrenze optimiert. Die Schwellwert-Auswertung zeigt direkt an denselben 96{"\u00A0"}Viertelstunden, wie empfindlich der Knoten auf engere oder weitere Betriebsmittelgrenzen reagiert.
        </p>
      </section>
    </div>
  );
}