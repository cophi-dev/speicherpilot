"use client";

import type { AppLanguage } from "@/components/language-context";
import type { OverviewDayRow } from "@/lib/overviewChain";
import type { OverviewBlick } from "@/lib/overviewRange";
import { formatQuantity } from "@/lib/formatQuantity";

function formatDayLabel(dateBerlin: string) {
  return `${dateBerlin.slice(8, 10)}.${dateBerlin.slice(5, 7)}`;
}

export function UebersichtBarChart({
  rows,
  soc,
  language,
  blick,
}: {
  rows: OverviewDayRow[];
  soc: Array<{ dateBerlin: string; socFraction: number }>;
  language: AppLanguage;
  blick: OverviewBlick;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  if (rows.length === 0) {
    return null;
  }
  const max = Math.max(0.1, ...rows.map((row) => Math.max(row.surplusGwh, row.absorbedGwh)));
  const width = 900;
  const height = 300;
  const pad = { l: 48, r: 16, t: 16, b: 56 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const barW = innerW / rows.length - 4;
  const labelEvery = blick === "30tage" || rows.length > 14 ? 5 : 1;

  const socPoints = rows
    .map((row, index) => {
      const socPoint = soc.find((item) => item.dateBerlin === row.dateBerlin);
      const fraction = socPoint?.socFraction ?? 0.1;
      const x = pad.l + index * (innerW / rows.length) + 2 + barW / 2;
      const y = pad.t + innerH - fraction * innerH * 0.35;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="uebersicht-bar-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="uebersicht-bars" role="img" aria-label={tx("Tageswerte Überschuss und Aufnahme", "Daily surplus and absorption")}>
        {rows.map((row, index) => {
          const x = pad.l + index * (innerW / rows.length) + 2;
          const surplusH = (row.surplusGwh / max) * innerH;
          const absorbedH = (row.absorbedGwh / max) * innerH;
          const showLabel = index % labelEvery === 0 || index === rows.length - 1;
          return (
            <g key={row.dateBerlin}>
              <rect x={x} y={pad.t + innerH - surplusH} width={barW} height={surplusH} className="bar-surplus" />
              <rect x={x} y={pad.t + innerH - absorbedH} width={barW} height={absorbedH} className="bar-absorbed" />
              {showLabel ? (
                <text x={x + barW / 2} y={height - 16} textAnchor="middle" className="bar-label">
                  {formatDayLabel(row.dateBerlin)}
                </text>
              ) : null}
            </g>
          );
        })}
        {socPoints ? <polyline points={socPoints} className="bar-soc-line" /> : null}
        <text x={pad.l} y={14} className="bar-axis">
          max {formatQuantity(max, language, 1)} GWh
        </text>
      </svg>
      <p className="uebersicht-bar-legend">
        <span className="legend-surplus">{tx("Überschuss", "Surplus")}</span>
        <span className="legend-absorbed">{tx("aufgenommen", "absorbed")}</span>
        <span className="legend-soc">{tx("Ladestand Ende Tag (Modell)", "State of charge end of day (model)")}</span>
      </p>
    </div>
  );
}
