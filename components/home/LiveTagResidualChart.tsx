"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import { niceAxis } from "@/lib/heuteImNetz";
import type { LiveDayPlausibilityResult } from "@/lib/liveDayPlausibility";
import { LUECKE_DESKTOP, LUECKE_MOBILE_H, LUECKE_MOBILE_PAD, plotXFromSlotIndex } from "@/lib/lueckeChartGeometry";

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

function pathFor(
  indices: number[],
  points: LiveDayPlausibilityResult["points"],
  xAt: (i: number) => number,
  yAt: (gw: number) => number,
): string {
  return indices
    .map((index, position) => {
      const point = points[index];
      if (!point) return "";
      const cmd = position === 0 ? "M" : "L";
      return `${cmd} ${xAt(index).toFixed(1)} ${yAt(point.residualGw).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
}

export function LiveTagResidualChart({ plausibility }: { plausibility: LiveDayPlausibilityResult }) {
  const patternId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const compact = useSyncExternalStore(subscribeCompact, getCompactSnapshot, getCompactServerSnapshot);
  const [shellWidth, setShellWidth] = useState(335);

  const points = plausibility.points;
  const slotCount = Math.max(points.length, 1);

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
    ? { w: shellWidth, h: LUECKE_MOBILE_H, pad: LUECKE_MOBILE_PAD }
    : { w: LUECKE_DESKTOP.w, h: 220, pad: LUECKE_DESKTOP.pad };
  const plotW = frame.w - frame.pad.left - frame.pad.right;
  const plotH = frame.h - frame.pad.top - frame.pad.bottom;

  const residuals = points.map((p) => p.residualGw);
  const axis = niceAxis(Math.min(-2, ...residuals, 0), Math.max(5, ...residuals));
  const yAt = (gw: number) => frame.pad.top + plotH - ((gw - axis.min) / (axis.max - axis.min || 1)) * plotH;
  const xAt = (index: number) => plotXFromSlotIndex(index, slotCount, frame.pad.left, plotW);

  const solidIdx = points.map((p, i) => (p.segment === "solid" ? i : -1)).filter((i) => i >= 0);
  const provisionalIdx = points.map((p, i) => (p.segment === "provisional" ? i : -1)).filter((i) => i >= 0);
  const bridgeIdx = points.map((p, i) => (p.segment !== "filtered" ? i : -1)).filter((i) => i >= 0);

  const standIndex = points.findIndex((p) => Date.parse(p.slot.timestampIso) + 15 * 60 * 1000 >= plausibility.standEndUnixMs);
  const gapX = standIndex >= 0 ? xAt(Math.min(standIndex, points.length - 1)) : frame.pad.left + plotW;

  return (
    <div ref={shellRef} className="v4-luecke-shell">
      <svg
        width={frame.w}
        height={frame.h}
        role="img"
        aria-label="Residuallast des laufenden Tages bis zum Datenstand"
        className="block max-w-full"
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
        {[0, 6, 12, 18, 24].map((hour) => (
          <text
            key={hour}
            x={frame.pad.left + (hour / 24) * plotW}
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
          width={Math.max(0, frame.pad.left + plotW - gapX)}
          height={plotH}
          fill="hsl(var(--secondary) / 0.45)"
        />
        {points.map(
          (point, index) =>
            point.segment === "filtered" ? (
              <rect
                key={point.slot.timestampIso}
                x={xAt(index) - 2}
                y={frame.pad.top}
                width={plotW / slotCount}
                height={plotH}
                fill="hsl(var(--destructive) / 0.12)"
              />
            ) : null,
        )}
        <path
          d={pathFor(bridgeIdx, points, xAt, yAt)}
          fill="none"
          className="stroke-muted-foreground"
          strokeWidth={1.2}
          strokeDasharray="2 4"
        />
        <path
          d={pathFor([...solidIdx, ...provisionalIdx], points, xAt, yAt)}
          fill="none"
          className="stroke-foreground"
          strokeWidth={2.4}
          strokeDasharray={provisionalIdx.length > 0 ? "3 5" : undefined}
        />
        <path
          d={pathFor(solidIdx, points, xAt, yAt)}
          fill="none"
          className="stroke-foreground"
          strokeWidth={2.6}
        />
        <line x1={0} y1={yAt(0)} x2={frame.w} y2={yAt(0)} className="stroke-gridline" strokeWidth={0.8} />
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M0,4 L4,0" className="stroke-gridline" strokeWidth={0.5} />
          </pattern>
        </defs>
      </svg>
    </div>
  );
}