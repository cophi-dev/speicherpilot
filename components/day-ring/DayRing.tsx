"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { leaderEnd, placeCalloutBoxes, ringClearRadius, type CalloutBox } from "@/lib/dayRingCallouts";
import {
  boxFitsCircle,
  centerCaptionPx,
  centerLimitPx,
  centerWrapPx,
  compactHourLabel,
  compactRingView,
  energyColor,
  hourToDeg,
  kwRadius,
  polarPoint,
  RING_CALLOUT_VIEW,
  RING_R0,
  RING_VIEW,
  ringRadius,
  sectorPath,
  segmentAngles,
  segmentIndexForHour,
  socRingGeometry,
  utilisationColor,
} from "@/lib/dayRingScale";
import { quarterLabel, type CalloutAnchor } from "@/lib/dayRingStory";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

const CALLOUT_WIDTH = "min(180px, 28%)";

export type RingCallout = CalloutAnchor & {
  n: number;
  text: string;
};

type Highlight = "night" | "midday" | "evening" | null;
export type RingUnit = "GW" | "kW";
export type RingScale = "energy" | "utilisation";
export type RingMode = "live" | "netz" | "projekt";

const NARROW_QUERY = "(max-width: 767px)";

function narrowFrameNow(): boolean {
  return typeof window.matchMedia === "function" ? window.matchMedia(NARROW_QUERY).matches : false;
}

function useNarrowFrame(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window.matchMedia !== "function") {
        return () => undefined;
      }
      const query = window.matchMedia(NARROW_QUERY);
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    narrowFrameNow,
    () => false
  );
}

export function DayRing({
  points,
  label,
  description,
  callouts = [],
  highlight = null,
  showFlow = true,
  showSoc = true,
  showShift = true,
  showHourTicks = true,
  chargedGwh = 0,
  center = null,
  unit = "GW",
  scale = "energy",
  limit = null,
  mode = "live",
  empty = false,
  spokeHour = null,
}: {
  points: LiveDispatchPoint[];
  label: string;
  description: string;
  callouts?: RingCallout[];
  highlight?: Highlight;
  showFlow?: boolean;
  showSoc?: boolean;
  showShift?: boolean;
  showHourTicks?: boolean;
  chargedGwh?: number;
  center?: ReactNode;
  unit?: RingUnit;
  scale?: RingScale;
  /** Connection limit in the ring unit. Draws the limit circle. */
  limit?: number | null;
  mode?: RingMode;
  empty?: boolean;
  spokeHour?: number | null;
}) {
  const titleId = useId();
  const descId = useId();
  const hatchId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrowFrame();
  const magnitude = (point: LiveDispatchPoint) => (unit === "kW" ? point.ohneMw : point.ohneMw / 1000);
  const maxValue = points.reduce((max, point) => Math.max(max, magnitude(point), unit === "kW" ? point.mitMw : point.mitMw / 1000), 0);
  const radiusOf = (value: number) => (unit === "kW" ? kwRadius(value) : ringRadius(value));
  const maxGw = unit === "kW" ? 0 : maxValue;
  const outer = unit === "kW"
    ? Math.max(radiusOf(Math.max(maxValue, limit ?? 0)), kwRadius(0))
    : Math.max(ringRadius(maxGw), RING_R0);
  const wideView = callouts.length > 0 ? RING_CALLOUT_VIEW : RING_VIEW;
  const view = useMemo(() => (narrow ? compactRingView(outer) : wideView), [narrow, outer, wideView]);
  const hourLabel = narrow ? compactHourLabel(outer, view.w / 2) : null;
  const innerEdge = socRingGeometry(unit, mode === "projekt").innerEdge;
  const clearRadius = unit === "kW" ? radiusOf(Math.max(maxValue, limit ?? 0)) + 78 : ringClearRadius(maxGw);
  const layoutKey = callouts.map((callout) => `${callout.id}:${callout.point.hour}:${callout.text}`).join("|");
  const fallback = placeCalloutBoxes(
    callouts.map((callout) => ({
      angleDeg: hourToDeg(callout.point.hour) + 1.8,
      w: view.w * 0.28,
      h: 280,
    })),
    clearRadius,
    view
  );
  const [measured, setMeasured] = useState<{ key: string; boxes: CalloutBox[] } | null>(null);
  const boxes = measured?.key === layoutKey ? measured.boxes : fallback;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || callouts.length === 0) {
      return;
    }
    const measure = () => {
      const svg = frame.querySelector(".day-ring-svg");
      if (!svg) {
        return;
      }
      const width = svg.getBoundingClientRect().width;
      if (width <= 0) {
        return;
      }
      const scale = width / view.w;
      const nodes = Array.from(frame.querySelectorAll<HTMLElement>(".day-callout"));
      if (nodes.length !== callouts.length || nodes.some((node) => node.offsetWidth === 0)) {
        return;
      }
      const next = placeCalloutBoxes(
        nodes.map((node, index) => ({
          angleDeg: hourToDeg(callouts[index].point.hour) + 1.8,
          w: node.offsetWidth / scale,
          h: node.offsetHeight / scale,
        })),
        clearRadius,
        view
      );
      setMeasured((prev) => (prev?.key === layoutKey && sameBoxes(prev.boxes, next) ? prev : { key: layoutKey, boxes: next }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [callouts, clearRadius, layoutKey, view]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const fit = () => {
      const svg = frame.querySelector(".day-ring-svg");
      const centerEl = frame.querySelector<HTMLElement>(".day-center");
      if (!svg || !centerEl) {
        return;
      }
      const figure = centerEl.querySelector<HTMLElement>(".day-center-figure, .num");
      const caption = centerEl.querySelector<HTMLElement>(".day-center-caption");
      const sized = figure ?? caption;
      if (!sized) {
        return;
      }
      const svgWidth = svg.getBoundingClientRect().width;
      const limit = centerLimitPx(innerEdge, svgWidth, view.w, 12);
      const apply = (size: number) => {
        sized.style.fontSize = `${size}px`;
        if (caption && figure && caption !== figure) {
          caption.style.fontSize = `${centerCaptionPx(size)}px`;
          caption.style.maxWidth = `${figure.getBoundingClientRect().width}px`;
        } else if (caption) {
          caption.style.maxWidth = `${centerWrapPx(limit)}px`;
        }
      };
      const fits = (size: number) => {
        apply(size);
        const box = centerEl.getBoundingClientRect();
        return boxFitsCircle(box.width, box.height, limit);
      };
      const max = 28;
      if (fits(max)) {
        return;
      }
      let low = 1;
      let high = max;
      if (!fits(low)) {
        apply(low);
        return;
      }
      while (high - low > 0.25) {
        const mid = (low + high) / 2;
        if (fits(mid)) {
          low = mid;
        } else {
          high = mid;
        }
      }
      apply(low);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [center, innerEdge, view.w]);

  return (
    <div className="day-ring-frame" ref={frameRef}>
      <svg
        className="day-ring-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <title id={titleId}>{label}</title>
        <desc id={descId}>{description}</desc>
        <defs>
          <pattern id={hatchId} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#FF8A70" strokeWidth="2" />
          </pattern>
        </defs>
        <circle className="day-zero" cx="0" cy="0" r={unit === "kW" ? kwRadius(0) : RING_R0} fill="none" />
        {empty ? (
          <circle className="day-empty-ring" cx="0" cy="0" r={unit === "kW" ? kwRadius(40) : 280} fill="none" stroke="#C5CED6" strokeWidth="2" />
        ) : (
          points.map((point) => (
            <FlowBand
              key={point.hour}
              point={point}
              hatchId={hatchId}
              dim={dimmed(point.hour, highlight)}
              showFlow={showFlow}
              unit={unit}
              scale={scale}
              limit={limit}
              mode={mode}
            />
          ))
        )}
        {!empty && limit != null ? <LimitCircle kw={limit} mode={mode} radiusOf={radiusOf} /> : null}
        {!empty && highlight ? <InkArc points={points} highlight={highlight} radiusOf={radiusOf} unit={unit} /> : null}
        {!empty && showSoc ? <SocRing points={points} bold={mode === "projekt"} unit={unit} /> : null}
        {!empty && showShift && chargedGwh > 0.05 ? <ShiftArrow points={points} /> : null}
        {!empty && spokeHour != null ? <Spoke hour={spokeHour} radius={radiusOf(Math.max(maxValue, limit ?? 0)) + 18} /> : null}
        {empty && !showHourTicks ? null : (
          <HourTicks
            showHours={showHourTicks}
            labelRadius={
              hourLabel
                ? hourLabel.labelRadius
                : unit === "kW"
                  ? radiusOf(Math.max(maxValue, limit ?? 0, 40)) + 36
                  : ringRadius(Math.max(52, maxGw + 6))
            }
            labelGap={hourLabel ? hourLabel.labelGap : 28}
            fontSize={hourLabel ? hourLabel.fontSize : 28}
          />
        )}
        {callouts.map((callout) => (
          <CalloutMarker key={callout.id} callout={callout} />
        ))}
        {callouts.map((callout, index) => (
          <CalloutLeader key={callout.id} callout={callout} box={boxes[index]} />
        ))}
      </svg>
      {callouts.map((callout, index) => (
        <Callout key={callout.id} callout={callout} box={boxes[index]} view={view} />
      ))}
      {center ? <div className="day-center">{center}</div> : null}
    </div>
  );
}

export function FlowBand({
  point,
  hatchId,
  dim,
  showFlow,
  unit = "GW",
  scale = "energy",
  limit = null,
  mode = "live",
}: {
  point: LiveDispatchPoint;
  hatchId: string;
  dim: boolean;
  showFlow: boolean;
  unit?: RingUnit;
  scale?: RingScale;
  limit?: number | null;
  mode?: RingMode;
}) {
  const angles = segmentAngles(segmentIndexForHour(point.hour));
  const ohne = unit === "kW" ? point.ohneMw : point.ohneMw / 1000;
  const mit = unit === "kW" ? point.mitMw : point.mitMw / 1000;
  const radiusOf = (value: number) => (unit === "kW" ? kwRadius(value) : ringRadius(value));
  const zero = unit === "kW" ? kwRadius(0) : RING_R0;
  const colorOf = (value: number) =>
    scale === "utilisation" && limit != null && limit > 0 ? utilisationColor(value / limit) : energyColor(value);
  const base = sectorPath(0, 0, zero, radiusOf(ohne), angles.start, angles.end);
  const opacity = dim ? 0.3 : 1;
  const charging = mit > ohne + (unit === "kW" ? 0.2 : 0.02);
  const discharging = ohne > mit + (unit === "kW" ? 0.2 : 0.02);
  const flow = sectorPath(0, 0, radiusOf(ohne), radiusOf(mit), angles.start, angles.end);
  const overLimit = unit === "kW" && limit != null && ohne > limit + 0.2;
  const cap = overLimit ? sectorPath(0, 0, radiusOf(limit), radiusOf(ohne), angles.start, angles.end) : "";
  const covered = mode === "projekt" && discharging;
  return (
    <g opacity={opacity} data-hour={point.hour} data-gw={ohne.toFixed(3)}>
      <path d={base} fill={colorOf(ohne)} />
      {showFlow && charging ? <path d={flow} fill="#7DFCE6" /> : null}
      {showFlow && discharging && mode !== "projekt" ? (
        <>
          <path d={flow} fill={`url(#${hatchId})`} />
          <path d={arcEdge(radiusOf(ohne), angles.start, angles.end)} fill="none" stroke="#FF8A70" strokeWidth="2" strokeDasharray="5 4" />
        </>
      ) : null}
      {showFlow && covered ? <path d={flow} fill="#7DFCE6" opacity="0.85" /> : null}
      {mode === "netz" && overLimit ? <path d={cap} fill={`url(#${hatchId})`} /> : null}
    </g>
  );
}

function LimitCircle({
  kw,
  mode,
  radiusOf,
}: {
  kw: number;
  mode: RingMode;
  radiusOf: (value: number) => number;
}) {
  const dotted = mode === "projekt";
  return (
    <circle
      className={dotted ? "day-cap-target" : "day-limit"}
      cx="0"
      cy="0"
      r={radiusOf(kw)}
      fill="none"
      stroke={dotted ? "#C5CED6" : "#FF5A4E"}
      strokeWidth={dotted ? 2 : 3}
      strokeDasharray={dotted ? "2 7" : "10 7"}
    />
  );
}

function InkArc({
  points,
  highlight,
  radiusOf,
  unit,
}: {
  points: LiveDispatchPoint[];
  highlight: Exclude<Highlight, null>;
  radiusOf: (value: number) => number;
  unit: RingUnit;
}) {
  const active = points.filter((point) => !dimmed(point.hour, highlight));
  if (active.length === 0) {
    return null;
  }
  const value = (point: LiveDispatchPoint) => (unit === "kW" ? point.ohneMw : point.ohneMw / 1000);
  const outer = Math.max(...active.map((point) => radiusOf(value(point))));
  const start = segmentAngles(segmentIndexForHour(active[0].hour)).start;
  const last = active[active.length - 1];
  const end = segmentAngles(segmentIndexForHour(last.hour)).end;
  return (
    <path
      className="day-ink-arc"
      d={arcEdge(outer + 8, start, end)}
      fill="none"
      strokeWidth="6"
      vectorEffect="non-scaling-stroke"
    />
  );
}

function Spoke({ hour, radius }: { hour: number; radius: number }) {
  const at = polarPoint(0, 0, radius, hourToDeg(hour) + 1.8);
  return <line className="day-spoke" x1="0" y1="0" x2={at.x} y2={at.y} stroke="#E9EEF2" strokeWidth="2" />;
}

export function SocRing({ points, bold = false, unit = "GW" }: { points: LiveDispatchPoint[]; bold?: boolean; unit?: RingUnit }) {
  const { radius, width } = socRingGeometry(unit, bold);
  return (
    <g className="day-soc" fill="none" strokeWidth={width} strokeLinecap="butt">
      {points.map((point) => {
        const angles = segmentAngles(segmentIndexForHour(point.hour));
        return (
          <path
            key={point.hour}
            d={arcEdge(radius, angles.start, angles.end)}
            stroke={unit === "kW" ? "#1E9CB0" : energyColor(point.ohneMw / 1000)}
            opacity={0.25 + 0.75 * point.soc}
          />
        );
      })}
    </g>
  );
}

export function ShiftArrow({ points }: { points: LiveDispatchPoint[] }) {
  const charge = points.reduce((best, point) => (point.chargeMw > best.chargeMw ? point : best), points[0]);
  const dischargePool = points.filter((point) => point.hour >= 17);
  const discharge = (dischargePool.length > 0 ? dischargePool : points).reduce(
    (best, point) => (point.dischargeMw > best.dischargeMw ? point : best),
    dischargePool[0] ?? points[0]
  );
  if (!charge || charge.chargeMw <= 0) {
    return null;
  }
  const radius = RING_R0 - 36;
  const start = hourToDeg(charge.hour) + 1.5;
  const end = hourToDeg(discharge.hour) + 1.5;
  const from = polarPoint(0, 0, radius, start);
  const to = polarPoint(0, 0, radius, end);
  const large = end - start > 180 ? 1 : 0;
  return (
    <g className="day-shift" fill="none" stroke="#E9EEF2" strokeWidth="2" aria-hidden="true">
      <path
        d={`M ${from.x.toFixed(1)} ${from.y.toFixed(1)} A ${radius} ${radius} 0 ${large} 1 ${to.x.toFixed(1)} ${to.y.toFixed(1)}`}
        strokeDasharray="2 7"
      />
      <circle cx={to.x} cy={to.y} r="5" fill="#E9EEF2" stroke="none" />
    </g>
  );
}

function CalloutMarker({ callout }: { callout: RingCallout }) {
  const deg = hourToDeg(callout.point.hour) + 1.8;
  const gw = callout.point.ohneMw / 1000;
  const at = polarPoint(0, 0, ringRadius(gw), deg);
  return (
    <g className="day-callout-mark" aria-hidden="true">
      <circle cx={at.x} cy={at.y} r="16" fill="#0A0F14" stroke="#E9EEF2" strokeWidth="2" />
      <text x={at.x} y={at.y + 5} textAnchor="middle" fill="#E9EEF2" fontSize="16" fontFamily="var(--font-plex-mono), monospace">
        {callout.n}
      </text>
    </g>
  );
}

function CalloutLeader({ callout, box }: { callout: RingCallout; box: CalloutBox | undefined }) {
  if (!box) {
    return null;
  }
  const deg = hourToDeg(callout.point.hour) + 1.8;
  const from = polarPoint(0, 0, ringRadius(callout.point.ohneMw / 1000) + 18, deg);
  const to = leaderEnd(box, from);
  return (
    <line
      className="day-leader"
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="#E9EEF2"
      strokeWidth="1.5"
    />
  );
}

export function Callout({
  callout,
  box,
  view,
}: {
  callout: RingCallout;
  box: CalloutBox | undefined;
  view: { x: number; y: number; w: number; h: number };
}) {
  if (!box) {
    return null;
  }
  const left = ((box.x - view.x) / view.w) * 100;
  const top = ((box.y - view.y) / view.h) * 100;
  return (
    <p className="day-callout" data-callout={callout.id} style={{ left: `${left}%`, top: `${top}%`, width: CALLOUT_WIDTH }}>
      <span className="num">{callout.n}</span>
      {callout.text}
    </p>
  );
}

function sameBoxes(prev: CalloutBox[], next: CalloutBox[]): boolean {
  if (prev.length !== next.length) {
    return false;
  }
  return prev.every((box, index) => {
    const other = next[index];
    return Math.abs(box.x - other.x) < 0.5 && Math.abs(box.y - other.y) < 0.5 && Math.abs(box.w - other.w) < 0.5 && Math.abs(box.h - other.h) < 0.5;
  });
}

function HourTicks({
  showHours,
  labelRadius,
  labelGap,
  fontSize,
}: {
  showHours: boolean;
  labelRadius: number;
  labelGap: number;
  fontSize: number;
}) {
  const hours = showHours ? [0, 6, 12, 18] : [0];
  return (
    <g className="day-ticks" fill="#E9EEF2" fontFamily="var(--font-plex-mono), monospace" fontSize={fontSize} aria-hidden="true">
      {hours.map((hour) => {
        const deg = hour === 0 ? 0 : hourToDeg(hour) + 1.8;
        const inner = polarPoint(0, 0, Math.max(1, labelRadius - 18), deg);
        const outer = polarPoint(0, 0, labelRadius, deg);
        const label = polarPoint(0, 0, labelRadius + labelGap, deg);
        const text = hour === 0 ? "00" : String(hour).padStart(2, "0");
        return (
          <g key={hour}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#E9EEF2" strokeWidth="2" />
            <text x={label.x} y={label.y + 8} textAnchor="middle">
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function DayValuesTable({
  points,
  caption,
  timeLabel,
  ohneLabel,
  mitLabel,
  chargeLabel,
  dischargeLabel,
  socLabel,
}: {
  points: LiveDispatchPoint[];
  caption: string;
  timeLabel: string;
  ohneLabel: string;
  mitLabel: string;
  chargeLabel: string;
  dischargeLabel: string;
  socLabel: string;
}) {
  return (
    <div className="day-sr">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>{timeLabel}</th>
          <th>{ohneLabel}</th>
          <th>{mitLabel}</th>
          <th>{chargeLabel}</th>
          <th>{dischargeLabel}</th>
          <th>{socLabel}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.hour}>
            <td>{quarterLabel(point.hour)}</td>
            <td>{(point.ohneMw / 1000).toFixed(3)}</td>
            <td>{(point.mitMw / 1000).toFixed(3)}</td>
            <td>{point.chargeMw.toFixed(1)}</td>
            <td>{point.dischargeMw.toFixed(1)}</td>
            <td>{(point.soc * 100).toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function dimmed(hour: number, highlight: Highlight): boolean {
  if (!highlight) {
    return false;
  }
  if (highlight === "night") {
    return hour >= 6;
  }
  if (highlight === "midday") {
    return hour < 11 || hour >= 15;
  }
  return hour < 17 || hour >= 22;
}

function arcEdge(radius: number, startDeg: number, endDeg: number): string {
  const start = polarPoint(0, 0, radius, startDeg);
  const end = polarPoint(0, 0, radius, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}
