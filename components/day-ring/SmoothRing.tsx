"use client";

import { useId } from "react";

import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { energyColor, kwRadius, polarPoint, pxToUser, RING_R0, ringRadius, utilisationColor } from "@/lib/dayRingScale";
import {
  booleanRuns,
  conicGradient,
  inMidnightTaper,
  clampRibbon,
  monotonePolarSamples,
  polarAreaPath,
  polarCapPath,
  polarRibbonPath,
  quarterCenterForHour,
  ringTip,
  smoothDrawnSeries,
  smoothPolarSamples,
  taperRingSamples,
  type CurveSample,
} from "@/lib/dayRingSmooth";
import type { Highlight, RingMode, RingScale, RingUnit } from "@/components/day-ring/DayRing";
import { useMorphedSeries } from "@/components/day-ring/useMorphedSeries";

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
  framePx,
  smoothSeries = true,
  holeRadius = 0,
  radiusOf: radiusOfProp,
  zeroRadius,
  monotone = false,
  solidSigns = false,
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
  framePx: number;
  /** Three-point average. Off when a quarter at the nameplate must keep its full radius. */
  smoothSeries?: boolean;
  /** User-unit radius kept clear of the painted band. */
  holeRadius?: number;
  /** Replaces the fixed kW/GW scale. Used by the reference ring, which sizes itself in CSS px. */
  radiusOf?: (value: number) => number;
  zeroRadius?: number;
  /** Monotone cubic. The reference state-of-charge ring asks for this so the curve cannot pass a real value. */
  monotone?: boolean;
  /** One flat colour per sign. Charge is mint, discharge is coral. */
  solidSigns?: boolean;
}) {
  const clipId = `ring-${useId().replace(/:/g, "")}`;
  const valueOf = (point: LiveDispatchPoint, field: "ohneMw" | "mitMw") => (unit === "kW" ? point[field] : point[field] / 1000);
  const rawOhne = points.map((point) => valueOf(point, "ohneMw"));
  const rawMit = points.map((point) => valueOf(point, "mitMw"));
  const ohne = useMorphedSeries(smoothSeries ? smoothDrawnSeries(rawOhne) : rawOhne);
  const mit = useMorphedSeries(smoothSeries ? smoothDrawnSeries(rawMit) : rawMit);
  const radiusOf = radiusOfProp ?? ((value: number) => (unit === "kW" ? kwRadius(value) : ringRadius(value)));
  const zero = zeroRadius ?? (unit === "kW" ? kwRadius(0) : RING_R0);
  const ohneSeries = points.map((point, index) => ({ angleDeg: quarterCenterForHour(point.hour), value: ohne[index] ?? 0 }));
  const mitSeries = points.map((point, index) => ({ angleDeg: quarterCenterForHour(point.hour), value: mit[index] ?? 0 }));
  const smooth = (series: { angleDeg: number; value: number }[]) =>
    monotone ? monotonePolarSamples(series, radiusOf) : smoothPolarSamples(series, radiusOf, zero);
  const ohneSamples = taperRingSamples(smooth(ohneSeries), zero);
  const mitSamples = taperRingSamples(smooth(mitSeries), zero);
  const colorOf = (value: number) =>
    scale === "utilisation" && limit != null && limit > 0 ? utilisationColor(value / limit) : energyColor(value);
  const gradient = conicGradient(ohneSeries.map((sample) => ({ angleDeg: sample.angleDeg, color: colorOf(sample.value) })));
  const span = highlightSpan(highlight);
  const reach = Math.max(zero, ...ohneSamples.map((sample) => sample.radius), ...mitSamples.map((sample) => sample.radius)) + 48;
  const area = polarAreaPath(ohneSamples, zero);
  const holeMask = holeRadius > 0 ? `url(#${clipId}-hole)` : undefined;

  return (
    <g className="day-smooth">
      <defs>
        <mask id={`${clipId}-zero`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x={view.x} y={view.y} width={view.w} height={view.h}>
          <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="white" />
          <path d={area} fill="black" fillRule="nonzero" />
        </mask>
        {holeRadius > 0 ? (
          <mask id={`${clipId}-hole`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x={view.x} y={view.y} width={view.w} height={view.h}>
            <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="white" />
            <circle cx="0" cy="0" r={holeRadius} fill="black" />
          </mask>
        ) : null}
        {span ? (
          <clipPath id={`${clipId}-wedge`} clipPathUnits="userSpaceOnUse">
            <path d={wedgePath(span.start, span.end, reach)} />
          </clipPath>
        ) : null}
      </defs>
      <clipPath id={`${clipId}-area`} clipPathUnits="userSpaceOnUse">
        <path className="day-ring-area" d={area} fillRule="nonzero" shapeRendering="geometricPrecision" />
      </clipPath>
      <circle className="day-zero" cx="0" cy="0" r={zero} fill="none" mask={`url(#${clipId}-zero)`} />
      {solidSigns ? (
        <g mask={holeMask}>
          <SolidSigns ohne={ohneSamples} zero={zero} unit={unit} />
        </g>
      ) : (
        <g mask={holeMask}>
          <g clipPath={`url(#${clipId}-area)`}>
            <g className={span ? "day-smooth-base is-dim" : "day-smooth-base"}>
              <foreignObject x={view.x} y={view.y} width={view.w} height={view.h} clipPath={`url(#${clipId}-area)`} pointerEvents="none" aria-hidden="true">
                <div style={{ width: "100%", height: "100%", background: gradient }} />
              </foreignObject>
            </g>
            {span ? (
              <g className="day-smooth-hot" clipPath={`url(#${clipId}-wedge)`}>
                <foreignObject x={view.x} y={view.y} width={view.w} height={view.h} clipPath={`url(#${clipId}-area)`} pointerEvents="none" aria-hidden="true">
                  <div style={{ width: "100%", height: "100%", background: gradient }} />
                </foreignObject>
              </g>
            ) : null}
          </g>
          <RingPaint ohne={ohneSamples} mit={mitSamples} showFlow={showFlow} hatchId={hatchId} limit={limit} mode={mode} unit={unit} minGap={pxToUser(1.5, view.w, framePx)} dim={Boolean(span)} />
          {span ? (
            <g clipPath={`url(#${clipId}-wedge)`} aria-hidden="true">
              <RingPaint ohne={ohneSamples} mit={mitSamples} showFlow={showFlow} hatchId={hatchId} limit={limit} mode={mode} unit={unit} minGap={pxToUser(1.5, view.w, framePx)} dim={false} />
            </g>
          ) : null}
        </g>
      )}
      <g className="day-ring-tips">
        {points.map((point, index) => {
          const value = valueOf(point, "ohneMw");
          const angle = quarterCenterForHour(point.hour);
          const at = radiusOf(value);
          const tip = ringTip(value);
          const [x, y] = xyPair(at, angle);
          return (
            <circle key={point.timestampIso ?? `${point.hour}-${index}`} className="day-ring-tip" data-raw={tip} cx={x} cy={y} r="8" fill="transparent">
              <title>{tip}</title>
            </circle>
          );
        })}
      </g>
    </g>
  );
}

function SolidSigns({ ohne, zero, unit }: { ohne: CurveSample[]; zero: number; unit: RingUnit }) {
  const epsilon = unit === "kW" ? 0.2 : 0.02;
  const open = (sample: CurveSample) => !inMidnightTaper(sample.angleDeg);
  const onZero = (sample: CurveSample): CurveSample => ({ ...sample, radius: zero });
  const chargeSign = booleanRuns(ohne.map((sample) => open(sample) && sample.value < -epsilon));
  const dischargeSign = booleanRuns(ohne.map((sample) => open(sample) && sample.value > epsilon));
  return (
    <g className="day-smooth-base">
      {chargeSign.map((run) => (
        <path key={`mint${run.start}`} d={polarRibbonPath(ohne.slice(run.start, run.end + 1), ohne.slice(run.start, run.end + 1).map(onZero))} fill="#9BF6E6" />
      ))}
      {dischargeSign.map((run) => (
        <path key={`coral${run.start}`} d={polarRibbonPath(ohne.slice(run.start, run.end + 1), ohne.slice(run.start, run.end + 1).map(onZero))} fill="#FF8A70" />
      ))}
    </g>
  );
}

function RingPaint({
  ohne,
  mit,
  showFlow,
  hatchId,
  limit,
  mode,
  unit,
  minGap,
  dim,
}: {
  ohne: CurveSample[];
  mit: CurveSample[];
  showFlow: boolean;
  hatchId: string;
  limit: number | null;
  mode: RingMode;
  unit: RingUnit;
  minGap: number;
  dim: boolean;
}) {
  const epsilon = unit === "kW" ? 0.2 : 0.02;
  const open = (sample: CurveSample) => !inMidnightTaper(sample.angleDeg);
  const charge = booleanRuns(ohne.map((sample, index) => open(sample) && (mit[index]?.value ?? sample.value) > sample.value + epsilon));
  const discharge = booleanRuns(ohne.map((sample, index) => open(sample) && sample.value > (mit[index]?.value ?? sample.value) + epsilon));
  const over =
    mode === "netz" && limit != null
      ? booleanRuns(ohne.map((sample) => open(sample) && sample.value > limit + epsilon))
      : [];
  const ribbon = (edge: CurveSample[], base: CurveSample[]) => {
    const clamped = clampRibbon(edge, base, minGap);
    return polarRibbonPath(clamped.outer, clamped.inner);
  };
  return (
    <g className={dim ? "day-smooth-base is-dim" : "day-smooth-hot"}>
      {showFlow
        ? charge.map((run) => (
            <path key={`c${run.start}`} className="day-charge" d={ribbon(mit.slice(run.start, run.end + 1), ohne.slice(run.start, run.end + 1))} fill="var(--mint-stroke)" />
          ))
        : null}
      {showFlow && mode !== "projekt"
        ? discharge.map((run) => (
            <path key={`d${run.start}`} d={ribbon(ohne.slice(run.start, run.end + 1), mit.slice(run.start, run.end + 1))} fill={`url(#${hatchId})`} />
          ))
        : null}
      {showFlow && mode === "projekt"
        ? discharge.map((run) => (
            <path
              key={`p${run.start}`}
              d={ribbon(ohne.slice(run.start, run.end + 1), mit.slice(run.start, run.end + 1))}
              fill="var(--mint-stroke)"
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

function xyPair(radius: number, angleDeg: number): [number, number] {
  const point = polarPoint(0, 0, radius, angleDeg);
  return [point.x, point.y];
}
