"use client";

import { SvgChartShell } from "@/components/charts/SvgChartShell";
import type { ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { nearestIndexFromClientXs } from "@/lib/chartNearestIndex";
import { HatchDefs, SvgText } from "@/components/monat-v1/simulatorSvg";
import styles from "@/components/knoten/knoten.module.css";
import type { KnotenPalette } from "@/components/knoten/knotenPalette";
import type { KnotenCurvePayload, KnotenTyp } from "@/lib/knoten/knotenTypes";
import { KNOTEN_LIMIT_MW, KNOTEN_NODE_LABELS } from "@/lib/knoten/knotenTypes";

function formatMw(v: number): string {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function berlinTimeLabel(index: number): string {
  const totalMin = index * 15;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function KnotenChart({
  typ,
  day,
  k,
  curve,
  colors,
}: {
  typ: KnotenTyp;
  day: string;
  k: number;
  curve: KnotenCurvePayload;
  colors: KnotenPalette;
}) {
  const n = curve.base.length;
  const isStadt = typ === "stadt";
  const sign = isStadt ? 1 : -1;
  const lim = sign * KNOTEN_LIMIT_MW;
  const vb = { w: 560, L: 52, R: 16, T: 28, B: 36, H: 280 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.H - vb.T - vb.B;
  const xs = curve.base.map((_, i) => vb.L + (i / Math.max(n - 1, 1)) * plotW);

  const all = [...curve.base, ...curve.fm, ...curve.fk, lim, 0];
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const pad = Math.max(8, (rawMax - rawMin) * 0.08);
  const yMin = Math.floor((rawMin - pad) / 5) * 5;
  const yMax = Math.ceil((rawMax + pad) / 5) * 5;
  const yRange = yMax - yMin || 1;
  const yMw = (mw: number) => vb.T + ((yMax - mw) / yRange) * plotH;

  const overMask = curve.fm.map(
    (fm, i) => Math.abs(fm) > KNOTEN_LIMIT_MW + 1e-6 && Math.abs(fm) > Math.abs(curve.base[i]!) + 1e-6,
  );
  const hatchId = `kn-${typ}-${day.replace(/-/g, "")}`;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${xs[i]},${yMw(v)}`).join(" ");

  const pick = (clientX: number, _clientY: number, target: HTMLDivElement) =>
    nearestIndexFromClientXs(clientX, target.getBoundingClientRect(), vb.w, xs);

  const title = `${KNOTEN_NODE_LABELS[typ]} · ${day.split("-").reverse().join(".")} · Stufe ×${k}`;
  const aria = `${title}. Leistung am Umspannwerk in Megawatt, 15-Minuten-Auflösung, Europe/Berlin. Grenze ${KNOTEN_LIMIT_MW} Megawatt.`;

  return (
    <div className={styles.chartWrap} data-testid="knoten-chart">
      <SvgChartShell
        pointCount={n}
        pickIndex={pick}
        ariaLabel={aria}
        testId="knoten-chart-tooltip"
        tooltip={(i): { timeLabel: string | null; rows: ChartTooltipRow[] | null } => {
          if (i == null) {
            return { timeLabel: null, rows: null };
          }
          const base = curve.base[i]!;
          const fm = curve.fm[i]!;
          const fk = curve.fk[i]!;
          return {
            timeLabel: berlinTimeLabel(i),
            rows: [
              { label: "ohne Speicher", value: `${formatMw(base)}\u00A0MW` },
              { label: "Markt", value: `${formatMw(fm)}\u00A0MW` },
              { label: "knotentreu", value: `${formatMw(fk)}\u00A0MW` },
            ],
          };
        }}
      >
        {() => (
          <svg viewBox={`0 0 ${vb.w} ${vb.H}`} className={styles.svg} role="img" aria-label={aria}>
            <HatchDefs id={hatchId} color={colors.hatch} />
            <rect x={vb.L} y={vb.T} width={plotW} height={plotH} fill={colors.flaeche} />
            {Array.from({ length: Math.ceil((yMax - yMin) / 10) + 1 }, (_, j) => yMin + j * 10)
              .filter((t) => t <= yMax)
              .map((t) => (
                <g key={`gy${t}`}>
                  <line x1={vb.L} x2={vb.L + plotW} y1={yMw(t)} y2={yMw(t)} stroke={colors.grid} strokeWidth={1} />
                  <SvgText x={vb.L - 6} y={yMw(t) + 4} anchor="end" fill={colors.muted} size={12}>
                    {formatMw(t)}
                  </SvgText>
                </g>
              ))}
            <line x1={vb.L} x2={vb.L + plotW} y1={yMw(0)} y2={yMw(0)} stroke={colors.grid} strokeWidth={1} />
            {overMask.map((on, i) => {
              if (!on || i === 0) {
                return null;
              }
              const prev = overMask[i - 1];
              if (!prev) {
                return null;
              }
              const x0 = xs[i - 1]!;
              const x1 = xs[i]!;
              const yTop = yMw(Math.max(lim, curve.fm[i]! * sign) * sign === lim ? lim : curve.fm[i]!);
              const yBot = yMw(lim);
              const top = Math.min(yTop, yBot);
              const h = Math.abs(yBot - yTop);
              return (
                <rect
                  key={`ov${i}`}
                  x={x0}
                  y={top}
                  width={Math.max(x1 - x0, 1)}
                  height={Math.max(h, 1)}
                  fill={`url(#hatch-${hatchId})`}
                  opacity={0.85}
                />
              );
            })}
            <polyline fill="none" stroke={colors.gray} strokeWidth={1.6} points={linePath(curve.base)} />
            <polyline fill="none" stroke={colors.rust} strokeWidth={1.6} points={linePath(curve.fm)} />
            <polyline fill="none" stroke={colors.teal} strokeWidth={1.8} points={linePath(curve.fk)} />
            <line x1={vb.L} x2={vb.L + plotW} y1={yMw(lim)} y2={yMw(lim)} stroke={colors.rot} strokeWidth={2} />
            <SvgText x={vb.L + plotW - 4} y={yMw(lim) - 8} anchor="end" fill={colors.rot} size={11}>
              Grenze {KNOTEN_LIMIT_MW}{"\u00A0"}MW ({isStadt ? "+ Bezug" : "− Rückspeisung"})
            </SvgText>
            <SvgText x={vb.L} y={vb.H - 10} anchor="start" fill={colors.muted} size={12}>
              MW am Umspannwerk (+ Bezug, − Rückspeisung)
            </SvgText>
            <SvgText x={vb.L + plotW / 2} y={vb.H - 10} anchor="middle" fill={colors.muted} size={12}>
              Uhrzeit (Europe/Berlin)
            </SvgText>
          </svg>
        )}
      </SvgChartShell>
      <p className={styles.footnote}>
        Modellknoten, kein realer Standort · Szenarien rechnen. Grenze {KNOTEN_LIMIT_MW}
        {"\u00A0"}MW (2 × 40{"\u00A0"}MVA, n-0), Day-Ahead DE-LU, Vollvoraussicht.
      </p>
    </div>
  );
}