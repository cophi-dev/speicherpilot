"use client";

import type { ResearchDayModel, ResearchFactor, ResearchWeekDay } from "@/lib/research/researchTypes";

const FACTORS: ResearchFactor[] = [2, 5, 10];

function yMap(value: number, yMin: number, yMax: number, height: number, padTop = 26, padBottom = 40) {
  const inner = height - padTop - padBottom;
  return padTop + ((yMax - value) / (yMax - yMin)) * inner;
}

function xMap(index: number, n: number, width: number, padX = 40) {
  const inner = width - padX - 36;
  return padX + (index / Math.max(1, n - 1)) * inner;
}

export function ResidualMesserChart({
  model,
  factor,
  width = 350,
  height = 330,
}: {
  model: ResearchDayModel;
  factor: ResearchFactor;
  width?: number;
  height?: number;
}) {
  const yMin = 45;
  const yMax = 70;
  const stage = model.stages.find((s) => s.factor === factor)!;
  const cap = stage.capGw;

  const line = model.series
    .map((p, i) => {
      const x = xMap(i, model.series.length, width);
      const y = yMap(p.residualGw, yMin, yMax, height);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const cappedAreas: string[] = [];
  let area: Array<{ x: number; y: number; yCap: number }> = [];
  const flush = () => {
    if (area.length < 2) {
      area = [];
      return;
    }
    const capY = yMap(cap, yMin, yMax, height);
    const top = area.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
    const bottom = [...area].reverse().map((p) => `${p.x.toFixed(1)},${capY.toFixed(1)}`).join(" L");
    cappedAreas.push(`M${top} L${bottom} Z`);
    area = [];
  };

  model.series.forEach((p, i) => {
    const x = xMap(i, model.series.length, width);
    const y = yMap(p.residualGw, yMin, yMax, height);
    const yCap = yMap(cap, yMin, yMax, height);
    if (p.residualGw > cap) {
      area.push({ x, y, yCap });
    } else {
      flush();
    }
  });
  flush();

  const peakIdx = model.series.findIndex((p) => Math.abs(p.residualGw - model.peakGw) < 0.05);
  const peakPoint = model.series[peakIdx] ?? model.series[model.series.length - 1]!;
  const px = xMap(peakIdx, model.series.length, width);
  const py = yMap(peakPoint.residualGw, yMin, yMax, height);
  const capY = yMap(cap, yMin, yMax, height);

  return (
    <svg
      className="research-chart"
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Restlast national mit Kappung bei ×${factor}`}
    >
      {[45, 50, 55, 60, 65, 70].map((tick) => (
        <g key={tick}>
          <line x1={40} x2={width - 36} y1={yMap(tick, yMin, yMax, height)} y2={yMap(tick, yMin, yMax, height)} stroke="var(--research-line)" />
          <text x={32} y={yMap(tick, yMin, yMax, height) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick}
          </text>
        </g>
      ))}
      {FACTORS.map((f) => {
        const st = model.stages.find((s) => s.factor === f)!;
        const y = yMap(st.capGw, yMin, yMax, height);
        const active = f === factor;
        return (
          <g key={f}>
            <line
              x1={40}
              x2={width - 36}
              y1={y}
              y2={y}
              stroke={active ? "var(--research-accent)" : "var(--research-dim)"}
              strokeWidth={active ? 2 : 1}
              strokeDasharray={active ? undefined : "3 4"}
            />
            <text x={width - 28} y={y + 4} fontSize={active ? 14 : 12} fontWeight={active ? 700 : 500} fill={active ? "var(--research-fg)" : "var(--research-muted)"} fontFamily="var(--font-jetbrains-mono)">
              ×{f}
            </text>
          </g>
        );
      })}
      {cappedAreas.map((d, i) => (
        <path key={i} d={d} fill="color-mix(in srgb, var(--research-accent) 30%, transparent)" />
      ))}
      <path d={line} fill="none" stroke="var(--research-fg)" strokeWidth={1.5} />
      <circle cx={px} cy={py} r={3.5} fill="var(--research-fg)" />
      <text x={px - 4} y={py - 10} textAnchor="end" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
        {model.peakGw.toFixed(2).replace(".", ",")} GW · {model.peakTime}
      </text>
      <line x1={px} x2={px} y1={py} y2={capY} stroke="var(--research-accent)" strokeWidth={2} />
      {[0, 6, 12, 18, 24].map((h) => {
        const idx = model.series.findIndex((p) => p.hour === h && p.minute === 0) || 0;
        const x = xMap(idx < 0 ? 0 : idx, model.series.length, width);
        return (
          <text key={h} x={x} y={height - 8} textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {h === 24 ? "24 Uhr" : String(h).padStart(2, "0")}
          </text>
        );
      })}
    </svg>
  );
}

export function WeekDotsChart({ week, width = 350, height = 320 }: { week: ResearchWeekDay[]; width?: number; height?: number }) {
  const yMin = 0;
  const yMax = -14;
  const colW = (width - 80) / Math.max(week.length, 1);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Spitzensenkung je Tag national">
      {[-2, -4, -6, -8, -10, -12, -14, 0].map((tick) => (
        <g key={tick}>
          <line x1={40} x2={width - 20} y1={yMap(tick, yMin, yMax, height)} y2={yMap(tick, yMin, yMax, height)} stroke="var(--research-line)" />
          <text x={32} y={yMap(tick, yMin, yMax, height) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick}
          </text>
        </g>
      ))}
      {week.map((day, col) => {
        const cx = 56 + col * colW;
        return (
          <g key={day.dateKey}>
            {day.isFocus ? <rect x={cx - 18} y={18} width={36} height={height - 64} rx={6} fill="var(--research-card)" /> : null}
            {([2, 5, 10] as const).map((factor) => {
              const pt = day.points.find((p) => p.factor === factor)!;
              const cy = yMap(-pt.reduction175Gw, yMin, yMax, height, 26, 54);
              const cy4 = yMap(-pt.reduction4hGw, yMin, yMax, height, 26, 54);
              const active = day.isFocus && factor === 5;
              return (
                <g key={factor}>
                  <path d={`M${cx - 8},${cy} H${cx + 8} V${cy4}`} fill="none" stroke="var(--research-dim)" strokeWidth={1} />
                  {pt.powerLimited4h ? <rect x={cx + 2} y={cy4 - 5} width={10} height={10} fill="var(--research-fg)" /> : <line x1={cx - 2} x2={cx + 12} y1={cy4} y2={cy4} stroke="var(--research-fg)" strokeWidth={2} />}
                  <circle cx={cx - 8} cy={cy} r={6} fill="var(--research-bg)" stroke={active ? "var(--research-accent)" : "var(--research-fg)"} strokeWidth={2.5} />
                </g>
              );
            })}
            <text x={cx} y={height - 22} textAnchor="middle" fontSize={12} fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"} fontFamily="var(--font-jetbrains-mono)">
              {day.weekdayShort}
            </text>
            <text x={cx} y={height - 6} textAnchor="middle" fontSize={12} fill={day.isFocus ? "var(--research-fg)" : "var(--research-muted)"} fontFamily="var(--font-jetbrains-mono)">
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
  height = 280,
}: {
  model: ResearchDayModel;
  cloud: { median: { x5: number }; p10: { x5: number }; p90: { x5: number } };
  width?: number;
  height?: number;
}) {
  const yMin = 0;
  const yMax = -18;
  const pts = model.saturation.filter((p) => p.factor >= 1);
  const line = pts
    .map((p, i) => {
      const x = 40 + (p.factor / 10) * (width - 80);
      const y = yMap(-p.reductionGw, yMin, yMax, height);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const x5 = model.saturation.find((p) => p.factor === 5);
  const x5x = 40 + 0.5 * (width - 80);
  const x5y = x5 ? yMap(-x5.reductionGw, yMin, yMax, height) : 0;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gestern auf der Sättigungskurve">
      <rect
        x={40}
        y={yMap(-cloud.p90.x5, yMin, yMax, height)}
        width={width - 80}
        height={Math.abs(yMap(-cloud.p10.x5, yMin, yMax, height) - yMap(-cloud.p90.x5, yMin, yMax, height))}
        fill="color-mix(in srgb, var(--research-dim) 25%, transparent)"
      />
      <path d={line} fill="none" stroke="var(--research-accent)" strokeWidth={2} />
      {x5 ? <circle cx={x5x} cy={x5y} r={5} fill="var(--research-accent)" /> : null}
      <text x={x5x + 8} y={x5y - 6} fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
        Knick bei ×5
      </text>
      <text x={52} y={yMap(-3.5, yMin, yMax, height)} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        Median ×5 {cloud.median.x5.toFixed(2).replace(".", ",")} GW
      </text>
    </svg>
  );
}
