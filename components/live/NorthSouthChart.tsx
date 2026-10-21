"use client";

import { useEffect, useId, useRef, useState } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import type { ZoneSharePoint } from "@/lib/liveBoard";
import { mirrorShareAxis } from "@/lib/niceTicks";

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

type Run = ZoneSharePoint[];

function runsOf(points: ZoneSharePoint[]): Run[] {
  const runs: Run[] = [];
  for (const point of points) {
    const previous = runs[runs.length - 1]?.at(-1);
    const gapHours = previous ? (point.unixMs - previous.unixMs) / 3_600_000 : 0;
    if (!previous || gapHours > 0.5) {
      runs.push([point]);
    } else {
      runs[runs.length - 1].push(point);
    }
  }
  return runs;
}

export function NorthSouthChart({ points, language }: { points: ZoneSharePoint[]; language: "de" | "en" }) {
  const { ref, width } = useWidth();
  const patternId = useId().replace(/:/g, "");
  const height = width < 640 ? 280 : 360;
  const axis = mirrorShareAxis(points.flatMap((point) => [point.northPct, point.southPct]));
  const label =
    language === "de"
      ? "Regelzone 50Hertz nach oben, Regelzone TransnetBW nach unten. Anteil von Wind und Photovoltaik an der Last, in Prozent ohne Minus."
      : "50Hertz control area upward, TransnetBW control area downward. Wind and solar as a share of load, in percent, without a minus.";

  return (
    <div ref={ref} className="mt-4 min-w-0">
      {width > 0 ? (
        <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block">
          <title>{label}</title>
          <ChartBody points={points} width={width} height={height} max={axis.max} ticks={axis.ticks} lineAt100={axis.lineAt100} language={language} patternId={patternId} />
        </svg>
      ) : (
        <div className="h-[280px]" />
      )}
      <p className="mt-2 max-w-[68ch] text-[12px] text-muted-foreground">
        {language === "de"
          ? "Anteil an der Last. 50Hertz schließt Wind auf See ein, TransnetBW hat diese Reihe nicht. Die 100-%-Linie ist eine Gitterlinie."
          : "Share of load. 50Hertz includes offshore wind. TransnetBW has no offshore series. The 100% line is a gridline."}
      </p>
    </div>
  );
}

function ChartBody({
  points,
  width,
  height,
  max,
  ticks,
  lineAt100,
  language,
  patternId,
}: {
  points: ZoneSharePoint[];
  width: number;
  height: number;
  max: number;
  ticks: number[];
  lineAt100: "gridline" | "none";
  language: "de" | "en";
  patternId: string;
}) {
  const pad = { l: 44, r: width < 560 ? 8 : 92, t: 16, b: 28 };
  const plotW = Math.max(1, width - pad.l - pad.r);
  const plotH = Math.max(1, height - pad.t - pad.b);
  const mid = pad.t + plotH / 2;
  const xOfHour = (hour: number) => pad.l + (Math.min(24, Math.max(0, hour)) / 24) * plotW;
  const yNorth = (pct: number) => mid - (pct / max) * (plotH / 2);
  const ySouth = (pct: number) => mid + (pct / max) * (plotH / 2);
  const hourOf = (label: string) => {
    const [hour, minute] = label.split(":").map(Number);
    return (hour || 0) + (minute || 0) / 60;
  };
  const runs = runsOf(points);
  const northLabel = points[points.length - 1];

  function band(run: Run, side: "north" | "south") {
    if (run.length === 0) {
      return null;
    }
    const placed = run.map((point) => {
      const y = side === "north" ? yNorth(point.northPct) : ySouth(point.southPct);
      return { x: xOfHour(hourOf(point.label)), y };
    });
    if (placed.length === 1) {
      const only = placed[0];
      const x1 = Math.min(width - pad.r, only.x + plotW / 96);
      return `${only.x.toFixed(1)},${mid.toFixed(1)} ${x1.toFixed(1)},${mid.toFixed(1)} ${x1.toFixed(1)},${only.y.toFixed(1)} ${only.x.toFixed(1)},${only.y.toFixed(1)}`;
    }
    const forward = placed.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const back = [...placed].reverse().map((point) => `${point.x.toFixed(1)},${mid.toFixed(1)}`).join(" ");
    return `${forward} ${back}`;
  }

  const hours = [0, 6, 12, 18, 24];

  return (
    <>
      <defs>
        <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--c-grid) / 0.45)" strokeWidth="1.2" />
        </pattern>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={yNorth(tick)} y2={yNorth(tick)} stroke={tick === 0 ? "hsl(var(--border-strong))" : "hsl(var(--gridline))"} />
          {tick > 0 ? (
            <line x1={pad.l} x2={width - pad.r} y1={ySouth(tick)} y2={ySouth(tick)} stroke="hsl(var(--gridline))" />
          ) : null}
          <text x={pad.l - 8} y={yNorth(tick) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {tick === ticks[ticks.length - 1] ? `${formatQuantity(tick, language, 0)} %` : formatQuantity(tick, language, 0)}
          </text>
          {tick > 0 ? (
            <text x={pad.l - 8} y={ySouth(tick) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
              {formatQuantity(tick, language, 0)}
            </text>
          ) : null}
        </g>
      ))}
      {lineAt100 === "gridline" && !ticks.includes(100) ? (
        <>
          <line x1={pad.l} x2={width - pad.r} y1={yNorth(100)} y2={yNorth(100)} stroke="hsl(var(--gridline))" />
          <line x1={pad.l} x2={width - pad.r} y1={ySouth(100)} y2={ySouth(100)} stroke="hsl(var(--gridline))" />
        </>
      ) : null}
      {hours.map((hour) => {
        const x = xOfHour(hour);
        return (
          <text key={hour} x={x} y={height - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {String(hour).padStart(2, "0")}
          </text>
        );
      })}
      {runs.map((run) => {
        const north = band(run, "north");
        const south = band(run, "south");
        const key = run[0]?.unixMs ?? 0;
        return (
          <g key={key}>
            {south ? <polygon points={south} fill={`url(#${patternId})`} /> : null}
            {north ? <polygon points={north} fill="hsl(var(--c-grid) / 0.55)" /> : null}
          </g>
        );
      })}
      {northLabel && width >= 560 ? (
        <>
          <text x={width - 8} y={yNorth(northLabel.northPct)} fill="hsl(var(--foreground))" fontSize="13" fontFamily="var(--font-plex-sans), sans-serif">
            50Hertz
          </text>
          <text x={width - 8} y={ySouth(northLabel.southPct)} fill="hsl(var(--foreground))" fontSize="13" fontFamily="var(--font-plex-sans), sans-serif">
            TransnetBW
          </text>
        </>
      ) : null}
    </>
  );
}
