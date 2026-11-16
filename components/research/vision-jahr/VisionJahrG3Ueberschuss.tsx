"use client";

import { useMemo } from "react";

import { VisionJahrChartFoot } from "@/components/research/vision-jahr/VisionJahrChartFoot";
import { formatVisionGwhThousands, formatVisionPercentWhole } from "@/lib/research/visionJahrFormat";
import { visionAxisFontSize } from "@/lib/research/visionChartMetrics";
import type { VisionJahrModel, VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";

import styles from "@/components/research/research.module.css";

const ROWS: VisionJahrStufeKey[] = ["x2", "x5", "x10", "NEP A", "NEP B", "NEP C"];
const LABEL: Record<VisionJahrStufeKey, string> = {
  x2: "×2",
  x5: "×5",
  x10: "×10",
  "NEP A": "NEP A",
  "NEP B": "NEP B",
  "NEP C": "NEP C",
};

const PAD_LEFT = 64;
const PAD_RIGHT = 20;
const PAD_TOP = 28;
const ROW_H = 36;
const GAP = 10;

export function VisionJahrG3Ueberschuss({ model, width }: { model: VisionJahrModel; width: number }) {
  const axisFs = visionAxisFontSize(width);
  const height = PAD_TOP + ROWS.length * (ROW_H + GAP) + 40;
  const innerW = width - PAD_LEFT - PAD_RIGHT;

  const rows = useMemo(
    () =>
      ROWS.map((key) => {
        const maxGwh = model.ueberschussMaxGwh[key];
        const marktGwh = model.ueberschussMarktRueckGwh[key];
        const maxPct = (maxGwh / model.ueberschussGWh) * 100;
        const marktPct = (marktGwh / model.ueberschussGWh) * 100;
        return { key, label: LABEL[key], maxPct, marktPct };
      }),
    [model]
  );

  return (
    <div className={styles.chartClip}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.chartFixed} role="img" aria-label="Überschuss-Aufnahme nach Stufe">
        <text x={PAD_LEFT} y={PAD_TOP - 6} fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          Anteil am nationalen Überschuss {formatVisionGwhThousands(model.ueberschussGWh)} GWh [%]
        </text>
        {rows.map((row, i) => {
          const y = PAD_TOP + i * (ROW_H + GAP);
          const barW = (Math.min(100, row.maxPct) / 100) * innerW;
          const marktX = PAD_LEFT + (Math.min(100, row.marktPct) / 100) * innerW;
          return (
            <g key={row.key}>
              <text x={PAD_LEFT - 8} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={axisFs} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
                {row.label}
              </text>
              <rect x={PAD_LEFT} y={y} width={innerW} height={ROW_H} fill="var(--research-line)" opacity={0.45} rx={2} />
              <rect x={PAD_LEFT} y={y} width={barW} height={ROW_H} fill="var(--research-accent-light)" rx={2} />
              <line x1={marktX} x2={marktX} y1={y + 4} y2={y + ROW_H - 4} stroke="var(--research-fg)" strokeWidth={2} />
              <text x={PAD_LEFT + Math.max(barW, 36) - 6} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={axisFs} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
                {formatVisionPercentWhole(row.maxPct)}
              </text>
            </g>
          );
        })}
        {[0, 20, 40, 60, 80, 100].map((pct) => (
          <text key={pct} x={PAD_LEFT + (pct / 100) * innerW} y={height - 12} textAnchor="middle" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {pct}
          </text>
        ))}
      </svg>
      <p className={styles.meta}>Balken: auf Überschuss gefahren · Strich: nach Preis (Rückw. 2,86)</p>
      <VisionJahrChartFoot />
    </div>
  );
}