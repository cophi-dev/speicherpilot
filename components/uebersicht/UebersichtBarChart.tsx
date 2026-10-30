"use client";

import type { AppLanguage } from "@/components/language-context";
import type { OverviewDayRow } from "@/lib/overviewChain";
import { formatQuantity } from "@/lib/formatQuantity";

export function UebersichtBarChart({
  rows,
  soc,
  language,
}: {
  rows: OverviewDayRow[];
  soc: Array<{ dateBerlin: string; socFraction: number }>;
  language: AppLanguage;
}) {
  if (rows.length === 0) {
    return null;
  }
  const max = Math.max(0.1, ...rows.map((row) => Math.max(row.surplusGwh, row.absorbedGwh)));
  const width = 900;
  const height = 280;
  const pad = { l: 48, r: 16, t: 16, b: 48 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const barW = innerW / rows.length - 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="uebersicht-bars" role="img" aria-label="Tageswerte">
      {rows.map((row, index) => {
        const x = pad.l + index * (innerW / rows.length) + 2;
        const surplusH = (row.surplusGwh / max) * innerH;
        const absorbedH = (row.absorbedGwh / max) * innerH;
        const label = row.dateBerlin.slice(8, 10);
        const socPoint = soc.find((item) => item.dateBerlin === row.dateBerlin);
        const socY = pad.t + innerH - (socPoint?.socFraction ?? 0.1) * innerH * 0.35;
        return (
          <g key={row.dateBerlin}>
            <rect x={x} y={pad.t + innerH - surplusH} width={barW} height={surplusH} className="bar-surplus" />
            <rect x={x} y={pad.t + innerH - absorbedH} width={barW} height={absorbedH} className="bar-absorbed" opacity={0.85} />
            <text x={x + barW / 2} y={height - 12} textAnchor="middle" className="bar-label">
              {label}.{row.dateBerlin.slice(5, 7)}
            </text>
            <circle cx={x + barW / 2} cy={socY} r={3} className="bar-soc" />
          </g>
        );
      })}
      <text x={pad.l} y={14} className="bar-axis">
        max {formatQuantity(max, language, 1)} GWh
      </text>
    </svg>
  );
}
