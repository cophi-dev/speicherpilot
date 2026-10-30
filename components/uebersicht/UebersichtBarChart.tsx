"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { AppLanguage } from "@/components/language-context";
import type { OverviewDayRow } from "@/lib/overviewChain";
import type { OverviewBlick } from "@/lib/overviewRange";
import { formatQuantity } from "@/lib/formatQuantity";

function formatDayLabel(dateBerlin: string) {
  return `${dateBerlin.slice(8, 10)}.${dateBerlin.slice(5, 7)}`;
}

export function UebersichtBarChart({
  rows,
  language,
  blick,
}: {
  rows: OverviewDayRow[];
  language: AppLanguage;
  blick: OverviewBlick;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(900);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      setWidthPx(Math.max(280, Math.round(node.getBoundingClientRect().width)));
    });
    observer.observe(node);
    setWidthPx(Math.max(280, Math.round(node.getBoundingClientRect().width)));
    return () => observer.disconnect();
  }, []);

  if (rows.length === 0) {
    return null;
  }

  const max = Math.max(0.1, ...rows.map((row) => Math.max(row.surplusGwh, row.absorbedGwh)));
  const height = 300;
  const pad = { l: 48, r: 16, t: 16, b: 56 };
  const viewWidth = Math.max(320, widthPx);
  const innerW = viewWidth - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const barW = innerW / rows.length - 4;
  const labelEvery = blick === "30tage" || rows.length > 14 ? 5 : 1;
  const fontPx = Math.max(11, 11 * (viewWidth / 900));

  return (
    <div className="uebersicht-bar-wrap" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        className="uebersicht-bars"
        role="img"
        aria-label={tx("Tageswerte Überschuss und Aufnahme", "Daily surplus and absorption")}
        style={{ fontSize: fontPx }}
      >
        {rows.map((row, index) => {
          const x = pad.l + index * (innerW / rows.length) + 2;
          const surplusH = (row.surplusGwh / max) * innerH;
          const absorbedH = (row.absorbedGwh / max) * innerH;
          const remainderH = Math.max(0, surplusH - absorbedH);
          const showLabel = index % labelEvery === 0 || index === rows.length - 1;
          const label = formatDayLabel(row.dateBerlin);
          const aria = tx(
            `${label}: ${formatQuantity(row.surplusGwh, language, 1)} GWh Überschuss, ${formatQuantity(row.absorbedGwh, language, 1)} GWh aufgenommen`,
            `${label}: ${formatQuantity(row.surplusGwh, language, 1)} GWh surplus, ${formatQuantity(row.absorbedGwh, language, 1)} GWh absorbed`
          );
          return (
            <g key={row.dateBerlin}>
              <a href={`/live?tag=${row.dateBerlin}`} aria-label={aria}>
                <rect
                  x={x}
                  y={pad.t + innerH - surplusH}
                  width={barW}
                  height={surplusH}
                  className="bar-surplus-outline"
                />
                <rect
                  x={x}
                  y={pad.t + innerH - absorbedH}
                  width={barW}
                  height={absorbedH}
                  className="bar-absorbed"
                />
                {remainderH > 0.5 ? (
                  <rect
                    x={x}
                    y={pad.t + innerH - surplusH}
                    width={barW}
                    height={remainderH}
                    className="bar-surplus-hatch"
                  />
                ) : null}
              </a>
              {showLabel ? (
                <text x={x + barW / 2} y={height - 16} textAnchor="middle" className="bar-label">
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={pad.l} y={14} className="bar-axis">
          max {formatQuantity(max, language, 1)} GWh
        </text>
      </svg>
      <div className="uebersicht-soc-row" aria-label={tx("Speicher voll?", "Storage full?")}>
        <span className="uebersicht-soc-title">{tx("Speicher voll?", "Storage full?")}</span>
        <div className="uebersicht-soc-cells">
          {rows.map((row, index) => {
            if (index % labelEvery !== 0 && index !== rows.length - 1 && (blick === "30tage" || rows.length > 14)) {
              return <span key={row.dateBerlin} className="uebersicht-soc-spacer" />;
            }
            return (
              <Link
                key={row.dateBerlin}
                href={`/live?tag=${row.dateBerlin}`}
                prefetch={false}
                className="uebersicht-soc-cell"
                title={tx(`max. Ladestand ${formatQuantity(row.socMaxFraction * 100, language, 0)} %`, `max. state of charge ${formatQuantity(row.socMaxFraction * 100, language, 0)}%`)}
                aria-label={tx(
                  `${formatDayLabel(row.dateBerlin)}: max. Ladestand ${formatQuantity(row.socMaxFraction * 100, language, 0)} %`,
                  `${formatDayLabel(row.dateBerlin)}: max. state of charge ${formatQuantity(row.socMaxFraction * 100, language, 0)}%`
                )}
              >
                <span className="uebersicht-soc-fill" style={{ height: `${Math.round(row.socMaxFraction * 100)}%` }} />
              </Link>
            );
          })}
        </div>
        <p className="uebersicht-soc-caption">{tx("max. Ladestand je Tag (Modell)", "Max. state of charge per day (model)")}</p>
      </div>
      <p className="uebersicht-bar-legend">
        <span className="legend-surplus">{tx("Überschuss (Rand)", "Surplus (outline)")}</span>
        <span className="legend-absorbed">{tx("aufgenommen", "absorbed")}</span>
      </p>
    </div>
  );
}
