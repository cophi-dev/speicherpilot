"use client";

import { useMemo } from "react";

import { yAxisTickLabelDy, yAxisUnitLabelY, yFromReduction } from "@/components/research/chartY";
import type { ResearchCloudModel, ResearchDayModel, ResearchFactor, ResearchWeekDay } from "@/lib/research/researchTypes";
import {
  formatGwSenkung,
  formatReductionTickGw,
  GW_MINUS,
  RESEARCH_FLEET_POWER_MW,
} from "@/lib/research/fleetBasis";

import styles from "@/components/research/research.module.css";

const FACTOR_GW: Record<ResearchFactor, number> = {
  2: 9.28818044,
  5: 23.2204511,
  10: 46.4409022,
};

function xGw(gw: number, width: number, xMax = 50) {
  return 40 + (gw / xMax) * (width - 72);
}

function jitter(seed: string, amp = 4): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return ((h % (amp * 2 + 1)) - amp) * 0.35;
}

function dayOnly(shortLabel: string): string {
  const d = shortLabel.slice(0, 2);
  return `${d}.`;
}

function weekBarValueLabel(gw: number): string {
  const rounded = Math.round(gw * 10) / 10;
  return `${GW_MINUS}${rounded.toFixed(1).replace(".", ",")}`;
}

export function WeekDotsChart({
  week,
  factor = 2,
  useFourHour = false,
  width = 350,
  height = 332,
}: {
  week: ResearchWeekDay[];
  factor?: ResearchFactor;
  useFourHour?: boolean;
  width?: number;
  height?: number;
}) {
  const reductions = week.map((d) => {
    const pt = d.points.find((p) => p.factor === factor)!;
    return useFourHour ? pt.reduction4hGw : pt.reduction175Gw;
  });
  const peak = Math.max(...reductions, 0.5);
  const yMax = Math.max(6, Math.ceil((peak + 1.5) / 2) * 2);
  const padTop = 26;
  const padBottom = 56;
  const colW = (width - 78) / Math.max(week.length, 1);
  const y = (reductionGw: number) => yFromReduction(reductionGw, yMax, height, padTop, padBottom);
  const yZero = y(0);
  const barW = Math.min(28, Math.max(14, colW * 0.62));
  const durationLabel = useFourHour ? "4 h" : "1,76 h";

  const barMeta = week.map((day, col) => {
    const pt = day.points.find((p) => p.factor === factor)!;
    const value = useFourHour ? pt.reduction4hGw : pt.reduction175Gw;
    const cx = 52 + col * colW;
    const barTop = y(value);
    const barH = Math.max(8, yZero - barTop);
    const labelY = yZero + 11;
    return { day, col, cx, value, barTop, barH, labelY };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={styles.chartFixed}
      role="img"
      aria-label={`Spitzensenkung je Tag · ×${factor} · ${durationLabel} · national`}
    >
      <text x={32} y={yAxisUnitLabelY(padTop)} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        GW
      </text>
      {Array.from({ length: yMax / 2 + 1 }, (_, i) => i * 2).map((tick) => {
        const ty = y(tick) + yAxisTickLabelDy(tick);
        const hideTickLabel = barMeta.some((b) => b.cx < 58 && Math.abs(b.labelY - ty) < 15);
        return (
        <g key={tick}>
          <line x1={40} x2={width - 16} y1={y(tick)} y2={y(tick)} stroke="var(--research-line)" />
          {hideTickLabel ? null : (
          <text x={32} y={ty} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {formatReductionTickGw(tick)}
          </text>
          )}
        </g>
        );
      })}
      {barMeta.map(({ day, col, cx, value, barTop, barH, labelY }) => {
        const accentSeries = factor === 2;
        const fill = accentSeries
          ? day.isFocus
            ? "var(--research-accent)"
            : "var(--research-accent-light)"
          : day.isFocus
            ? "var(--research-accent)"
            : "var(--research-fg)";
        return (
          <g key={day.dateKey}>
            {day.isFocus ? <rect x={cx - Math.max(26, barW)} y={padTop - 6} width={Math.max(52, barW * 2)} height={height - padBottom - padTop + 18} rx={6} fill="var(--research-card)" /> : null}
            <rect
              x={cx - barW / 2}
              y={barTop}
              width={barW}
              height={barH}
              rx={4}
              fill={fill}
              opacity={accentSeries ? (day.isFocus ? 1 : 0.78) : useFourHour ? 0.88 : 1}
            />
            <text
              x={cx}
              y={labelY}
              textAnchor="middle"
              fontSize={9}
              fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"}
              fontFamily="var(--font-jetbrains-mono)"
            >
              {weekBarValueLabel(value)}
            </text>
            <text
              x={cx}
              y={height - padBottom + 14}
              textAnchor="middle"
              fontSize={12}
              fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"}
              fontFamily="var(--font-jetbrains-mono)"
            >
              {day.weekdayShort}
            </text>
            <text
              x={cx}
              y={height - padBottom + 32}
              textAnchor="middle"
              fontSize={12}
              fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"}
              fontFamily="var(--font-jetbrains-mono)"
            >
              {dayOnly(day.shortLabel)}
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
  height = 388,
}: {
  model: ResearchDayModel;
  cloud: ResearchCloudModel;
  width?: number;
  height?: number;
}) {
  const yMax = 18;
  const padTop = 26;
  const y = (reductionGw: number) => yFromReduction(reductionGw, yMax, height, padTop, 52);

  const cloudDots = useMemo(() => {
    const dots: Array<{ x: number; y: number }> = [];
    for (const row of cloud.points) {
      (["x2", "x5", "x10"] as const).forEach((key) => {
        const val = row[key];
        if (val == null) return;
        const factor = key === "x2" ? 2 : key === "x5" ? 5 : 10;
        const x = xGw(FACTOR_GW[factor], width) + jitter(`${row.date}-${key}`);
        const yy = y(val) + jitter(`${row.date}-${key}-y`, 3);
        dots.push({ x, y: yy });
      });
    }
    return dots;
  }, [cloud.points, height, width]);

  const medianPts = ([2, 5, 10] as const).map((f) => ({
    x: xGw(FACTOR_GW[f], width),
    y: y(cloud.median[`x${f}` as "x2"]),
  }));

  const p10p90 = ([2, 5, 10] as const).map((f) => ({
    x: xGw(FACTOR_GW[f], width),
    yLo: y(cloud.p90[`x${f}` as "x2"]),
    yHi: y(cloud.p10[`x${f}` as "x2"]),
  }));

  const yesterdayPts = model.saturation
    .filter((p) => p.factor >= 1 && p.factor <= 10)
    .map((p) => ({
      x: xGw((p.factor * RESEARCH_FLEET_POWER_MW) / 1000, width),
      y: y(p.reductionGw),
      factor: p.factor,
      reductionGw: p.reductionGw,
    }));

  const yesterday4h = model.saturation4h
    .filter((p) => p.factor >= 1 && p.factor <= 10)
    .map((p) => ({
      x: xGw((p.factor * RESEARCH_FLEET_POWER_MW) / 1000, width),
      y: y(p.reductionGw),
    }));

  const yLine = yesterdayPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const y4Line = yesterday4h.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const medLine = medianPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const x2p = yesterdayPts.find((p) => p.factor === 2)!;
  const x5p = yesterdayPts.find((p) => p.factor === 5)!;
  const x10p = yesterdayPts.find((p) => p.factor === 10)!;
  const margA = ((x5p.reductionGw - x2p.reductionGw) / (3 * (RESEARCH_FLEET_POWER_MW / 1000))).toFixed(2).replace(".", ",");
  const margB = ((x10p.reductionGw - x5p.reductionGw) / (5 * (RESEARCH_FLEET_POWER_MW / 1000))).toFixed(2).replace(".", ",");

  const midA = { x: (x2p.x + x5p.x) / 2, y: (x2p.y + x5p.y) / 2 };
  const midB = { x: (x5p.x + x10p.x) / 2, y: (x5p.y + x10p.y) / 2 };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={styles.chartFixed}
      role="img"
      aria-label="Gestern auf der Sättigungskurve"
    >
      <text x={32} y={yAxisUnitLabelY(padTop)} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        GW
      </text>
      {[0, 6, 12, 18].map((tick) => (
        <g key={tick}>
          <line x1={40} x2={width - 16} y1={y(tick)} y2={y(tick)} stroke="var(--research-line)" />
          <text x={32} y={y(tick) + yAxisTickLabelDy(tick)} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {formatReductionTickGw(tick)}
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
      <circle cx={x5p.x} cy={x5p.y} r={5} fill="var(--research-accent)" />
      <line x1={x5p.x} y1={x5p.y - 8} x2={x5p.x} y2={x5p.y - 20} stroke="var(--research-muted)" strokeWidth={1} />
      <text x={x5p.x} y={x5p.y - 22} textAnchor="middle" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
        Knick bei ×5
      </text>
      <text x={midA.x} y={midA.y - 10} textAnchor="middle" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        {margA} je GW
      </text>
      <text
        x={width < 400 ? Math.min(midB.x, width - 52) : Math.min(midB.x + 8, width - 8)}
        y={midB.y - 12}
        textAnchor={width < 400 ? "end" : "start"}
        fontSize={12}
        fill="var(--research-muted)"
        fontFamily="var(--font-jetbrains-mono)"
      >
        {margB} je GW
      </text>
      {([1, 2, 5, 10] as const).map((f) => (
        <text
          key={f}
          x={xGw((f * RESEARCH_FLEET_POWER_MW) / 1000, width)}
          y={height - 36}
          textAnchor="middle"
          fontSize={12}
          fill="var(--research-muted)"
          fontFamily="var(--font-jetbrains-mono)"
        >
          ×{f}
        </text>
      ))}
      {[0, 25, 50].map((gw) => (
        <text key={gw} x={xGw(gw, width, 50)} y={height - 14} textAnchor="middle" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          {gw}
        </text>
      ))}
    </svg>
  );
}
