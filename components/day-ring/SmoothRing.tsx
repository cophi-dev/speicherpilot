"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { energyColor, kwRadius, polarPoint, RING_R0, ringRadius, utilisationColor } from "@/lib/dayRingScale";
import {
  booleanRuns,
  conicGradient,
  easeInOut,
  polarAreaPath,
  polarCapPath,
  polarRibbonPath,
  quarterCenterForHour,
  RING_MORPH_MS,
  ringTip,
  smoothDrawnSeries,
  smoothPolarSamples,
  type CurveSample,
} from "@/lib/dayRingSmooth";
import type { Highlight, RingMode, RingScale, RingUnit } from "@/components/day-ring/DayRing";

export function SmoothRing({
  points,
  unit,
  scale,
  limit,
  mode,
  showFlow,
  highlight,
  hatchId,
  view,
}: {
  points: LiveDispatchPoint[];
  unit: RingUnit;
  scale: RingScale;
  limit: number | null;
  mode: RingMode;
  showFlow: boolean;
  highlight: Highlight;
  hatchId: string;
  view: { x: number; y: number; w: number; h: number };
}) {
  const clipId = `ring-${useId().replace(/:/g, "")}`;
  const valueOf = (point: LiveDispatchPoint, field: "ohneMw" | "mitMw") => (unit === "kW" ? point[field] : point[field] / 1000);
  const rawOhne = points.map((point) => valueOf(point, "ohneMw"));
  const rawMit = points.map((point) => valueOf(point, "mitMw"));
  const ohne = useMorphedSeries(smoothDrawnSeries(rawOhne));
  const mit = useMorphedSeries(smoothDrawnSeries(rawMit));
  const radiusOf = (value: number) => (unit === "kW" ? kwRadius(value) : ringRadius(value));
  const zero = unit === "kW" ? kwRadius(0) : RING_R0;
  const ohneSeries = points.map((point, index) => ({ angleDeg: quarterCenterForHour(point.hour), value: ohne[index] ?? 0 }));
  const mitSeries = points.map((point, index) => ({ angleDeg: quarterCenterForHour(point.hour), value: mit[index] ?? 0 }));
  const ohneSamples = smoothPolarSamples(ohneSeries, radiusOf, zero);
  const mitSamples = smoothPolarSamples(mitSeries, radiusOf, zero);
  const colorOf = (value: number) =>
    scale === "utilisation" && limit != null && limit > 0 ? utilisationColor(value / limit) : energyColor(value);
  const gradient = conicGradient(ohneSeries.map((sample) => ({ angleDeg: sample.angleDeg, color: colorOf(sample.value) })));
  const span = highlightSpan(highlight);
  const reach = Math.max(zero, ...ohneSamples.map((sample) => sample.radius), ...mitSamples.map((sample) => sample.radius)) + 48;
  const area = polarAreaPath(ohneSamples, zero);

  return (
    <g className="day-smooth">
      <defs>
        <mask id={`${clipId}-zero`} maskUnits="userSpaceOnUse">
          <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="white" />
          <path d={area} fill="black" stroke="black" strokeWidth="6" />
        </mask>
        {span ? (
          <clipPath id={`${clipId}-wedge`} clipPathUnits="userSpaceOnUse">
            <path d={wedgePath(span.start, span.end, reach)} />
          </clipPath>
        ) : null}
      </defs>
      <circle className="day-zero" cx="0" cy="0" r={zero} fill="none" mask={`url(#${clipId}-zero)`} />
      <RingPaint
        clipId={clipId}
        ohne={ohneSamples}
        mit={mitSamples}
        zero={zero}
        gradient={gradient}
        view={view}
        showFlow={showFlow}
        hatchId={hatchId}
        limit={limit}
        mode={mode}
        unit={unit}
        mark
        opacity={span ? 0.3 : 1}
      />
      {span ? (
        <g clipPath={`url(#${clipId}-wedge)`} aria-hidden="true">
          <RingPaint
            clipId={`${clipId}-hot`}
            ohne={ohneSamples}
            mit={mitSamples}
            zero={zero}
            gradient={gradient}
            view={view}
            showFlow={showFlow}
            hatchId={hatchId}
            limit={limit}
            mode={mode}
            unit={unit}
            mark={false}
            opacity={1}
          />
        </g>
      ) : null}
      <g className="day-ring-tips">
        {points.map((point) => {
          const value = valueOf(point, "ohneMw");
          const angle = quarterCenterForHour(point.hour);
          const at = radiusOf(value);
          const tip = ringTip(value);
          const [x, y] = xyPair(at, angle);
          return (
            <circle key={point.hour} className="day-ring-tip" data-raw={tip} cx={x} cy={y} r="8" fill="transparent">
              <title>{tip}</title>
            </circle>
          );
        })}
      </g>
    </g>
  );
}

function RingPaint({
  clipId,
  ohne,
  mit,
  zero,
  gradient,
  view,
  showFlow,
  hatchId,
  limit,
  mode,
  unit,
  mark,
  opacity,
}: {
  clipId: string;
  ohne: CurveSample[];
  mit: CurveSample[];
  zero: number;
  gradient: string;
  view: { x: number; y: number; w: number; h: number };
  showFlow: boolean;
  hatchId: string;
  limit: number | null;
  mode: RingMode;
  unit: RingUnit;
  mark: boolean;
  opacity: number;
}) {
  const area = polarAreaPath(ohne, zero);
  const epsilon = unit === "kW" ? 0.2 : 0.02;
  const charge = booleanRuns(ohne.map((sample, index) => (mit[index]?.value ?? sample.value) > sample.value + epsilon));
  const discharge = booleanRuns(ohne.map((sample, index) => sample.value > (mit[index]?.value ?? sample.value) + epsilon));
  const over =
    mode === "netz" && limit != null
      ? booleanRuns(ohne.map((sample) => sample.value > limit + epsilon))
      : [];
  return (
    <g className={mark ? "day-smooth-base" : "day-smooth-hot"} opacity={opacity < 1 ? opacity : undefined}>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={area} />
        </clipPath>
      </defs>
      <foreignObject x={view.x} y={view.y} width={view.w} height={view.h} clipPath={`url(#${clipId})`} pointerEvents="none" aria-hidden="true">
        <div style={{ width: "100%", height: "100%", background: gradient }} />
      </foreignObject>
      <path className={mark ? "day-ring-area" : undefined} d={area} fill="none" />
      {showFlow
        ? charge.map((run) => (
            <path key={`c${run.start}`} d={polarRibbonPath(mit.slice(run.start, run.end + 1), ohne.slice(run.start, run.end + 1))} fill="#7DFCE6" />
          ))
        : null}
      {showFlow && mode !== "projekt"
        ? discharge.map((run) => {
            const outer = ohne.slice(run.start, run.end + 1);
            const inner = mit.slice(run.start, run.end + 1);
            return (
              <g key={`d${run.start}`}>
                <path d={polarRibbonPath(outer, inner)} fill={`url(#${hatchId})`} />
                <path d={openStroke(outer)} fill="none" stroke="#FF8A70" strokeWidth="2" strokeDasharray="5 4" />
              </g>
            );
          })
        : null}
      {showFlow && mode === "projekt"
        ? discharge.map((run) => (
            <path
              key={`p${run.start}`}
              d={polarRibbonPath(ohne.slice(run.start, run.end + 1), mit.slice(run.start, run.end + 1))}
              fill="#7DFCE6"
              opacity="0.85"
            />
          ))
        : null}
      {limit != null
        ? over.map((run) => <path key={`o${run.start}`} d={polarCapPath(ohne.slice(run.start, run.end + 1), unit === "kW" ? kwRadius(limit) : ringRadius(limit))} fill={`url(#${hatchId})`} />)
        : null}
    </g>
  );
}

function useMorphedSeries(values: number[]): number[] {
  const signature = values.map((value) => value.toFixed(4)).join("|");
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const fromRef = useRef(values);
  const [shown, setShown] = useState(values);
  useLayoutEffect(() => {
    const target = valuesRef.current;
    const from = fromRef.current.slice();
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const unchanged = from.length === target.length && from.every((value, index) => value === target[index]);
    if (reduced || unchanged || typeof window.matchMedia !== "function") {
      fromRef.current = target;
      setShown((current) => (sameNumbers(current, target) ? current : target));
      return;
    }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min(1, (now - started) / RING_MORPH_MS);
      const next = t >= 1 ? target.slice() : from.map((value, index) => value + ((target[index] ?? value) - value) * easeInOut(t));
      fromRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [signature]);
  return shown;
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function highlightSpan(highlight: Highlight): { start: number; end: number } | null {
  if (highlight === "night") return { start: quarterCenterForHour(0) - 1, end: quarterCenterForHour(5.75) + 1 };
  if (highlight === "midday") return { start: quarterCenterForHour(11) - 1, end: quarterCenterForHour(14.75) + 1 };
  if (highlight === "evening") return { start: quarterCenterForHour(17) - 1, end: quarterCenterForHour(21.75) + 1 };
  return null;
}

function wedgePath(start: number, end: number, radius: number): string {
  const from = xyPair(radius, start);
  const to = xyPair(radius, end);
  const large = end - start > 180 ? 1 : 0;
  const r = (Math.round(radius * 100) / 100).toString();
  return `M 0 0 L ${from[0]} ${from[1]} A ${r} ${r} 0 ${large} 1 ${to[0]} ${to[1]} Z`;
}

function openStroke(samples: readonly CurveSample[]): string {
  if (samples.length < 2) return "";
  return samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${xyPair(sample.radius, sample.angleDeg).join(" ")}`).join(" ");
}

function xyPair(radius: number, angleDeg: number): [number, number] {
  const point = polarPoint(0, 0, radius, angleDeg);
  return [point.x, point.y];
}
