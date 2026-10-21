"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { axis, common, cssVar, grid } from "@/lib/chart-theme";
import type { LiveChartPoint } from "@/lib/liveBoard";

export function LiveLineChart({
  points,
  primaryLabel,
  secondaryLabel,
  unit,
  describedBy,
  label,
}: {
  points: LiveChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  unit: string;
  describedBy: string;
  label: string;
}) {
  const hourly = points.filter((point) => point.label.endsWith(":00")).map((point) => point.label);
  const source = hourly.length > 0 ? hourly : points.map((point) => point.label);
  const step = Math.max(1, Math.ceil(source.length / 4));
  const ticks = source.filter((_, index) => index % step === 0);
  const values = points.flatMap((point) => [point.primary, point.secondary].filter((value): value is number => value !== null));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max(1, (high - low) * 0.12);
  return (
    <div className="min-w-0" role="img" aria-label={label} aria-describedby={describedBy}>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={grid.stroke} vertical={false} />
            <XAxis dataKey="label" ticks={ticks} tickFormatter={(value) => String(value).slice(0, 2)} {...axis} interval={0} />
            <YAxis {...axis} width={48} domain={[Math.floor(low - pad), Math.ceil(high + pad)]} />
            <Tooltip
              formatter={(value, name) => [`${value} ${unit}`, String(name)]}
              labelFormatter={(label) => String(label)}
            />
            <Line type="monotone" dataKey="primary" name={primaryLabel} stroke={cssVar("c-load")} strokeWidth={2} dot={false} isAnimationActive={common.line.isAnimationActive} />
            {secondaryLabel ? (
              <Line type="monotone" dataKey="secondary" name={secondaryLabel} stroke={cssVar("c-bess")} strokeWidth={2} dot={false} isAnimationActive={common.line.isAnimationActive} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="num mt-2 text-[12px] text-muted-foreground">{unit}</p>
    </div>
  );
}
