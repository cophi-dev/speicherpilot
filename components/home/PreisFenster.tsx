"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ChartTooltipPanel } from "@/components/charts/ChartTooltipPanel";
import { useSvgChartProbe } from "@/components/charts/useSvgChartProbe";
import styles from "@/components/home/PreisFenster.module.css";
import { formatQuantity } from "@/lib/formatQuantity";
import { LUECKE_DESKTOP, LUECKE_MOBILE_PAD, plotXFromSlotIndex } from "@/lib/lueckeChartGeometry";
import { computeDauerSpanne, preisAxisTicks, preisFigurSatz, type PreisTick } from "@/lib/preisFenster";

const DESKTOP_H = 180;
const MOBILE_H = 120;
const HOURS = [0, 6, 12, 18, 24];

function subscribeCompact(onStoreChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const query = window.matchMedia("(max-width: 639px)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getCompactSnapshot() {
  return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches;
}

function hourKey(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function PreisFenster({
  dateLabel,
  points,
  powerGw,
  energyGwh,
  surplusGwh,
  compactCopy = false,
}: {
  dateLabel: string;
  points: PreisTick[];
  powerGw: number;
  energyGwh: number;
  surplusGwh: number;
  /** Nur Graph + Tooltip — Details in „So gerechnet“. */
  compactCopy?: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const compact = useSyncExternalStore(subscribeCompact, getCompactSnapshot, () => false);
  const [shellWidth, setShellWidth] = useState(335);

  useEffect(() => {
    if (!compact) {
      return undefined;
    }
    const node = shellRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const sync = () => setShellWidth(Math.max(280, Math.round(node.clientWidth)));
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact]);

  if (points.length < 2) {
    return null;
  }

  const dauer = computeDauerSpanne(points, powerGw, energyGwh);
  const satz = preisFigurSatz({ surplusGwh, dauer });
  const axis = preisAxisTicks(
    Math.min(...points.map((point) => point.eurPerMwh)),
    Math.max(...points.map((point) => point.eurPerMwh)),
  );
  const padL = compact ? LUECKE_MOBILE_PAD.left : LUECKE_DESKTOP.pad.left;
  const padR = compact ? LUECKE_MOBILE_PAD.right : LUECKE_DESKTOP.pad.right;
  const padT = compact ? 18 : 26;
  const padB = compact ? 20 : 28;
  const width = compact ? shellWidth : LUECKE_DESKTOP.w;
  const height = compact ? MOBILE_H : DESKTOP_H;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const yOf = (value: number) => {
    const span = axis.max - axis.min || 1;
    return padT + ((axis.max - value) / span) * plotH;
  };
  const xAt = (index: number) => plotXFromSlotIndex(index, points.length, padL, plotW);
  const xHour = (hour: number) => {
    if (hour >= 24) {
      return padL + plotW;
    }
    const index = points.findIndex((point) => point.hm === hourKey(hour));
    return index >= 0 ? xAt(index) : padL + (hour / 24) * plotW;
  };
  const last = points[points.length - 1];
  const path = [
    ...points.map(
      (point, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yOf(point.eurPerMwh).toFixed(1)}`,
    ),
    `L${(padL + plotW).toFixed(1)},${yOf(last.eurPerMwh).toFixed(1)}`,
  ].join(" ");
  const marked = new Set([...(dauer?.low ?? []), ...(dauer?.high ?? [])]);
  const modelLine =
    surplusGwh < 0.05 ? "lädt an diesem Tag nicht · kein Erlös" : "kann an diesem Tag laden · kein Erlös";
  const spanLine = dauer
    ? `${formatQuantity(dauer.dauerSpanne, "de", 2)} €/MWh (Ø ${dauer.n} teuerste − Ø ${dauer.n} günstigste ¼ h)`
    : "nicht gebildet";

  const { activeIndex, onMouseMove, onMouseLeave, onTouch, onKeyDown } = useSvgChartProbe(points.length);
  const tooltipRows = useMemo(() => {
    if (activeIndex == null || !points[activeIndex]) {
      return null;
    }
    const p = points[activeIndex]!;
    return [{ label: "Day-Ahead", value: `${formatQuantity(p.eurPerMwh, "de", 2)} €/MWh` }];
  }, [activeIndex, points]);
  const tooltipTime = activeIndex != null && points[activeIndex] ? points[activeIndex]!.hm : null;

  return (
    <figure className={styles.figure} data-testid="preis-fenster">
      <ChartTooltipPanel timeLabel={tooltipTime} rows={tooltipRows} testId="preis-fenster-tooltip" />
      <div
        ref={shellRef}
        className={`${styles.frame} v4-chart-probe`}
        style={{ ["--preis-pad-l" as string]: `${padL}px` }}
        tabIndex={0}
        role="application"
        aria-label={`Day-Ahead Preis am ${dateLabel}`}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onKeyDown={onKeyDown}
      >
        <p className={`num ${styles.unitLabel}`} aria-hidden="true">
          €/MWh
        </p>
        <svg
          className={compact ? styles.svgCompact : styles.svg}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={satz}
        >
          {axis.ticks.map((tick) => (
            <g key={tick}>
              <line className={styles.grid} x1={padL} x2={padL + plotW} y1={yOf(tick)} y2={yOf(tick)} />
              <text className={`num ${styles.axis}`} x={padL - 8} y={yOf(tick)} textAnchor="end" dominantBaseline="middle">
                {formatQuantity(tick, "de", 0)}
              </text>
            </g>
          ))}
          {(compact ? [0, 12, 24] : HOURS).map((hour) => {
            const x = xHour(hour);
            return (
              <g key={hour}>
                <line className={styles.grid} x1={x} x2={x} y1={padT} y2={padT + plotH} />
                <text
                  className={`num ${styles.axis}`}
                  x={x}
                  y={height - (compact ? 4 : 8)}
                  textAnchor="middle"
                >
                  {hourKey(hour).slice(0, 2)}
                </text>
              </g>
            );
          })}
          {axis.min < 0 && axis.max > 0 ? (
            <line className={styles.zero} x1={padL} x2={padL + plotW} y1={yOf(0)} y2={yOf(0)} />
          ) : null}
          <path className={styles.line} d={path} />
          {points.map((point, index) =>
            marked.has(point) ? (
              <circle key={`${point.i ?? index}-${point.hm}`} className={styles.mark} cx={xAt(index)} cy={yOf(point.eurPerMwh)} r={3} />
            ) : null,
          )}
          {activeIndex != null ? (
            <line
              x1={xAt(activeIndex)}
              x2={xAt(activeIndex)}
              y1={padT}
              y2={padT + plotH}
              className="v4-chart-crosshair"
            />
          ) : null}
        </svg>
      </div>
      {compactCopy ? null : (
        <>
      <dl className={`v4-day-notes ${styles.notes}`}>
        <div>
          <dt>Preis</dt>
          <dd>Day-Ahead DE-LU, €/MWh</dd>
        </div>
        <div>
          <dt>Spanne</dt>
          <dd>{spanLine}</dd>
        </div>
        <div>
          <dt>Modell</dt>
          <dd>{modelLine}</dd>
        </div>
        <div>
          <dt>Quelle</dt>
          <dd>
            Energy-Charts / SMARD, CC BY 4.0 ·{" "}
            <Link href="/methodik#preis-fenster" className="v4-footnote-link">
              Methodik
            </Link>
          </dd>
        </div>
      </dl>
      {dauer ? (
        <details className={styles.more}>
          <summary>Mittel und Fenster</summary>
          <p>
            Mittel günstig / teuer: {formatQuantity(dauer.meanLow, "de", 2)} und {formatQuantity(dauer.meanHigh, "de", 2)}.
            Die markierten Punkte sind diese Viertelstunden ({dauer.n}, Flotte {formatQuantity(powerGw, "de", 2)} GW /{" "}
            {formatQuantity(energyGwh, "de", 2)} GWh, {dateLabel}).
          </p>
        </details>
      ) : null}
        </>
      )}
    </figure>
  );
}
