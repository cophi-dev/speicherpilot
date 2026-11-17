"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "@/components/monat-regler/monat-regler.module.css";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  activeSeries,
  dailyPeaks,
  type MonatReglerCompact,
  type ReglerDayPoint,
} from "@/lib/monatReglerAsset";
import { stackLineLabelsAtX } from "@/lib/messerHeroLabels";
import { fleetTagHref, type NationalFleetFactor, type NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

const Y_MIN = 0;
const Y_MAX = 100;
const Y_TICKS = [0, 20, 40, 60, 80, 100] as const;
const MOBILE_X_DAYS = new Set(["01", "08", "15", "22", "29"]);
const H_SOC = 48;
const PAD = { l: 44, r: 92, t: 18, b: 32 };
const STRATEGY_LABEL: Record<NationalFleetStrategyUi, string> = {
  spitze: "Spitze",
  ueberschuss: "Überschuss",
  markt: "Markt",
};
const LINE_END_LABEL_FS = 12;

function useViewportWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return wide;
}

function yAt(gw: number, plotH: number): number {
  return PAD.t + ((Y_MAX - gw) / (Y_MAX - Y_MIN)) * (plotH - PAD.t - PAD.b);
}

function xAt(i: number, n: number, w: number): number {
  return PAD.l + (i / Math.max(1, n - 1)) * (w - PAD.l - PAD.r);
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function dayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${d}.${m}.`;
}

export function MonatReglerChart({
  compact,
  factor,
  strategy,
}: {
  compact: MonatReglerCompact;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cssW, setCssW] = useState(358);
  const wideViewport = useViewportWide();
  const [tapHint, setTapHint] = useState<{ day: ReglerDayPoint; label: string } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setCssW(Math.max(280, Math.round(el.clientWidth)));
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => activeSeries(compact, factor, strategy), [compact, factor, strategy]);
  const days = useMemo(() => dailyPeaks(compact, series), [compact, series]);
  const refGw = compact.refPeakMw / 1000;
  const plotH = wideViewport ? 320 : 240;
  const socBand = factor > 1 ? H_SOC + 10 : 0;
  const totalH = plotH + socBand;
  const nPlot = days.length;

  const obsPts = useMemo(
    () =>
      days.map((d, j) => ({
        x: xAt(j, nPlot, cssW),
        y: yAt(d.maxObservedGw, plotH),
      })),
    [cssW, days, nPlot, plotH],
  );

  const fleetPts = useMemo(
    () =>
      days.map((d, j) => ({
        x: xAt(j, nPlot, cssW),
        y: yAt(d.maxFleetGw, plotH),
      })),
    [cssW, days, nPlot, plotH],
  );

  const fleetStroke =
    strategy === "markt" ? "var(--mr-markt-line)" : strategy === "spitze" ? "var(--mr-rust)" : "var(--mr-blue)";
  const fleetDash = strategy === "markt" ? "6 3" : undefined;
  const marketStress = strategy === "markt" && factor > 1;

  const dayHitW = Math.max(44, (cssW - PAD.l - PAD.r) / Math.max(1, nPlot));

  const pickDay = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const plotW = cssW - PAD.l - PAD.r;
      const t = Math.min(1, Math.max(0, (x - PAD.l) / plotW));
      const idx = Math.round(t * (nPlot - 1));
      return days[idx] ?? null;
    },
    [cssW, days, nPlot],
  );

  const onPlotPointerUp = (ev: React.PointerEvent) => {
    const day = pickDay(ev.clientX);
    if (!day) return;
    const gw = Math.max(day.maxObservedGw, day.maxFleetGw);
    setTapHint({
      day,
      label: `${dayLabel(day.dateKey)} · ${formatQuantity(gw, "de", 1)}\u00a0GW → Tag öffnen`,
    });
  };

  const obsEnd = obsPts[obsPts.length - 1];
  const fleetEnd = fleetPts[fleetPts.length - 1];

  const endLineLabels = useMemo(() => {
    if (!obsEnd) return [];
    const labelX = obsEnd.x + 4;
    const plotBottom = plotH - PAD.b;
    const candidates: Array<{ text: string; preferredY: number; fill: string }> = [
      {
        text: "beobachtet",
        preferredY: obsEnd.y - 6,
        fill: "var(--mr-observed)",
      },
    ];
    if (fleetEnd && factor > 1) {
      candidates.push({
        text: `×${factor} · ${STRATEGY_LABEL[strategy]}`,
        preferredY: fleetEnd.y + 14,
        fill: fleetStroke,
      });
    }
    const stacked = stackLineLabelsAtX(
      candidates.map((c) => ({ text: c.text, preferredY: c.preferredY })),
      labelX,
      "start",
      LINE_END_LABEL_FS,
      PAD.t,
      plotBottom,
    );
    return candidates.map((c, i) => ({
      ...c,
      x: labelX,
      y: stacked[i]!.y,
    }));
  }, [factor, fleetEnd, fleetStroke, obsEnd, plotH, strategy]);

  return (
    <div ref={wrapRef} className={styles.chartWrap} data-testid="monat-regler-chart">
      <svg
        viewBox={`0 0 ${cssW} ${totalH}`}
        className={styles.chartSvg}
        width={cssW}
        height={totalH}
        role="img"
        aria-label="Restlast im Oktober"
      >
        <text x={PAD.l + 6} y={PAD.t - 4} className={styles.yUnit} textAnchor="start">
          GW
        </text>
        {Y_TICKS.map((yv) => {
          const y = yAt(yv, plotH);
          return (
            <g key={yv}>
              <line x1={PAD.l} y1={y} x2={cssW - PAD.r} y2={y} stroke="var(--mr-grid)" strokeWidth={1} />
              <text x={PAD.l - 8} y={y + 4} textAnchor="end" className={styles.ytick}>
                {formatQuantity(yv, "de", 0)}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD.l}
          y1={yAt(refGw, plotH)}
          x2={cssW - PAD.r}
          y2={yAt(refGw, plotH)}
          stroke="var(--mr-muted)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <text
          x={cssW - PAD.r}
          y={yAt(refGw, plotH) - 4}
          textAnchor="end"
          className={styles.ytick}
        >
          {formatQuantity(refGw, "de", 1)}
        </text>
        {marketStress
          ? fleetPts.map((p, j) =>
              days[j]!.maxFleetGw * 1000 > compact.refPeakMw ? (
                <line
                  key={`s-${days[j]!.dateKey}`}
                  x1={p.x}
                  y1={yAt(refGw, plotH)}
                  x2={p.x}
                  y2={p.y}
                  stroke="var(--mr-markt-line)"
                  strokeWidth={2}
                  opacity={1}
                />
              ) : null,
            )
          : null}
        <polyline
          fill="none"
          stroke="var(--mr-observed)"
          strokeWidth={1.75}
          points={polyline(obsPts)}
        />
        <polyline
          fill="none"
          stroke={fleetStroke}
          strokeWidth={2}
          strokeDasharray={fleetDash}
          points={polyline(fleetPts)}
        />
        {endLineLabels.map((label, i) => (
          <text key={`${label.text}-${i}`} x={label.x} y={label.y} className={styles.lineLabel} fill={label.fill}>
            {label.text}
          </text>
        ))}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={cssW - PAD.l - PAD.r}
          height={plotH - PAD.t - PAD.b}
          fill="transparent"
          onPointerUp={onPlotPointerUp}
          style={{ cursor: "pointer", touchAction: "manipulation" }}
        />
        {days.map((d, j) => (
          <rect
            key={d.dateKey}
            x={xAt(j, nPlot, cssW) - dayHitW / 2}
            y={PAD.t}
            width={dayHitW}
            height={plotH - PAD.t - PAD.b}
            fill="transparent"
            pointerEvents="none"
          />
        ))}
        {days.map((d, j) => {
          if (cssW < 768 && !MOBILE_X_DAYS.has(d.dateKey.slice(8, 10))) {
            return null;
          }
          if (cssW >= 768 && j % 2 !== 0) {
            return null;
          }
          return (
            <text
              key={`x-${d.dateKey}`}
              x={xAt(j, nPlot, cssW)}
              y={plotH - 8}
              textAnchor="middle"
              className={styles.xtick}
            >
              {d.dateKey.slice(8, 10)}.
            </text>
          );
        })}
        {factor > 1 ? (
          <g transform={`translate(0, ${plotH + 6})`}>
            {days.map((d, j) => {
              const eMax = Math.max(...days.map((dd) => {
                const i0 = dd.startIndex;
                return series.eEndMwh[i0] ?? 0;
              }), 1);
              const e = series.eEndMwh[d.startIndex] ?? 0;
              const h = (e / eMax) * H_SOC;
              return (
                <rect
                  key={`soc-${d.dateKey}`}
                  x={xAt(j, nPlot, cssW) - Math.max(2, dayHitW * 0.15)}
                  y={H_SOC - h}
                  width={Math.max(4, dayHitW * 0.3)}
                  height={h}
                  fill="var(--mr-rust)"
                  opacity={0.65}
                />
              );
            })}
          </g>
        ) : null}
      </svg>
      {tapHint ? (
        <div className={styles.tapTooltip}>
          <Link
            href={fleetTagHref(tapHint.day.dateKey, factor, strategy)}
            className={styles.tapTooltipLink}
          >
            {tapHint.label}
          </Link>
          <button type="button" className={styles.tapTooltipDismiss} onClick={() => setTapHint(null)}>
            Schließen
          </button>
        </div>
      ) : null}
      <p className={styles.brushHint}>Tag antippen für den Tagesverlauf</p>
    </div>
  );
}