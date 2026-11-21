"use client";

import { useRef } from "react";

import { SvgChartShell } from "@/components/charts/SvgChartShell";
import type { ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { nearestIndexFromClientXs } from "@/lib/chartNearestIndex";
import { useMeasuredChartWidth } from "@/components/research/useMeasuredChartWidth";
import { HatchDefs, SvgText } from "@/components/monat-v1/simulatorSvg";
import styles from "@/components/knoten/knoten.module.css";
import type { KnotenPalette } from "@/components/knoten/knotenPalette";
import {
  knotenFormatMwTick,
  knotenLimitLabelLayout,
  knotenPlotMetrics,
  knotenYDomain,
  knotenYTicks,
} from "@/lib/knoten/knotenChartLayout";
import type { KnotenCurvePayload, KnotenTyp } from "@/lib/knoten/knotenTypes";
import { KNOTEN_LIMIT_MW, KNOTEN_NODE_LABELS } from "@/lib/knoten/knotenTypes";
import { DISPLAY_NBSP } from "@/lib/displayUnitFormat";

function berlinTimeLabel(index: number): string {
  const totalMin = index * 15;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatMwTooltip(v: number): string {
  return `${v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${DISPLAY_NBSP}MW`;
}

export function KnotenChart({
  typ,
  day,
  k,
  curve,
  colors,
  limitMw = KNOTEN_LIMIT_MW,
  isCustom = false,
  activeSlot,
}: {
  typ: KnotenTyp;
  day: string;
  k: number;
  curve: KnotenCurvePayload;
  colors: KnotenPalette;
  limitMw?: number;
  isCustom?: boolean;
  activeSlot?: number;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const measured = useMeasuredChartWidth(outerRef, 360);
  const n = curve.base.length;
  const maxPos = Math.max(0, ...curve.base, ...curve.fm, ...curve.fk);
  const minNeg = Math.min(0, ...curve.base, ...curve.fm, ...curve.fk);
  const isStadt = isCustom ? maxPos >= Math.abs(minNeg) : typ === "stadt";
  const showPosLimit = isCustom ? maxPos > limitMw * 0.45 : isStadt;
  const showNegLimit = isCustom ? Math.abs(minNeg) > limitMw * 0.45 : !isStadt;
  const sign = isStadt ? 1 : -1;
  const lim = sign * limitMw;
  const layout = knotenPlotMetrics(measured, isStadt ? "stadt" : typ);
  const { min: rawMin, max: rawMax } = knotenYDomain(curve, lim);
  const yMin = showNegLimit ? Math.min(rawMin, -limitMw * 1.1) : rawMin;
  const yMax = showPosLimit ? Math.max(rawMax, limitMw * 1.1) : rawMax;
  const yRange = yMax - yMin || 1;
  const yMw = (mw: number) => layout.top + ((yMax - mw) / yRange) * layout.plotH;
  const xs = curve.base.map((_, i) => layout.left + (i / Math.max(n - 1, 1)) * layout.plotW);
  const yTicks = knotenYTicks(yMin, yMax, layout.narrow);
  const xTicks = layout.narrow ? [0, 6, 12, 18, 24] : [0, 3, 6, 9, 12, 15, 18, 21, 24];

  const overMask = curve.fm.map(
    (fm, i) => Math.abs(fm) > limitMw + 1e-6 && (isCustom || Math.abs(fm) > Math.abs(curve.base[i]!) + 1e-6),
  );
  const hatchId = `kn-${typ}-${day.replace(/-/g, "")}-${limitMw}`;

  const linePath = (vals: number[]) => vals.map((v, i) => `${xs[i]},${yMw(v)}`).join(" ");

  const pick = (clientX: number, _clientY: number, target: HTMLDivElement) =>
    nearestIndexFromClientXs(clientX, target.getBoundingClientRect(), layout.width, xs);

  const title = isCustom
    ? `Eigenes Profil · Grenze ±${limitMw} MW`
    : `${KNOTEN_NODE_LABELS[typ]} · ${day.split("-").reverse().join(".")} · Stufe ×${k}`;
  const aria = `${title}. Leistung am Umspannwerk in Megawatt, 15-Minuten-Auflösung, Europe/Berlin. Grenze ${limitMw} Megawatt.`;
  const axisFont = 12;
  const limitY = yMw(lim);
  const limitLabel = knotenLimitLabelLayout(isStadt ? "stadt" : typ, layout, limitY);

  return (
    <div className={styles.chartOuter} ref={outerRef} data-testid="knoten-chart">
      <p className={styles.yAxisCaption}>
        MW am Umspannwerk (+ Bezug, − Rückspeisung)
      </p>
      <div ref={shellRef}>
        <SvgChartShell
          pointCount={n}
          pickIndex={pick}
          ariaLabel={aria}
          testId="knoten-chart-tooltip"
          className={styles.chartProbe}
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
                { label: "ohne Speicher", value: formatMwTooltip(base) },
                { label: "Markt", value: formatMwTooltip(fm) },
                { label: "knotentreu", value: formatMwTooltip(fk) },
              ],
            };
          }}
        >
          {() => (
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className={styles.svgIntrinsic}
              role="img"
              aria-label={aria}
            >
              <HatchDefs id={hatchId} color={colors.hatch} />
              <rect x={layout.left} y={layout.top} width={layout.plotW} height={layout.plotH} fill={colors.flaeche} />
              {yTicks.map((t) => (
                <g key={`gy${t}`}>
                  <line
                    x1={layout.left}
                    x2={layout.left + layout.plotW}
                    y1={yMw(t)}
                    y2={yMw(t)}
                    stroke={colors.grid}
                    strokeWidth={1}
                  />
                  <SvgText x={layout.left - 8} y={yMw(t) + 4} anchor="end" fill={colors.muted} size={axisFont}>
                    {knotenFormatMwTick(t, layout.narrow)}
                  </SvgText>
                </g>
              ))}
              {xTicks.map((h) => {
                const x = layout.left + (h / 24) * layout.plotW;
                return (
                  <g key={`xh${h}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={layout.top + layout.plotH}
                      y2={layout.top + layout.plotH + 4}
                      stroke={colors.muted}
                      strokeWidth={1}
                    />
                    <SvgText x={x} y={layout.top + layout.plotH + 18} anchor="middle" fill={colors.muted} size={axisFont}>
                      {String(h).padStart(2, "0")}
                    </SvgText>
                  </g>
                );
              })}
              <line
                x1={layout.left}
                x2={layout.left + layout.plotW}
                y1={yMw(0)}
                y2={yMw(0)}
                stroke={colors.grid}
                strokeWidth={1}
              />
              {overMask.map((on, i) => {
                if (!on || i === 0) {
                  return null;
                }
                if (!overMask[i - 1]) {
                  return null;
                }
                const x0 = xs[i - 1]!;
                const x1 = xs[i]!;
                const yTop = yMw(curve.fm[i]!);
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
              <polyline fill="none" stroke={colors.rust} strokeWidth={1.85} points={linePath(curve.fm)} />
              <polyline fill="none" stroke={colors.teal} strokeWidth={1.8} points={linePath(curve.fk)} />
              {showPosLimit ? (
                <line
                  x1={layout.left}
                  x2={layout.left + layout.plotW}
                  y1={yMw(limitMw)}
                  y2={yMw(limitMw)}
                  stroke={colors.muted}
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                />
              ) : null}
              {showNegLimit ? (
                <line
                  x1={layout.left}
                  x2={layout.left + layout.plotW}
                  y1={yMw(-limitMw)}
                  y2={yMw(-limitMw)}
                  stroke={colors.muted}
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                />
              ) : null}
              {activeSlot != null && xs[activeSlot] != null ? (
                <line
                  x1={xs[activeSlot]}
                  x2={xs[activeSlot]}
                  y1={layout.top}
                  y2={layout.top + layout.plotH}
                  stroke={colors.ink}
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                  opacity={0.55}
                />
              ) : null}
              <SvgText
                x={limitLabel.x}
                y={limitLabel.y}
                anchor={limitLabel.anchor}
                fill={colors.muted}
                size={axisFont}
              >
                Grenze {limitMw}
                {DISPLAY_NBSP}MW ({isStadt ? "+ Bezug" : "− Rückspeisung"})
              </SvgText>
            </svg>
          )}
        </SvgChartShell>
      </div>
      <p className={styles.xAxisCaption}>Uhrzeit (Europe/Berlin)</p>
      <p className={styles.footnote}>
        {isCustom
          ? `Lokale Browser-Auswertung · Grenze ±${limitMw}${DISPLAY_NBSP}MW · keine Daten verlassen Ihr Gerät.`
          : `Modellknoten, kein realer Standort · Grenze ${limitMw}${DISPLAY_NBSP}MW (2 × 40${DISPLAY_NBSP}MVA, n-0), Day-Ahead DE-LU, Vollvoraussicht.`}
      </p>
    </div>
  );
}