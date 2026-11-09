"use client";

import { useMemo, useSyncExternalStore } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import { layoutSurplusChart, type SurplusBarInput } from "@/lib/systemSurplusChart";

function subscribeCompact(onStoreChange: () => void) {
  const query = window.matchMedia("(max-width: 639px)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function compactSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

function compactServerSnapshot() {
  return false;
}

function gwhLabel(value: number): string {
  const digits = value >= 10 || value === 0 ? 0 : 1;
  return formatQuantity(value, "de", digits);
}

export function SystemSurplusChart({ rows, factor }: { rows: SurplusBarInput[]; factor: number }) {
  const compact = useSyncExternalStore(subscribeCompact, compactSnapshot, compactServerSnapshot);
  const layout = useMemo(() => layoutSurplusChart(rows, compact ? 360 : 720), [compact, rows]);
  const summary = `Überschuss je Tag in GWh, ${rows.length} Tage. Der farbige Teil ist die Modell-Ladung bei ×${factor}.`;

  return (
    <figure className="v4-system-chart-figure">
      <svg
        className="v4-system-chart"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={summary}
      >
        {layout.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              className="v4-system-chart-grid"
              x1={layout.plotLeft}
              x2={layout.width - 8}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="v4-system-chart-axis" x={layout.plotLeft - 6} y={tick.y + 3} textAnchor="end">
              {gwhLabel(tick.value)}
            </text>
          </g>
        ))}
        {layout.bars.map((bar) => (
          <g key={bar.dateBerlin}>
            {bar.surplusH > 0 ? (
              <rect
                className="v4-system-chart-surplus"
                x={bar.x}
                y={bar.surplusY}
                width={bar.width}
                height={bar.surplusH}
              >
                <title>
                  {`${bar.dateBerlin}: Überschuss ${formatQuantity(Math.max(0, bar.surplusGwh), "de", 1)} GWh, geladen ${formatQuantity(Math.max(0, bar.absorbedGwh), "de", 1)} GWh`}
                </title>
              </rect>
            ) : null}
            {bar.absorbedH > 0 ? (
              <rect
                className="v4-system-chart-absorbed"
                x={bar.x}
                y={bar.absorbedY}
                width={bar.width}
                height={bar.absorbedH}
              />
            ) : null}
            {bar.label ? (
              <text
                className="v4-system-chart-axis"
                x={bar.x + bar.width / 2}
                y={layout.height - 8}
                textAnchor="middle"
              >
                {bar.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <ul className="v4-system-legend">
        <li>
          <span className="v4-system-legend-swatch is-surplus" aria-hidden="true" />
          Überschuss, beobachtet
        </li>
        <li>
          <span className="v4-system-legend-swatch is-absorbed" aria-hidden="true" />
          geladen, Modell ×{factor}
        </li>
      </ul>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th>Tag</th>
            <th>Überschuss GWh</th>
            <th>Geladen GWh</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dateBerlin}>
              <td>{row.dateBerlin}</td>
              <td>{formatQuantity(row.surplusGwh, "de", 1)}</td>
              <td>{formatQuantity(row.absorbedGwh, "de", 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
