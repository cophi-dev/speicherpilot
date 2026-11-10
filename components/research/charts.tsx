"use client";

import { useMemo } from "react";

import type { ResearchCloudModel, ResearchDayModel, ResearchFactor, ResearchWeekDay } from "@/lib/research/researchTypes";
import { RESEARCH_FLEET_POWER_MW } from "@/lib/research/fleetBasis";

const FACTOR_GW: Record<ResearchFactor, number> = {
  2: 9.28818044,
  5: 23.2204511,
  10: 46.4409022,
};

function yMap(value: number, yMin: number, yMax: number, height: number, padTop = 26, padBottom = 44) {
  const inner = height - padTop - padBottom;
  return padTop + ((yMax - value) / (yMax - yMin)) * inner;
}

function xGw(gw: number, width: number, xMax = 50) {
  return 40 + (gw / xMax) * (width - 72);
}

function jitter(seed: string, amp = 4): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return ((h % (amp * 2 + 1)) - amp) * 0.35;
}

function WeekMarker4h({ kind, cx, cy }: { kind: "tick" | "square" | "double"; cx: number; cy: number }) {
  if (kind === "square") {
    return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill="var(--research-fg)" />;
  }
  if (kind === "double") {
    return (
      <g>
        <line x1={cx - 6} x2={cx + 6} y1={cy - 2} y2={cy - 2} stroke="var(--research-muted)" strokeWidth={1.5} />
        <line x1={cx - 6} x2={cx + 6} y1={cy + 2} y2={cy + 2} stroke="var(--research-muted)" strokeWidth={1.5} />
      </g>
    );
  }
  return <line x1={cx - 6} x2={cx + 6} y1={cy} y2={cy} stroke="var(--research-fg)" strokeWidth={2} />;
}

export function WeekDotsChart({ week, width = 350, height = 332 }: { week: ResearchWeekDay[]; width?: number; height?: number }) {
  const yMin = 0;
  const yMax = -14;
  const padBottom = 56;
  const colW = (width - 78) / Math.max(week.length, 1);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Spitzensenkung je Tag national">
      <text x={26} y={10} textAnchor="end" fontSize={11} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        GW
      </text>
      {[-2, -4, -6, -8, -10, -12, -14, 0].map((tick) => (
        <g key={tick}>
          <line x1={40} x2={width - 16} y1={yMap(tick, yMin, yMax, height)} y2={yMap(tick, yMin, yMax, height)} stroke="var(--research-line)" />
          <text x={32} y={yMap(tick, yMin, yMax, height) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick}
          </text>
        </g>
      ))}
      {week.map((day, col) => {
        const cx = 52 + col * colW;
        const colX2 = cx - 10;
        const colX4 = cx + 4;
        return (
          <g key={day.dateKey}>
            {day.isFocus ? <rect x={cx - 20} y={16} width={40} height={height - 58} rx={6} fill="var(--research-card)" /> : null}
            {([2, 5, 10] as const).map((factor) => {
              const pt = day.points.find((p) => p.factor === factor)!;
              const cy = yMap(-pt.reduction175Gw, yMin, yMax, height, 26, 54);
              const cy4 = yMap(-pt.reduction4hGw, yMin, yMax, height, 26, 54);
              const active = day.isFocus && factor === 5;
              const stroke = active ? "var(--research-accent)" : "var(--research-fg)";
              return (
                <g key={factor}>
                  <path d={`M${colX2 + 6},${cy} H${colX4 - 6} V${cy4}`} fill="none" stroke="var(--research-dim)" strokeWidth={1} />
                  <WeekMarker4h kind={pt.marker4h} cx={colX4} cy={cy4} />
                  <circle
                    cx={colX2}
                    cy={cy}
                    r={6}
                    fill="var(--research-bg)"
                    stroke={stroke}
                    strokeWidth={2.5}
                    strokeDasharray={pt.marker175 === "dashed" ? "2 2" : undefined}
                  />
                </g>
              );
            })}
            <text x={cx} y={height - padBottom + 14} textAnchor="middle" fontSize={11} fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"} fontFamily="var(--font-jetbrains-mono)">
              {day.weekdayShort}
            </text>
            <text x={cx} y={height - padBottom + 30} textAnchor="middle" fontSize={11} fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"} fontFamily="var(--font-jetbrains-mono)">
              {day.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SaturationChart({
  model,
  cloud,
  width = 350,
  height = 360,
}: {
  model: ResearchDayModel;
  cloud: ResearchCloudModel;
  width?: number;
  height?: number;
}) {
  const yMin = 0;
  const yMax = -18;

  const cloudDots = useMemo(() => {
    const dots: Array<{ x: number; y: number }> = [];
    for (const row of cloud.points) {
      (["x2", "x5", "x10"] as const).forEach((key) => {
        const val = row[key];
        if (val == null) return;
        const factor = key === "x2" ? 2 : key === "x5" ? 5 : 10;
        const x = xGw(FACTOR_GW[factor], width) + jitter(`${row.date}-${key}`);
        const y = yMap(-val, yMin, yMax, height) + jitter(`${row.date}-${key}-y`, 3);
        dots.push({ x, y });
      });
    }
    return dots;
  }, [cloud.points, height, width]);

  const medianPts = ([2, 5, 10] as const).map((f) => ({
    x: xGw(FACTOR_GW[f], width),
    y: yMap(-cloud.median[`x${f}` as "x2"], yMin, yMax, height),
  }));

  const p10p90 = ([2, 5, 10] as const).map((f) => ({
    x: xGw(FACTOR_GW[f], width),
    yLo: yMap(-cloud.p90[`x${f}` as "x2"], yMin, yMax, height),
    yHi: yMap(-cloud.p10[`x${f}` as "x2"], yMin, yMax, height),
  }));

  const yesterdayPts = model.saturation
    .filter((p) => p.factor >= 1 && p.factor <= 10)
    .map((p) => ({
      x: xGw((p.factor * RESEARCH_FLEET_POWER_MW) / 1000, width),
      y: yMap(-p.reductionGw, yMin, yMax, height),
    }));

  const yesterday4h = model.saturation4h
    .filter((p) => p.factor >= 1 && p.factor <= 10)
    .map((p) => ({
      x: xGw((p.factor * RESEARCH_FLEET_POWER_MW) / 1000, width),
      y: yMap(-p.reductionGw, yMin, yMax, height),
    }));

  const yLine = yesterdayPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const y4Line = yesterday4h.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const medLine = medianPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const x5 = model.saturation.find((p) => p.factor === 5)!;
  const x2 = model.saturation.find((p) => p.factor === 2)!;
  const x10 = model.saturation.find((p) => p.factor === 10)!;
  const margA = ((x5.reductionGw - x2.reductionGw) / (3 * (RESEARCH_FLEET_POWER_MW / 1000))).toFixed(2).replace(".", ",");
  const margB = ((x10.reductionGw - x5.reductionGw) / (5 * (RESEARCH_FLEET_POWER_MW / 1000))).toFixed(2).replace(".", ",");

  const x5Idx = model.saturation.findIndex((p) => p.factor === 5);
  const x5p = yesterdayPts[x5Idx];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gestern auf der Sättigungskurve">
      <text x={26} y={10} textAnchor="end" fontSize={11} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        GW
      </text>
      {[-6, -12, -18].map((tick) => (
        <g key={tick}>
          <line x1={40} x2={width - 16} y1={yMap(tick, yMin, yMax, height)} y2={yMap(tick, yMin, yMax, height)} stroke="var(--research-line)" />
          <text x={32} y={yMap(tick, yMin, yMax, height) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick}
          </text>
        </g>
      ))}
      {p10p90.map((b, i) => (
        <rect key={i} x={b.x - 8} y={b.yLo} width={16} height={Math.max(2, b.yHi - b.yLo)} fill="color-mix(in srgb, var(--research-dim) 28%, transparent)" />
      ))}
      {cloudDots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1.2} fill="var(--research-dim)" opacity={0.65} />
      ))}
      <path d={medLine} fill="none" stroke="var(--research-muted)" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d={y4Line} fill="none" stroke="var(--research-muted)" strokeWidth={1.5} strokeDasharray="2 3" />
      <path d={yLine} fill="none" stroke="var(--research-accent)" strokeWidth={2} />
      {x5p ? <circle cx={x5p.x} cy={x5p.y} r={5} fill="var(--research-accent)" /> : null}
      {x5p ? (
        <g>
          <line x1={x5p.x} y1={x5p.y - 6} x2={x5p.x - 52} y2={yMap(-3.4, yMin, yMax, height)} stroke="var(--research-muted)" strokeWidth={1} />
          <text x={x5p.x - 54} y={yMap(-3.4, yMin, yMax, height) - 4} textAnchor="end" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
            Knick bei ×5
          </text>
        </g>
      ) : null}
      <g>
        <line x1={xGw(15, width)} y1={yMap(-2.2, yMin, yMax, height)} x2={width - 58} y2={30} stroke="var(--research-muted)" strokeWidth={1} />
        <text x={width - 60} y={26} textAnchor="end" fontSize={11} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          {margA} je GW
        </text>
      </g>
      <g>
        <line x1={xGw(38, width)} y1={yMap(-8.5, yMin, yMax, height) + 8} x2={xGw(46, width)} y2={yMap(-11.5, yMin, yMax, height) - 6} stroke="var(--research-muted)" strokeWidth={1} />
        <text x={xGw(48, width)} y={yMap(-11.5, yMin, yMax, height) - 8} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          {margB} je GW
        </text>
      </g>
      {([2, 5, 10] as const).map((f, i) => (
        <text
          key={f}
          x={xGw((f * RESEARCH_FLEET_POWER_MW) / 1000, width) + (f === 2 ? -6 : f === 5 ? 0 : 4)}
          y={height - 44 - (i % 2) * 10}
          textAnchor="middle"
          fontSize={11}
          fill="var(--research-muted)"
          fontFamily="var(--font-jetbrains-mono)"
        >
          ×{f}
        </text>
      ))}
      {[25, 50].map((gw) => (
        <text key={gw} x={xGw(gw, width, 50)} y={height - 12} textAnchor="middle" fontSize={11} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          {gw}
        </text>
      ))}
      <text x={width - 8} y={height - 12} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        GW
      </text>
    </svg>
  );
}
