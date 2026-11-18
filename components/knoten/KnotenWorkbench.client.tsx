"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { DisplayUnitNormalizer } from "@/components/v4/DisplayUnitNormalizer.client";
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
  KNOTEN_NODE_LABELS,
  KNOTEN_TYPEN,
  type KnotenBelegung,
  type KnotenCurvePayload,
  type KnotenDayRow,
  type KnotenFaktor,
  type KnotenTyp,
} from "@/lib/knoten/knotenTypes";

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
  const fazit = knotenFazitSatz(typ, row);
  const euro = knotenEuroHinweis(row);
  const dateBounds = bounds;

  const onDate = useCallback(
    (next: string) => {
      router.push(qs(belegung, typ, k, next));
    },
    [router, belegung, typ, k],
  );

  return (
    <DisplayUnitNormalizer>
    <div className={styles.root} data-testid="knoten-page">
      <SimulatorSubnav />
      <p className={styles.chipRow}>
        <span className={styles.modell}>MODELLKNOTEN</span>
      </p>
      <h1 className="v4-h1" style={{ marginBottom: "0.5rem" }}>
        Dein Knoten
      </h1>
      <p className="v4-lead" style={{ maxWidth: "52ch" }}>
        Drei Modellknoten mit derselben Preislogik wie auf /tag — hier mit Grenze am Umspannwerk statt bundesweiter
        Restlast.
      </p>
      <p className={styles.chipRow}>
        <Link href="/methodik#knoten-modell" className="v4-text-link">
          Quellen und Grenzen
        </Link>
      </p>

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
    </div>
    </DisplayUnitNormalizer>
  );
}