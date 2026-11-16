"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import { niceAxis } from "@/lib/heuteImNetz";
import type { LiveDayPlausibilityResult, LiveResidualPoint } from "@/lib/liveDayPlausibility";
import {
  chartPointsWithinStand,
  plotXFromBerlinHour,
  quarterWidthPx,
  standHourFraction,
} from "@/lib/liveTagChartGeometry";
import { LUECKE_DESKTOP, LUECKE_MOBILE_H, LUECKE_MOBILE_PAD } from "@/lib/lueckeChartGeometry";

const DAY_HOURS = 24;
const X_TICKS = [0, 6, 12, 18, 24];

function subscribeCompact(onStoreChange: () => void) {
  const mq = window.matchMedia("(max-width: 639px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getCompactSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

function getCompactServerSnapshot() {
  return false;
}

type Pt = { x: number; y: number };

function pathFromPoints(points: Pt[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function bridgeSegments(visible: LiveResidualPoint[], yAt: (gw: number) => number, xAt: (h: number) => number): string[] {
  const paths: string[] = [];
  let previous: LiveResidualPoint | null = null;
  for (const point of visible) {
    if (point.segment === "filtered") {
      continue;
    }
    if (previous) {
      const hasFilteredGap = visible.some(
        (candidate) =>
          candidate.segment === "filtered" && candidate.hour > previous!.hour && candidate.hour < point.hour,
      );
      if (hasFilteredGap) {
        paths.push(
          pathFromPoints([
            { x: xAt(previous.hour), y: yAt(previous.residualGw) },
            { x: xAt(point.hour), y: yAt(point.residualGw) },
          ]),
        );
      }
    }
    previous = point;
  }
  return paths;
}

export function LiveTagResidualChart({ plausibility }: { plausibility: LiveDayPlausibilityResult }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const compact = useSyncExternalStore(subscribeCompact, getCompactSnapshot, getCompactServerSnapshot);
  const [shellWidth, setShellWidth] = useState(390);

  const visible = chartPointsWithinStand(plausibility);
  const standHour = standHourFraction(plausibility.standEndUnixMs);

  useEffect(() => {
    const node = shellRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const sync = () => setShellWidth(Math.max(280, Math.round(node.clientWidth)));
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const frame = compact
    ? { w: Math.max(320, shellWidth), h: LUECKE_MOBILE_H, pad: LUECKE_MOBILE_PAD }
    : { w: LUECKE_DESKTOP.w, h: 240, pad: LUECKE_DESKTOP.pad };
  const plotW = frame.w - frame.pad.left - frame.pad.right;
  const plotH = frame.h - frame.pad.top - frame.pad.bottom;

  const residuals = visible.map((p) => p.residualGw);
  const axis = niceAxis(Math.min(-2, ...residuals, 0), Math.max(5, ...residuals));
  const yAt = (gw: number) => frame.pad.top + plotH - ((gw - axis.min) / (axis.max - axis.min || 1)) * plotH;
  const xAt = (hour: number) => plotXFromBerlinHour(hour, frame.pad.left, plotW);

  const solidPts = visible
    .filter((point) => point.segment === "solid")
    .map((point) => ({ x: xAt(point.hour), y: yAt(point.residualGw) }));
  const provisionalPts = visible
    .filter((point) => point.segment === "provisional")
    .map((point) => ({ x: xAt(point.hour), y: yAt(point.residualGw) }));
  const bridgePaths = bridgeSegments(visible, yAt, (hour) => xAt(hour));

  const gapX = xAt(standHour);
  const gapMid = gapX + (xAt(DAY_HOURS) - gapX) / 2;

  const quarterW = quarterWidthPx(plotW);

  return (
    <div ref={shellRef} className="v4-luecke-shell w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${frame.w} ${frame.h}`}
        width="100%"
        height={frame.h}
        role="img"
        aria-label="Residuallast des laufenden Tages bis zum Datenstand"
        preserveAspectRatio="xMidYMid meet"
      >
        {axis.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={frame.pad.left}
              x2={frame.w - frame.pad.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className={tick === 0 ? "stroke-border-strong" : "stroke-gridline"}
              strokeWidth={tick === 0 ? 1.25 : 1}
            />
            <text
              x={frame.pad.left - 6}
              y={yAt(tick) + 4}
              textAnchor="end"
              className="fill-muted-foreground num"
              fontSize="11"
            >
              {formatQuantity(tick, "de", tick === Math.floor(tick) ? 0 : 1)}
            </text>
          </g>
        ))}
        <text x={frame.pad.left - 6} y={frame.pad.top - 8} textAnchor="end" className="fill-muted-foreground" fontSize="10">
          GW
        </text>
        {X_TICKS.map((hour) => (
          <text
            key={hour}
            x={xAt(hour)}
            y={frame.h - 6}
            textAnchor="middle"
            className="fill-muted-foreground num"
            fontSize="11"
          >
            {String(hour).padStart(2, "0")}
          </text>
        ))}
        <rect
          x={gapX}
          y={frame.pad.top}
          width={Math.max(0, xAt(DAY_HOURS) - gapX)}
          height={plotH}
          fill="hsl(var(--secondary) / 0.55)"
        />
        <text
          x={gapMid}
          y={frame.pad.top + plotH * 0.45}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={compact ? 11 : 12}
        >
          noch keine Ist-Daten
        </text>
        {visible.map((point) =>
          point.segment === "filtered" ? (
            <rect
              key={point.slot.timestampIso}
              x={xAt(point.hour)}
              y={frame.pad.top}
              width={quarterW}
              height={plotH}
              fill="hsl(var(--destructive) / 0.14)"
            />
          ) : null,
        )}
        {bridgePaths.map((path, index) => (
          <path
            key={`bridge-${index}`}
            d={path}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth={1.2}
            strokeDasharray="2 5"
          />
        ))}
        {provisionalPts.length > 0 ? (
          <path
            d={pathFromPoints(provisionalPts)}
            fill="none"
            className="stroke-foreground"
            strokeWidth={1.3}
            strokeDasharray="4 4"
          />
        ) : null}
        {solidPts.length > 0 ? (
          <path d={pathFromPoints(solidPts)} fill="none" className="stroke-foreground" strokeWidth={2.5} />
        ) : null}
        <line
          x1={gapX}
          x2={gapX}
          y1={frame.pad.top}
          y2={frame.pad.top + plotH}
          className="stroke-foreground"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <line x1={frame.pad.left} x2={frame.w - frame.pad.right} y1={yAt(0)} y2={yAt(0)} className="stroke-gridline" strokeWidth={0.8} />
      </svg>
    </div>
  );
}