"use client";

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatQuantity } from "@/lib/formatQuantity";
import { axis, common, cssVar, grid } from "@/lib/chart-theme";
import type { LiveChartPoint } from "@/lib/liveBoard";
import { niceAxis } from "@/lib/niceTicks";

export function LiveLineChart({
  points,
  primaryLabel,
  secondaryLabel,
  unit,
  describedBy,
  label,
  language,
}: {
  points: LiveChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  unit: string;
  describedBy: string;
  label: string;
  language: "de" | "en";
}) {
  const hourly = points.filter((point) => point.label.endsWith(":00")).map((point) => point.label);
  const source = hourly.length > 0 ? hourly : points.map((point) => point.label);
  const step = Math.max(1, Math.ceil(source.length / 4));
  const ticks = source.filter((_, index) => index % step === 0);
  const values = points.flatMap((point) => [point.primary, point.secondary].filter((value): value is number => value !== null));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const scale = values.length > 0 ? niceAxis(low, high) : niceAxis(0, 1);
  const top = scale.ticks[scale.ticks.length - 1];
  const digits = scale.step >= 1 ? 0 : 1;
  const tickFill = { ...axis.tick, fill: cssVar("muted-foreground") };
  const frame = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = frame.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setReady((entries[0]?.contentRect.width ?? 0) > 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="min-w-0" role="img" aria-label={label} aria-describedby={describedBy}>
      <div ref={frame} className="h-[240px] w-full min-w-0">
        {ready ? <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 480, height: 240 }}>
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={grid.stroke} vertical={false} />
            <XAxis dataKey="label" ticks={ticks} tickFormatter={(value) => String(value).slice(0, 2)} {...axis} tick={tickFill} interval={0} />
            <YAxis
              {...axis}
              tick={tickFill}
              width={76}
              domain={[scale.min, scale.max]}
              ticks={scale.ticks}
              allowDataOverflow
              tickFormatter={(value: number) => {
                const text = formatQuantity(Number(value), language, digits);
                return Math.abs(Number(value) - top) < scale.step / 4 ? `${text} ${unit}` : text;
              }}
            />
            <Tooltip
              formatter={(value, name) => [`${value} ${unit}`, String(name)]}
              labelFormatter={(label) => String(label)}
            />
            <Line type="monotone" dataKey="primary" name={primaryLabel} stroke={cssVar("c-load")} strokeWidth={2} dot={false} isAnimationActive={common.line.isAnimationActive} />
            {secondaryLabel ? (
              <Line type="monotone" dataKey="secondary" name={secondaryLabel} stroke={cssVar("c-bess")} strokeWidth={2} dot={false} isAnimationActive={common.line.isAnimationActive} />
            ) : null}
          </LineChart>
        </ResponsiveContainer> : null}
      </div>
    </div>
  );
}
