"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export type ChartTooltipRow = {
  label: string;
  value: string;
};

export function ChartTooltipPanel({
  timeLabel,
  rows,
  hint,
  testId = "chart-tooltip",
}: {
  timeLabel?: string | null;
  rows: ChartTooltipRow[] | null;
  hint?: ReactNode;
  testId?: string;
}) {
  const liveRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const el = liveRef.current;
    if (!el) {
      setShift(0);
      return;
    }
    const rect = el.getBoundingClientRect();
    const margin = 20;
    const overflowRight = rect.right - (window.innerWidth - margin);
    const overflowLeft = margin - rect.left;
    if (overflowRight > 0) {
      setShift(-overflowRight);
    } else if (overflowLeft > 0) {
      setShift(overflowLeft);
    } else {
      setShift(0);
    }
  }, [timeLabel, rows, hint]);

  const style: CSSProperties | undefined = shift !== 0 ? { transform: `translateX(${shift}px)` } : undefined;

  return (
    <div className="v4-chart-tooltip-shell" style={style} ref={liveRef}>
      {rows && rows.length > 0 ? (
        <p className="v4-chart-tooltip num" role="status" aria-live="polite" data-testid={testId}>
          {timeLabel ? (
            <>
              <span className="v4-chart-tooltip-time">{timeLabel}</span>
              {" · "}
            </>
          ) : null}
          {rows.map((row, i) => (
            <span key={row.label}>
              {i > 0 ? " · " : null}
              <span className="v4-chart-tooltip-label">{row.label}</span> {row.value}
            </span>
          ))}
        </p>
      ) : (
        <p className="v4-chart-tooltip num v4-chart-tooltip-hint muted" aria-live="polite">
          {hint ?? "Tippen oder Zeiger über den Graph · Pfeiltasten für den nächsten Punkt"}
        </p>
      )}
    </div>
  );
}
