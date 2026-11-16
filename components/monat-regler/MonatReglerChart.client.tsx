"use client";

import { useCallback, useMemo } from "react";

import styles from "@/components/monat-regler/monat-regler.module.css";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  activeSeries,
  dailyPeaks,
  type MonatReglerCompact,
  type ReglerDayPoint,
} from "@/lib/monatReglerAsset";
import { fleetMonatQuery, fleetTagHref, type NationalFleetFactor, type NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

const W = 1000;
const H_MAIN = 220;
const H_SOC = 48;
const PAD = { l: 44, r: 12, t: 16, b: 28 };

function yAt(gw: number, yMin: number, yMax: number, h: number): number {
  return PAD.t + ((yMax - gw) / (yMax - yMin || 1)) * (h - PAD.t - PAD.b);
}

function xAt(i: number, n: number, w: number): number {
  return PAD.l + (i / Math.max(1, n - 1)) * (w - PAD.l - PAD.r);
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function MonatReglerChart({
  compact,
  factor,
  strategy,
  zoom,
  onZoomChange,
}: {
  compact: MonatReglerCompact;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  zoom: [number, number] | null;
  onZoomChange: (z: [number, number] | null) => void;
}) {
  const series = useMemo(() => activeSeries(compact, factor, strategy), [compact, factor, strategy]);
  const days = useMemo(() => dailyPeaks(compact, series), [compact, series]);
  const refGw = compact.refPeakMw / 1000;
  const viewDays = useMemo(() => {
    if (!zoom) return days;
    return days.slice(zoom[0], zoom[1] + 1);
  }, [days, zoom]);

  const detail = zoom != null;
  const indices = useMemo(() => {
    if (!detail) return null;
    const start = viewDays[0]?.startIndex ?? 0;
    const end = viewDays[viewDays.length - 1]?.endIndex ?? compact.n - 1;
    const out: number[] = [];
    for (let i = start; i <= end; i += 1) out.push(i);
    return out;
  }, [compact.n, detail, viewDays]);

  const yMax = useMemo(() => {
    if (!detail && indices == null) {
      return Math.max(refGw * 1.05, ...viewDays.map((d) => Math.max(d.maxObservedGw, d.maxFleetGw))) + 2;
    }
    const idx = indices ?? [];
    let mx = refGw;
    for (const i of idx) {
      mx = Math.max(mx, series.rMw[i]! / 1000, series.rPrimeMw[i]! / 1000);
    }
    return mx + 2;
  }, [detail, indices, refGw, series, viewDays]);

  const yMin = 0;
  const nPlot = detail ? (indices?.length ?? 1) : viewDays.length;

  const obsPts = useMemo(() => {
    if (detail && indices) {
      return indices.map((i, j) => ({
        x: xAt(j, nPlot, W),
        y: yAt(series.rMw[i]! / 1000, yMin, yMax, H_MAIN),
      }));
    }
    return viewDays.map((d, j) => ({
      x: xAt(j, nPlot, W),
      y: yAt(d.maxObservedGw, yMin, yMax, H_MAIN),
    }));
  }, [detail, indices, nPlot, series.rMw, viewDays, yMax]);

  const fleetPts = useMemo(() => {
    if (detail && indices) {
      return indices.map((i, j) => ({
        x: xAt(j, nPlot, W),
        y: yAt(series.rPrimeMw[i]! / 1000, yMin, yMax, H_MAIN),
      }));
    }
    return viewDays.map((d, j) => ({
      x: xAt(j, nPlot, W),
      y: yAt(d.maxFleetGw, yMin, yMax, H_MAIN),
    }));
  }, [detail, indices, nPlot, series.rPrimeMw, viewDays, yMax]);

  const marketStress = strategy === "markt" && factor > 1;

  const onDayClick = useCallback(
    (day: ReglerDayPoint) => {
      const href = fleetTagHref(day.dateKey, factor, strategy);
      window.location.assign(href);
    },
    [factor, strategy],
  );

  const totalH = H_MAIN + (factor > 1 ? H_SOC + 8 : 0);

  const onDayActivate = (day: ReglerDayPoint) => {
    onDayClick(day);
  };

  return (
    <div className={styles.chartWrap} data-testid="monat-regler-chart">
      <svg viewBox={`0 0 ${W} ${totalH}`} className={styles.chartSvg} role="img" aria-label="Restlast im Oktober">
        <line
          x1={PAD.l}
          y1={yAt(refGw, yMin, yMax, H_MAIN)}
          x2={W - PAD.r}
          y2={yAt(refGw, yMin, yMax, H_MAIN)}
          stroke="var(--mr-gray)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <text
          x={W - PAD.r}
          y={yAt(refGw, yMin, yMax, H_MAIN) - 4}
          textAnchor="end"
          className={styles.ytick}
          fontSize={12}
        >
          {formatQuantity(refGw, "de", 1)} GW
        </text>
        {marketStress
          ? fleetPts.map((p, j) =>
              (detail ? series.rPrimeMw[indices![j]!]! : viewDays[j]!.maxFleetGw * 1000) > compact.refPeakMw ? (
                <line
                  key={`s-${j}`}
                  x1={p.x}
                  y1={yAt(refGw, yMin, yMax, H_MAIN)}
                  x2={p.x}
                  y2={p.y}
                  stroke="var(--mr-blue)"
                  strokeWidth={detail ? 1.5 : 3}
                  opacity={0.35}
                />
              ) : null,
            )
          : null}
        <polyline fill="none" stroke="var(--mr-gray)" strokeWidth={1.75} points={polyline(obsPts)} />
        <polyline
          fill="none"
          stroke={strategy === "spitze" ? "var(--mr-rust)" : strategy === "ueberschuss" ? "var(--mr-blue)" : "var(--mr-blue)"}
          strokeWidth={2}
          points={polyline(fleetPts)}
        />
        {!detail
          ? viewDays.map((d, j) => (
              <rect
                key={d.dateKey}
                x={xAt(j, nPlot, W) - 8}
                y={PAD.t}
                width={16}
                height={H_MAIN - PAD.t - PAD.b}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onDayActivate(d)}
                onDoubleClick={() => {
                  onZoomChange([j, j]);
                }}
                role="button"
                aria-label={`Tag ${d.dateKey}`}
              />
            ))
          : null}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yv = yMin + t * (yMax - yMin);
          const y = yAt(yv, yMin, yMax, H_MAIN);
          return (
            <text key={t} x={4} y={y + 3} className={styles.ytick}>
              {formatQuantity(yv, "de", 0)}
            </text>
          );
        })}
        {!detail
          ? viewDays.map((d, j) =>
              j % 3 === 0 ? (
                <text
                  key={d.dateKey}
                  x={xAt(j, nPlot, W)}
                  y={H_MAIN - 6}
                  textAnchor="middle"
                  className={styles.xtick}
                >
                  {d.dateKey.slice(8, 10)}.
                </text>
              ) : null,
            )
          : null}
        {factor > 1 && indices ? (
          <g transform={`translate(0, ${H_MAIN + 8})`}>
            {indices.map((i, j) => {
              const e = series.eEndMwh[i]!;
              const eMax = Math.max(...indices.map((k) => series.eEndMwh[k]!), 1);
              const h = (e / eMax) * H_SOC;
              return (
                <rect
                  key={i}
                  x={xAt(j, nPlot, W) - 1.5}
                  y={H_SOC - h}
                  width={3}
                  height={h}
                  fill="var(--mr-rust)"
                  opacity={0.65}
                />
              );
            })}
          </g>
        ) : null}
        {detail ? (
          <text
            x={PAD.l}
            y={totalH - 4}
            className={styles.xtick}
            onClick={() => onZoomChange(null)}
            style={{ cursor: "pointer" }}
          >
            ← Monatsübersicht ({fleetMonatQuery(factor, strategy)})
          </text>
        ) : null}
      </svg>
      <p className={styles.brushHint}>
        {detail ? "Doppelklick auf die graue Leiste: zurück zur Monatsübersicht." : "Tag antippen für /tag — Pinch oder Doppelklick-Zoom folgt in der Vorschau."}
      </p>
    </div>
  );
}