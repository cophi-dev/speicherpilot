"use client";

import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import type { MonatSurplusBar } from "@/lib/monatSurplusBars";

function tickDays(n: number): number[] {
  if (n <= 10) {
    return Array.from({ length: n }, (_, i) => i + 1);
  }
  const step = n <= 20 ? 2 : n <= 31 ? 5 : 7;
  const ticks: number[] = [1];
  for (let d = step; d < n; d += step) {
    ticks.push(d);
  }
  if (ticks[ticks.length - 1] !== n) {
    ticks.push(n);
  }
  return ticks;
}

export function MonatSurplusGraph({
  monthKey,
  bars,
}: {
  monthKey: string;
  bars: MonatSurplusBar[];
}) {
  const series = bars.filter((b) => b.surplusGwh !== null && !b.future);
  const maxGwh = Math.max(...series.map((b) => b.surplusGwh ?? 0), 0.05);
  const dayCount = bars.length;
  const ticks = tickDays(dayCount);

  return (
    <figure className="v4-monat-graph-wrap v4-content">
      <svg
        className="v4-monat-graph"
        viewBox={`0 0 960 ${280}`}
        role="img"
        aria-label={`Überschuss pro Kalendertag im Monat ${monthKey}`}
      >
        <text x={24} y={20} className="v4-monat-graph-title">
          Überschuss (GWh)
        </text>
        {bars.map((bar, index) => {
          const x = 56 + (index / Math.max(1, bars.length - 1)) * 880;
          const height =
            bar.surplusGwh === null || bar.future
              ? 0
              : Math.max(2, ((bar.surplusGwh ?? 0) / maxGwh) * 168);
          const y = 228 - height;
          const fill =
            bar.future || bar.missing
              ? "var(--v4-monat-graph-muted)"
              : (bar.surplusGwh ?? 0) < 0.05
                ? "var(--v4-monat-graph-dry)"
                : "var(--v4-warm)";
          return (
            <g key={bar.dateKey}>
              {bar.clickable ? (
                <a href={`/tag/${bar.dateKey}`} aria-label={`Tag ${formatBerlinDayLabel(bar.dateKey)}`}>
                  <rect
                    x={x - 7}
                    y={y}
                    width={14}
                    height={height}
                    rx={2}
                    fill={fill}
                    className="v4-monat-graph-bar is-link"
                  />
                </a>
              ) : (
                <rect x={x - 7} y={y} width={14} height={height} rx={2} fill={fill} opacity={bar.future ? 0.35 : 0.5} />
              )}
            </g>
          );
        })}
        <line x1={56} y1={228} x2={936} y2={228} className="v4-monat-graph-axis" />
        {ticks.map((day) => {
          const index = day - 1;
          const x = 56 + (index / Math.max(1, bars.length - 1)) * 880;
          return (
            <text key={day} x={x} y={252} textAnchor="middle" className="v4-monat-graph-tick num">
              {day}
            </text>
          );
        })}
        <text x={496} y={272} textAnchor="middle" className="v4-monat-graph-axis-title">
          Kalendertag
        </text>
      </svg>
      <figcaption className="v4-monat-graph-note">
        Balken = modellierter Tagesüberschuss in der geladenen Reihe. Tippen oder Tab zum Tag. Fehlende Tage haben keinen
        Balken.
      </figcaption>
      <table className="v4-monat-graph-table num day-sr">
        <caption>Tageswerte Monat {monthKey}</caption>
        <thead>
          <tr>
            <th scope="col">Datum</th>
            <th scope="col">Überschuss GWh</th>
            <th scope="col">Tag</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.dateKey}>
              <td>{formatBerlinDayLabel(bar.dateKey)}</td>
              <td>
                {bar.future
                  ? "noch nicht"
                  : bar.missing
                    ? "fehlend"
                    : bar.surplusGwh === null
                      ? "—"
                      : bar.surplusGwh < 0.05
                        ? "0"
                        : formatQuantity(bar.surplusGwh, "de", 2)}
              </td>
              <td>
                {bar.clickable ? (
                  <Link href={`/tag/${bar.dateKey}`}>ansehen</Link>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
