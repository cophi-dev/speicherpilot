"use client";

import { formatQuantity } from "@/lib/formatQuantity";

export function RangLeiste({
  bars,
  metricLabel,
  rankLabel,
  summaryLine,
  highlightLabel,
  plainNonHighlight = false,
}: {
  bars: Array<{ dateKey: string; value: number | null; highlight: boolean; record?: boolean; zero?: boolean }>;
  metricLabel: string;
  rankLabel?: string;
  summaryLine?: string;
  highlightLabel?: string;
  plainNonHighlight?: boolean;
}) {
  const values = bars.map((b) => b.value ?? 0);
  const max = Math.max(...values, 1e-9);
  const ariaLabel = [summaryLine ?? metricLabel, rankLabel].filter(Boolean).join(", ");

  return (
    <div className="v4-rang-leiste" aria-label={ariaLabel}>
      {summaryLine ? <p className="v4-rang-summary num">{summaryLine}</p> : null}
      <div className="v4-rang-bars">
        {bars.map((bar) => {
          const h = bar.zero ? 2 : bar.value === null ? 4 : Math.max(4, (bar.value / max) * 100);
          const cls = bar.highlight
            ? "is-gestern"
            : !plainNonHighlight && bar.record
              ? "is-rekord"
              : bar.zero
                ? "is-zero"
                : "";
          return (
            <span
              key={bar.dateKey}
              className={`v4-rang-bar ${cls}`.trim()}
              style={{ height: `${h}%` }}
              title={`${bar.dateKey}: ${bar.value === null ? "—" : formatQuantity(bar.value, "de", 1)}`}
            />
          );
        })}
      </div>
      {highlightLabel ? (
        <div className="v4-rang-mark-row">
          <span className="v4-rang-mark num">{highlightLabel}</span>
        </div>
      ) : null}
      {rankLabel ? <p className="v4-rang-caption num">{rankLabel}</p> : null}
    </div>
  );
}
