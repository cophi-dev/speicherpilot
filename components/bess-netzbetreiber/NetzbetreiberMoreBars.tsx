"use client";

import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantityUnit } from "@/lib/formatQuantity";
import type { BundeslandKarteDatum } from "@/lib/bessKarte3d/types";
import { abregelungOhneOffshore } from "@/lib/bessKarte3d/logic";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

function formatMw(mw: number): string {
  if (mw >= 1000) return insertDisplayUnitNbsp(formatQuantityUnit(mw / 1000, "de", 2, "GW"));
  if (mw < 10) return insertDisplayUnitNbsp(formatQuantityUnit(mw, "de", 1, "MW"));
  return insertDisplayUnitNbsp(formatQuantityUnit(mw, "de", 0, "MW"));
}

export function NetzbetreiberBlBessBars({
  rows,
}: {
  rows: readonly BundeslandKarteDatum[];
}) {
  const sorted = [...rows].sort((a, b) => b.nettoMw - a.nettoMw);
  const maxMw = Math.max(...sorted.map((r) => r.nettoMw), 0.1);
  return (
    <div className={styles.vnbBars} role="list" aria-label="BESS-Nettoleistung je Bundesland (alle 16 Länder)">
      {sorted.map((row) => {
        const pct = (row.nettoMw / maxMw) * 100;
        const ohne = abregelungOhneOffshore(row);
        const off = row.abregelung2025OffshoreGwh ?? 0;
        const gwh = (v: number) => insertDisplayUnitNbsp(formatQuantityUnit(v, "de", 2, "GWh"));
        const abregLabel =
          row.abregelung2025Gwh === null || ohne === null
            ? "EE-Redispatch 2025: k. A."
            : off > 0
              ? `EE-Redispatch 2025 ohne Wind Offshore: ${gwh(ohne)} (gesamt ${gwh(row.abregelung2025Gwh)}, davon Wind Offshore ${gwh(off)})`
              : `EE-Redispatch 2025: ${gwh(row.abregelung2025Gwh)}`;
        return (
          <div className={styles.vnbBarRow} role="listitem" key={row.kuerzel}>
            <span className={`${styles.vnbBarLabel} num`} title={abregLabel}>
              {row.bundesland}
            </span>
            <div className={styles.vnbBarTrack} aria-hidden="true">
              <div className={styles.vnbBarFillOther} style={{ width: `${pct}%`, opacity: 0.55 }} />
            </div>
            <span className={`${styles.vnbBarValue} num`}>{formatMw(row.nettoMw)}</span>
          </div>
        );
      })}
    </div>
  );
}
