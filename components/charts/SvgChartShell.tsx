"use client";

import type { ReactNode } from "react";

import { ChartTooltipPanel, type ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { useSvgChartProbe, type SvgChartProbePick } from "@/components/charts/useSvgChartProbe";

export function SvgChartShell({
  pointCount,
  pickIndex,
  ariaLabel,
  testId,
  tooltip,
  className,
  children,
}: {
  pointCount: number;
  pickIndex?: SvgChartProbePick;
  ariaLabel: string;
  testId?: string;
  tooltip: (activeIndex: number | null) => { timeLabel?: string | null; rows: ChartTooltipRow[] | null };
  className?: string;
  children: (activeIndex: number | null) => ReactNode;
}) {
  const { activeIndex, onMouseMove, onMouseLeave, onTouch, onKeyDown } = useSvgChartProbe(pointCount, pickIndex);
  const { timeLabel, rows } = tooltip(activeIndex);
  return (
    <div
      className={className ? `v4-chart-probe ${className}` : "v4-chart-probe"}
      tabIndex={0}
      role="application"
      aria-label={ariaLabel}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouch}
      onTouchMove={onTouch}
      onKeyDown={onKeyDown}
    >
      <ChartTooltipPanel timeLabel={timeLabel ?? null} rows={rows} testId={testId} />
      {children(activeIndex)}
    </div>
  );
}
