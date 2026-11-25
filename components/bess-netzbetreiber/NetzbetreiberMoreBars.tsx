"use client";

import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantityUnit } from "@/lib/formatQuantity";
import type { BundeslandKarteDatum } from "@/lib/bessKarte3d/types";
import type { GrowthBucket } from "@/lib/bessNetzbetreiber/prepareModel";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

function formatMw(mw: number): string {
  if (mw >= 1000) return insertDisplayUnitNbsp(formatQuantityUnit(mw / 1000, "de", 2, "GW"));
  if (mw < 10) return insertDisplayUnitNbsp(formatQuantityUnit(mw, "de", 1, "MW"));
  return insertDisplayUnitNbsp(formatQuantityUnit(mw, "de", 0, "MW"));
}

function isEonGrowthKey(key: string): boolean {
  return key === "eon_kern" || key === "mitnetz_envia" || key.startsWith("eon");
}

export function NetzbetreiberG3Bars({ rows }: { rows: GrowthBucket[] }) {
  const maxTotal = Math.max(...rows.map((r) => r.vor2026Mw + r.y2026Mw), 1);
  return (
    <div className={styles.vnbBars} role="list" aria-label="Bestand vor 2026 und Zubau 2026 (netto) je Netzbetreibergruppe">
      {rows.map((row) => {
        const total = row.vor2026Mw + row.y2026Mw;
        const trackPct = (total / maxTotal) * 100;
        const accent = isEonGrowthKey(row.key);
        return (
          <div className={styles.vnbBarRow} role="listitem" key={row.key}>
            <span className={`${styles.vnbBarLabel} num`}>{row.label}</span>
            <div className={styles.vnbBarTrackStack} aria-hidden="true">
              <div className={styles.vnbBarStackInner} style={{ width: `${trackPct}%` }}>
                {row.vor2026Mw > 0 ? (
                  <span className={styles.vnbBarFillOther} style={{ width: `${(row.vor2026Mw / total) * 100}%` }} />
                ) : null}
                {row.y2026Mw > 0 ? (
                  <span
                    className={accent ? styles.vnbBarFillEon : styles.vnbBarFillOther}
                    style={{ width: `${(row.y2026Mw / total) * 100}%`, opacity: accent ? 1 : 0.65 }}
                  />
                ) : null}
              </div>
            </div>
            <span className={`${styles.vnbBarValue} num`}>{formatMw(total)}</span>
          </div>
        );
      })}
    </div>
  );
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
        const abregLabel =
          row.abregelung2025Gwh === null
            ? "EE-Abregelung 2025: k. A."
            : `EE-Abregelung 2025: ${insertDisplayUnitNbsp(formatQuantityUnit(row.abregelung2025Gwh, "de", 1, "GWh"))}`;
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

export function NetzbetreiberEeStockBars({
  rows,
}: {
  rows: { bundesland: string; wind: number; pv: number; bessNettoMw: number }[];
}) {
  const sorted = [...rows].sort((a, b) => b.bessNettoMw - a.bessNettoMw);
  const maxBess = Math.max(...sorted.map((r) => r.bessNettoMw), 0.1);
  return (
    <div className={styles.vnbBars} role="list" aria-label="BESS-Nettoleistung je Bundesland (MaStR)">
      {sorted.map((row) => {
        const pct = (row.bessNettoMw / maxBess) * 100;
        return (
          <div className={styles.vnbBarRow} role="listitem" key={row.bundesland}>
            <span className={`${styles.vnbBarLabel} num`}>{row.bundesland}</span>
            <div className={styles.vnbBarTrack} aria-hidden="true">
              <div className={styles.vnbBarFillEon} style={{ width: `${pct}%` }} />
            </div>
            <span className={`${styles.vnbBarValue} num`}>{formatMw(row.bessNettoMw)}</span>
          </div>
        );
      })}
    </div>
  );
}