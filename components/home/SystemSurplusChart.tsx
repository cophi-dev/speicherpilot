"use client";

import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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

export function SystemSurplusChart({
  rows,
  factor,
  caption,
}: {
  rows: SurplusBarInput[];
  factor: number;
  caption?: string;
}) {
  const compact = useSyncExternalStore(subscribeCompact, compactSnapshot, compactServerSnapshot);
  const frameRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const apply = () => {
      const next = Math.round(el.clientWidth);
      if (next > 0) {
        setMeasured(next);
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotWidth = measured ?? (compact ? 350 : 1100);
  const layout = useMemo(() => layoutSurplusChart(rows, plotWidth), [plotWidth, rows]);
  const summary = `Überschuss je Tag in GWh, ${rows.length} Tage. Der farbige Teil ist die Modell-Ladung bei ×${factor}.`;

  return (
    <figure className="v4-system-chart-figure">
      <div className="v4-system-chart-frame" ref={frameRef}>
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
                x1={layout.gridX1}
                x2={layout.gridX2}
                y1={tick.y}
                y2={tick.y}
              />
              <text
                className="v4-system-chart-axis"
                x={layout.yLabelX}
                y={tick.y}
                textAnchor="end"
                dominantBaseline="middle"
              >
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
              {bar.label && bar.labelX != null && bar.labelAnchor ? (
                <text
                  className="v4-system-chart-axis"
                  x={bar.labelX}
                  y={layout.height - 4}
                  textAnchor={bar.labelAnchor}
                >
                  {bar.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="v4-system-chart-caption">
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
        {caption ? <p className="v4-strip-caption num">{caption}</p> : null}
      </figcaption>
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
