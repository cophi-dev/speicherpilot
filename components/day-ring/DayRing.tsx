"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { leaderEnd, MAX_LEADER_PX, placeLabelBeside, type CalloutBox } from "@/lib/dayRingCallouts";
import {
  centerLimitPx,
  chooseCenterFont,
  pxToUser,
  compactHourLabel,
  compactRingView,
  hourToDeg,
  kwRadius,
  polarPoint,
  RING_R0,
  ringRadius,
  segmentAngles,
  segmentIndexForHour,
  socRingGeometry,
} from "@/lib/dayRingScale";
import { measureRingKeys, RingKeyLabels, RingKeyLeaders, SOC_PULL_PX, type KeyLayout } from "@/components/day-ring/RingKeys";
import { ModelDayMark } from "@/components/day-ring/ModelDayMark";
import { SmoothRing } from "@/components/day-ring/SmoothRing";
import { useMorphedSeries } from "@/components/day-ring/useMorphedSeries";
import { monotonePolarSamples, polarRibbonPath, quarterCenterForHour, smoothPolarSamples } from "@/lib/dayRingSmooth";
import { referenceRingUser } from "@/lib/referenceRingLayout";
import { hourlyResidualGw, quarterLabel, type CalloutAnchor } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
import { useLanguage } from "@/components/language-context";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

const CALLOUT_WIDTH = "min(180px, 28%)";

export type RingCallout = CalloutAnchor & {
  n: number;
  text: string;
};

export type Highlight = "night" | "midday" | "evening" | null;
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
  centerMark = null,
  solidStrokes = false,
  showLimit = true,
  smoothSeries = true,
  clearCenter = false,
  referenceRing = false,
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
  /** Stamp drawn inside the ring, above the centre figure. */
  centerMark?: { pill: string; figure: string; unit: string; note: readonly string[] } | null;
  /** Zero circle and guides stay solid. */
  solidStrokes?: boolean;
  /** Connection-limit circle. Colour can still use `limit` when this is false. */
  showLimit?: boolean;
  /** Keep each quarter's radius. The three-point average would shrink an isolated nameplate hour. */
  smoothSeries?: boolean;
  /** Keep the painted band outside the state-of-charge inner edge. */
  clearCenter?: boolean;
  /** Bollingstedt model day: px geometry, monotone state of charge, solid sign colours. */
  referenceRing?: boolean;
}) {
  const titleId = useId();
  const descId = useId();
  const hatchId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(true);
  const narrow = useNarrowFrame();
  const magnitude = (point: LiveDispatchPoint) => (unit === "kW" ? point.ohneMw : point.ohneMw / 1000);
  const maxValue = points.reduce((max, point) => Math.max(max, magnitude(point), unit === "kW" ? point.mitMw : point.mitMw / 1000), 0);
  const radiusOf = (value: number) => (unit === "kW" ? kwRadius(value) : ringRadius(value));
  const maxGw = unit === "kW" ? 0 : maxValue;
  const outer = unit === "kW"
    ? Math.max(radiusOf(Math.max(maxValue, limit ?? 0)), kwRadius(0))
    : Math.max(ringRadius(maxGw), RING_R0);
  const [framePx, setFramePx] = useState(720);
  const guideUser = referenceRing ? 240 : outer;
  const view = useMemo(() => compactRingView(guideUser, framePx), [guideUser, framePx]);
  const referenceLayout = referenceRing ? referenceRingUser(framePx, view.w) : null;
  const hourLabel = compactHourLabel(guideUser, view.w / 2, framePx);
  const innerEdge = socRingGeometry(unit, mode === "projekt").innerEdge;
  const layoutKey = callouts.map((callout) => `${callout.id}:${callout.point.hour}:${callout.text}`).join("|");
  const [measured, setMeasured] = useState<{ key: string; boxes: Array<CalloutBox | null> } | null>(null);
  const boxes = measured?.key === layoutKey ? measured.boxes : callouts.map(() => null);
  const beside = narrow ? callouts.map(() => null) : boxes;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const stop = () => setIntro(false);
    frame.addEventListener("animationend", stop);
    const timer = window.setTimeout(stop, 1300);
    return () => {
      frame.removeEventListener("animationend", stop);
      window.clearTimeout(timer);
    };
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const read = () => {
      const svg = frame.querySelector(".day-ring-svg");
      const width = svg?.getBoundingClientRect().width ?? 0;
      if (width > 0) {
        setFramePx((prev) => (Math.abs(prev - width) < 0.5 ? prev : width));
      }
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || callouts.length === 0 || narrow) {
      return;
    }
    let raf = 0;
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
      const maxLeader = (MAX_LEADER_PX * view.w) / width;
      const nodes = Array.from(frame.querySelectorAll<HTMLElement>(".day-callout"));
      if (nodes.length !== callouts.length || nodes.some((node) => node.offsetWidth === 0)) {
        return;
      }
      const occupied = hourLabelBoxes(hourLabel.labelRadius, hourLabel.fontSize);
      const next = nodes.map((node, index) => {
        const marker = calloutMarker(callouts[index], unit).from;
        const box = placeLabelBeside(
          {
            angleDeg: hourToDeg(callouts[index].point.hour) + 1.8,
            w: node.offsetWidth / scale,
            h: node.offsetHeight / scale,
          },
          marker,
          maxLeader,
          outer,
          view,
          occupied
        );
        if (box) {
          occupied.push(box);
        }
        return box;
      });
      setMeasured((prev) => (prev?.key === layoutKey && sameBoxes(prev.boxes, next) ? prev : { key: layoutKey, boxes: next }));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [callouts, hourLabel.fontSize, hourLabel.labelRadius, layoutKey, narrow, outer, unit, view]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let raf = 0;
    const fit = () => {
      if (cancelled) {
        return;
      }
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
      const freeze = (el: HTMLElement) => {
        // Reduced motion forces a 0.01ms duration on every element. The initial
        // transition-property is `all`, so font-size keeps the previous frame's
        // box and the search collapses the centre value. Zero it before measuring.
        el.style.setProperty("transition-property", "none", "important");
        el.style.setProperty("transition-duration", "0s", "important");
      };
      if (caption) {
        caption.style.fontSize = "12px";
        caption.style.maxWidth = "none";
        caption.style.whiteSpace = "nowrap";
      }
      if (!figure) {
        return;
      }
      const apply = (size: number) => {
        freeze(figure);
        figure.querySelectorAll<HTMLElement>("*").forEach(freeze);
        figure.style.fontSize = `${size}px`;
      };
      const chosen = chooseCenterFont(limit, (size) => {
        apply(size);
        const box = figure.getBoundingClientRect();
        return { width: box.width, height: box.height };
      });
      if (chosen == null) {
        figure.style.fontSize = "";
        attempts += 1;
        if (attempts < 10) {
          raf = requestAnimationFrame(fit);
        }
        return;
      }
      apply(chosen);
    };
    fit();
    const observer = new ResizeObserver(() => {
      attempts = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    observer.observe(frame);
    const centerEl = frame.querySelector(".day-center");
    if (centerEl) {
      observer.observe(centerEl);
    }
    void document.fonts?.ready.then(() => {
      if (!cancelled) {
        fit();
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [center, innerEdge, view.w]);

  const [keyLayout, setKeyLayout] = useState<KeyLayout>({ fallback: false, pullPx: SOC_PULL_PX, measured: false, socLine: null, shiftLine: null });
  const socVisible = !empty && showSoc;
  const shiftVisible = !empty && showShift && chargedGwh > 0.05;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    let raf = 0;
    const read = () => {
      const next = measureRingKeys(frame, points, socVisible, shiftVisible, unit, mode === "projekt", view.w, framePx, keyLayout.pullPx);
      if (!next) {
        return;
      }
      setKeyLayout((prev) => (sameKeyLayout(prev, next) ? prev : next));
    };
    read();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(read);
    });
    observer.observe(frame);
    const centerEl = frame.querySelector(".day-center");
    if (centerEl) {
      observer.observe(centerEl);
    }
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [chargedGwh, framePx, keyLayout.pullPx, mode, points, shiftVisible, socVisible, unit, view.w]);

  const listed = callouts.filter((_, index) => !beside[index]);
  const compact = framePx < 320;
  const blockClass = ["day-ring-block", compact ? "is-compact" : "", keyLayout.fallback ? "is-legend" : ""].filter(Boolean).join(" ");

  return (
    <div className={blockClass} data-unit={unit}>
    <div className={[intro ? "day-ring-frame is-intro" : "day-ring-frame", solidStrokes ? "day-ring-solid" : ""].filter(Boolean).join(" ")} ref={frameRef}>
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
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--coral-stroke)" strokeWidth="2" />
          </pattern>
        </defs>
        {empty ? (
          <>
            <circle className="day-empty-ring" cx="0" cy="0" r={unit === "kW" ? kwRadius(40) : 280} fill="none" stroke="#C5CED6" strokeWidth="2" />
            <circle className="day-zero" cx="0" cy="0" r={unit === "kW" ? kwRadius(0) : RING_R0} fill="none" />
          </>
        ) : (
          <SmoothRing
            points={points}
            unit={unit}
            scale={scale}
            limit={limit}
            mode={mode}
            showFlow={showFlow}
            highlight={highlight}
            hatchId={hatchId}
            view={view}
            framePx={framePx}
            smoothSeries={smoothSeries}
            holeRadius={referenceLayout ? referenceLayout.socOuter100 : clearCenter ? innerEdge : 0}
            radiusOf={referenceLayout ? (value) => referenceRadius(value, limit, referenceLayout) : undefined}
            zeroRadius={referenceLayout?.zero}
            monotone={referenceLayout != null}
            solidSigns={referenceLayout != null}
          />
        )}
        {!empty ? <circle className="day-guide" cx="0" cy="0" r={guideUser} /> : null}
        {!empty && showLimit && limit != null ? <LimitCircle kw={limit} mode={mode} radiusOf={radiusOf} /> : null}
        {!empty && highlight ? <InkArc points={points} highlight={highlight} radiusOf={radiusOf} unit={unit} /> : null}
        {!empty && showSoc ? (
          <SocRing
            points={points}
            bold={mode === "projekt"}
            unit={unit}
            framePx={framePx}
            viewW={view.w}
            layout={
              referenceLayout
                ? {
                    innerUser: referenceLayout.innerEdge,
                    radiusOf: (soc) => referenceLayout.innerEdge + referenceLayout.thickness(soc),
                  }
                : undefined
            }
          />
        ) : null}
        {!empty && showShift && chargedGwh > 0.05 ? <ShiftArrow points={points} /> : null}
        {!empty && spokeHour != null ? <Spoke hour={spokeHour} radius={radiusOf(Math.max(maxValue, limit ?? 0)) + 18} /> : null}
        {empty && !showHourTicks ? null : (
          <HourTicks
            showHours={showHourTicks}
            guideRadius={guideUser}
            labelRadius={hourLabel.labelRadius}
            fontSize={hourLabel.fontSize}
          />
        )}
        {callouts.map((callout, index) => (
          <CalloutLeader key={callout.id} callout={callout} unit={unit} box={beside[index]} />
        ))}
        {callouts.map((callout) => (
          <CalloutMarker key={callout.id} callout={callout} unit={unit} framePx={framePx} viewW={view.w} />
        ))}
        <RingKeyLeaders
          points={points}
          showSoc={socVisible}
          showShift={shiftVisible}
          unit={unit}
          bold={mode === "projekt"}
          view={view}
          framePx={framePx}
          pullPx={keyLayout.pullPx}
          measured={keyLayout.measured}
          socLine={keyLayout.socLine}
          shiftLine={keyLayout.shiftLine}
        />
        {centerMark && !referenceRing ? (
          <ModelDayMark
            pill={centerMark.pill}
            figure={centerMark.figure}
            unit={centerMark.unit}
            note={centerMark.note}
            viewWidth={view.w}
            framePx={framePx}
            holeRadius={innerEdge}
          />
        ) : null}
      </svg>
      {centerMark && referenceRing ? (
        <div className="day-model-overlay day-model-mark" data-fitted="true">
          <span className="day-model-pill">{centerMark.pill}</span>
          <span className="day-model-figure-row">
            <span className="day-model-figure">{centerMark.figure}</span>
            <span className="day-model-unit">{centerMark.unit}</span>
          </span>
        </div>
      ) : null}
      {callouts.map((callout, index) => (
        <Callout key={callout.id} callout={callout} box={beside[index]} view={view} />
      ))}
      {center ? <div className="day-center">{center}</div> : null}
      <RingKeyLabels points={points} showSoc={socVisible} showShift={shiftVisible} unit={unit} bold={mode === "projekt"} view={view} framePx={framePx} pullPx={keyLayout.pullPx} part="overlay" />
    </div>
    {listed.length > 0 ? (
      <ol className="day-callout-list">
        {listed.map((callout) => (
          <li key={callout.id}>
            <span className="num">{callout.n}</span>
            {callout.text}
          </li>
        ))}
      </ol>
    ) : null}
    <RingKeyLabels points={points} showSoc={socVisible} showShift={shiftVisible} unit={unit} bold={mode === "projekt"} view={view} framePx={framePx} pullPx={keyLayout.pullPx} part="list" />
    </div>
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

function referenceRadius(
  value: number,
  limit: number | null,
  layout: NonNullable<ReturnType<typeof referenceRingUser>>
): number {
  const span = limit != null && limit > 0 ? limit : 1;
  const share = Math.max(-1, Math.min(1, value / span));
  return share >= 0
    ? layout.zero + share * (layout.bandOuter - layout.zero)
    : layout.zero + share * (layout.zero - layout.bandInner);
}

export function SocRing({
  points,
  bold = false,
  unit = "GW",
  framePx = 720,
  viewW = 720,
  layout,
}: {
  points: LiveDispatchPoint[];
  bold?: boolean;
  unit?: RingUnit;
  framePx?: number;
  viewW?: number;
  /** Fixed inner edge. Thickness grows outward and is already in user units. */
  layout?: { innerUser: number; radiusOf: (soc: number) => number };
}) {
  const { radius, width } = socRingGeometry(unit, bold);
  const soc = useMorphedSeries(points.map((point) => point.soc));
  const series = points.map((point, index) => ({
    angleDeg: quarterCenterForHour(point.hour),
    value: soc[index] ?? point.soc,
  }));
  const inner = layout?.innerUser ?? Math.max(1, radius - width / 2);
  const radiusOf = layout?.radiusOf ?? ((value: number) => inner + Math.max(0, Math.min(1, value)) * width);
  const outer = layout
    ? monotonePolarSamples(series, radiusOf)
    : liftSocBand(smoothPolarSamples(series, radiusOf, inner), inner, Math.max(pxToUser(1.5, viewW, framePx), 0.75));
  const band = polarRibbonPath(
    outer,
    outer.map((sample) => ({ ...sample, radius: inner }))
  );
  return (
    <g className="day-soc-layer">
      <path className="day-soc" d={band} fill={unit === "kW" ? "#1E9CB0" : "var(--mint-stroke)"} opacity={0.9} />
      {layout ? <circle className="day-soc-edge" cx="0" cy="0" r={inner} /> : null}
    </g>
  );
}

function liftSocBand<T extends { angleDeg: number; radius: number }>(raw: T[], inner: number, minBand: number): T[] {
  // One Fritsch–Carlson outer edge. A per-sample floor would kink that curve into sawteeth,
  // so the whole band is lifted until its thinnest point is at least 1.5px.
  const thin = raw.reduce((min, sample) => Math.min(min, sample.radius - inner), Number.POSITIVE_INFINITY);
  const lift = Math.max(0, minBand - (Number.isFinite(thin) ? thin : 0));
  return raw.map((sample) => ({ ...sample, radius: sample.radius + lift }));
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

function calloutMarker(callout: RingCallout, unit: RingUnit) {
  const value = unit === "kW" ? callout.point.ohneMw : callout.point.ohneMw / 1000;
  const edge = unit === "kW" ? kwRadius(value) : ringRadius(value);
  const base = unit === "kW" ? kwRadius(0) : RING_R0;
  const radius = (edge + base) / 2;
  const deg = hourToDeg(callout.point.hour) + 1.8;
  return {
    at: polarPoint(0, 0, radius, deg),
    from: polarPoint(0, 0, radius, deg),
  };
}

function hourLabelBoxes(labelRadius: number, fontSize: number): CalloutBox[] {
  return [0, 6, 12, 18].map((hour) => {
    const deg = hour === 0 ? 0 : hourToDeg(hour) + 1.8;
    const at = polarPoint(0, 0, labelRadius, deg);
    const w = fontSize * 1.6;
    const h = fontSize * 1.2;
    return { x: at.x - w / 2, y: at.y - h / 2, w, h };
  });
}

function markerScreenPx(floorPx: number, framePx: number, viewW: number): number {
  const rawScreen = (16 * framePx) / Math.max(1, viewW);
  return pxToUser(Math.max(floorPx, rawScreen), viewW, framePx);
}

function CalloutMarker({ callout, unit, framePx, viewW }: { callout: RingCallout; unit: RingUnit; framePx: number; viewW: number }) {
  const { at } = calloutMarker(callout, unit);
  const radius = markerScreenPx(10, framePx, viewW);
  const digit = markerScreenPx(11, framePx, viewW);
  return (
    <g className="day-callout-mark" aria-hidden="true">
      <circle cx={at.x} cy={at.y} r={radius} fill="#0A0F14" stroke="#E9EEF2" strokeWidth={pxToUser(2, viewW, framePx)} />
      <text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fill="#E9EEF2" fontSize={digit} fontFamily="var(--font-plex-mono), monospace">
        {callout.n}
      </text>
    </g>
  );
}

function CalloutLeader({ callout, unit, box }: { callout: RingCallout; unit: RingUnit; box: CalloutBox | null }) {
  if (!box) {
    return null;
  }
  const { from } = calloutMarker(callout, unit);
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
  box: CalloutBox | null;
  view: { x: number; y: number; w: number; h: number };
}) {
  const left = box ? ((box.x - view.x) / view.w) * 100 : 0;
  const top = box ? ((box.y - view.y) / view.h) * 100 : 0;
  return (
    <p
      className="day-callout"
      data-callout={callout.id}
      aria-hidden={box ? undefined : true}
      style={{ left: `${left}%`, top: `${top}%`, width: CALLOUT_WIDTH, visibility: box ? "visible" : "hidden" }}
    >
      <span className="num">{callout.n}</span>
      {callout.text}
    </p>
  );
}

function sameKeyLayout(prev: KeyLayout, next: KeyLayout): boolean {
  return prev.fallback === next.fallback && prev.measured === next.measured && Math.abs(prev.pullPx - next.pullPx) < 0.5 && sameSegment(prev.socLine, next.socLine) && sameSegment(prev.shiftLine, next.shiftLine);
}

function sameSegment(prev: KeyLayout["socLine"], next: KeyLayout["socLine"]): boolean {
  if (!prev || !next) {
    return prev === next;
  }
  return Math.abs(prev.x1 - next.x1) < 0.5 && Math.abs(prev.y1 - next.y1) < 0.5 && Math.abs(prev.x2 - next.x2) < 0.5 && Math.abs(prev.y2 - next.y2) < 0.5;
}

function sameBoxes(prev: Array<CalloutBox | null>, next: Array<CalloutBox | null>): boolean {
  if (prev.length !== next.length) {
    return false;
  }
  return prev.every((box, index) => {
    const other = next[index];
    if (!box || !other) {
      return box === other;
    }
    return Math.abs(box.x - other.x) < 0.5 && Math.abs(box.y - other.y) < 0.5 && Math.abs(box.w - other.w) < 0.5 && Math.abs(box.h - other.h) < 0.5;
  });
}

function HourTicks({
  showHours,
  guideRadius,
  labelRadius,
  fontSize,
}: {
  showHours: boolean;
  guideRadius: number;
  labelRadius: number;
  fontSize: number;
}) {
  const hours = showHours ? [0, 6, 12, 18] : [0];
  const gap = Math.max(0, labelRadius - fontSize * 0.6 - guideRadius);
  return (
    <g className="day-ticks" fontSize={fontSize} aria-hidden="true">
      {hours.map((hour) => {
        const deg = hour === 0 ? 0 : hourToDeg(hour) + 1.8;
        const guide = polarPoint(0, 0, guideRadius, deg);
        const tick = polarPoint(0, 0, guideRadius + gap * 0.45, deg);
        const label = polarPoint(0, 0, labelRadius, deg);
        const text = hour === 0 ? "00" : String(hour).padStart(2, "0");
        return (
          <g key={hour}>
            <line x1={guide.x} y1={guide.y} x2={tick.x} y2={tick.y} strokeWidth="1" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central">
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function HourlyResidualTable({
  points,
  caption,
}: {
  points: LiveDispatchPoint[];
  caption: string;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const rows = hourlyResidualGw(points);
  return (
    <div className="day-sr">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>{tx("Stunde", "Hour")}</th>
          <th>{tx("ohne Speicher GW", "without storage GW")}</th>
          <th>{tx("mit Speicher GW", "with storage GW")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.hour}>
            <td>{String(row.hour).padStart(2, "0")}</td>
            <td>{formatQuantity(row.ohneGw, language, 1)}</td>
            <td>{formatQuantity(row.mitGw, language, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
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
