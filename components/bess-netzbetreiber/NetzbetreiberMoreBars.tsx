"use client";

import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantityUnit } from "@/lib/formatQuantity";
import type { GrowthBucket } from "@/lib/bessNetzbetreiber/prepareModel";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

function formatMw(mw: number): string {
  if (mw >= 1000) return insertDisplayUnitNbsp(formatQuantityUnit(mw / 1000, "de", 2, "GW"));
  return insertDisplayUnitNbsp(formatQuantityUnit(mw, "de", 0, "MW"));
}

function isEonGrowthKey(key: string): boolean {
  return key === "eon_kern" || key === "mitnetz_envia" || key.startsWith("eon");
}

export function NetzbetreiberG3Bars({ rows }: { rows: GrowthBucket[] }) {
  const maxTotal = Math.max(...rows.map((r) => r.vor2026Mw + r.y2026Mw), 1);
  return (
    <div className={styles.vnbBars} role="list" aria-label="Bestand und Zubau 2026 je Netzbetreibergruppe">
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
  rows: { bundesland: string; bessBruttoGw: number; eeRedispatch2025Gwh: number }[];
}) {
  const sorted = [...rows].sort((a, b) => b.bessBruttoGw - a.bessBruttoGw);
  const maxGw = Math.max(...sorted.map((r) => r.bessBruttoGw), 0.01);
  return (
    <div className={styles.vnbBars} role="list" aria-label="BESS-Bruttoleistung je Bundesland">
      {sorted.map((row) => {
        const pct = (row.bessBruttoGw / maxGw) * 100;
        return (
          <div className={styles.vnbBarRow} role="listitem" key={row.bundesland}>
            <span className={`${styles.vnbBarLabel} num`} title={`EE-Redispatch 2025: ${formatQuantityUnit(row.eeRedispatch2025Gwh, "de", 1, "GWh")}`}>
              {row.bundesland}
            </span>
            <div className={styles.vnbBarTrack} aria-hidden="true">
              <div className={styles.vnbBarFillOther} style={{ width: `${pct}%`, opacity: 0.55 }} />
            </div>
            <span className={`${styles.vnbBarValue} num`}>
              {insertDisplayUnitNbsp(formatQuantityUnit(row.bessBruttoGw, "de", 2, "GW"))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function NetzbetreiberEeStockBars({
  rows,
}: {
  rows: { bundesland: string; wind: number; pv: number; bess: number }[];
}) {
  const sorted = [...rows].sort((a, b) => b.bess - a.bess);
  const maxBess = Math.max(...sorted.map((r) => r.bess), 0.01);
  return (
    <div className={styles.vnbBars} role="list" aria-label="BESS je Bundesland (MaStR-Modell)">
      {sorted.map((row) => {
        const pct = (row.bess / maxBess) * 100;
        return (
          <div className={styles.vnbBarRow} role="listitem" key={row.bundesland}>
            <span className={`${styles.vnbBarLabel} num`}>{row.bundesland}</span>
            <div className={styles.vnbBarTrack} aria-hidden="true">
              <div className={styles.vnbBarFillEon} style={{ width: `${pct}%` }} />
            </div>
            <span className={`${styles.vnbBarValue} num`}>
              {insertDisplayUnitNbsp(formatQuantityUnit(row.bess, "de", 2, "GW"))}
            </span>
          </div>
        );
      })}
    </div>
  );
}