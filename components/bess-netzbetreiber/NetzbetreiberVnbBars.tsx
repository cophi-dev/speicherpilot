"use client";

import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import type { G2BarRow } from "@/lib/bessNetzbetreiber/prepareModel";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { formatQuantityUnit } from "@/lib/formatQuantity";

function formatBarMw(mw: number): string {
  if (mw >= 1000) {
    return insertDisplayUnitNbsp(formatQuantityUnit(mw / 1000, "de", 2, "GW"));
  }
  return insertDisplayUnitNbsp(formatQuantityUnit(mw, "de", 0, "MW"));
}

export function NetzbetreiberVnbBars({ rows }: { rows: G2BarRow[] }) {
  const maxMw = Math.max(...rows.map((r) => r.bruttoMw), 1);
  return (
    <div className={styles.vnbBars} role="list" aria-label="Bruttoleistung je Verteilnetzbetreiber">
      {rows.map((row) => {
        const pct = (row.bruttoMw / maxMw) * 100;
        return (
          <div className={styles.vnbBarRow} role="listitem" key={row.key}>
            <span className={`${styles.vnbBarLabel} num`}>{row.fullLabel}</span>
            <div className={styles.vnbBarTrack} aria-hidden="true">
              <div
                className={row.isEonGroup ? styles.vnbBarFillEon : styles.vnbBarFillOther}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`${styles.vnbBarValue} num`}>{formatBarMw(row.bruttoMw)}</span>
          </div>
        );
      })}
    </div>
  );
}