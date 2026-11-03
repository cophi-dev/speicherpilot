"use client";

import { formatQuantity } from "@/lib/formatQuantity";

export function RangLeiste({
  bars,
  metricLabel,
  rankLabel,
}: {
  bars: Array<{ dateKey: string; value: number | null; highlight: boolean; record?: boolean }>;
  metricLabel: string;
  rankLabel?: string;
}) {
  const values = bars.map((b) => b.value ?? 0);
  const max = Math.max(...values, 1e-9);

  return (
    <div className="v4-rang-leiste" aria-label={`${metricLabel}, ${rankLabel ?? ""}`}>
      <div className="v4-rang-bars">
        {bars.map((bar) => {
          const h = bar.value === null ? 4 : Math.max(4, (bar.value / max) * 100);
          const cls = bar.highlight ? "is-gestern" : bar.record ? "is-rekord" : "";
          return (
            <span
              key={bar.dateKey}
              className={`v4-rang-bar ${cls}`}
              style={{ height: `${h}%` }}
              title={`${bar.dateKey}: ${bar.value === null ? "—" : formatQuantity(bar.value, "de", 1)}`}
            />
          );
        })}
      </div>
      {rankLabel ? <p className="v4-rang-caption num">{rankLabel}</p> : null}
    </div>
  );
}
