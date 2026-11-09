"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import polish from "@/components/home/dayBlockPolish.module.css";
import {
  LUECKE_DESKTOP,
  LUECKE_MOBILE_H,
  LUECKE_MOBILE_PAD,
  lueckeDayKind,
  plotXForAxisHour,
  plotXFromSlotIndex,
  slotIndexForPeakAt,
} from "@/lib/lueckeChartGeometry";
import type { ResidualSlot } from "@/lib/windSolarResidual";

const DESKTOP = LUECKE_DESKTOP;
const MOBILE_H = LUECKE_MOBILE_H;
const MOBILE_PAD = LUECKE_MOBILE_PAD;
const Y_MAX_GW = 80;

function slotGw(slot: ResidualSlot) {
  return {
    load: slot.loadMw / 1000,
    ws: (slot.windMw + slot.solarMw) / 1000,
    gap: Math.max(0, slot.loadMw - slot.windMw - slot.solarMw) / 1000,
  };
}

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

function buildGeometry(
  slots: ResidualSlot[],
  peakAt: string | null,
  frame: { w: number; h: number; pad: typeof DESKTOP.pad }
) {
  const plotW = frame.w - frame.pad.left - frame.pad.right;
  const plotH = frame.h - frame.pad.top - frame.pad.bottom;
  if (slots.length === 0 || plotW <= 0 || plotH <= 0) {
    return {
      loadPath: "",
      wsPath: "",
      gapPath: "",
      peakX: 0,
      peakYLoad: 0,
      peakYWs: 0,
      plotTop: frame.pad.top,
      plotBottom: frame.pad.top + plotH,
      labelLoad: { x: 0, y: 0 },
      labelWs: { x: 0, y: 0 },
      labelGap: { x: 0, y: 0 },
    };
  }
  const xAt = (index: number) => plotXFromSlotIndex(index, slots.length, frame.pad.left, plotW);
  const y = (gw: number) => frame.pad.top + plotH - (gw / Y_MAX_GW) * plotH;

  let maxGap = -1;
  let maxIdx = 0;
  const pts = slots.map((s, i) => {
    const g = slotGw(s);
    if (g.gap > maxGap) {
      maxGap = g.gap;
      maxIdx = i;
    }
    return { ...g, i };
  });

  const line = (pick: (p: (typeof pts)[0]) => number) =>
    pts
      .map((p, i) => {
        const px = xAt(p.i);
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${y(pick(p)).toFixed(1)}`;
      })
      .join(" ");

  const wsArea =
    line((p) => p.ws) +
    ` L ${xAt(slots.length - 1).toFixed(1)} ${y(0).toFixed(1)} L ${xAt(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const gapArea = pts
    .map((p, i) => {
      const px = xAt(p.i);
      const top = y(p.load);
      const bottom = y(p.ws);
      return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${top.toFixed(1)} L ${px.toFixed(1)} ${bottom.toFixed(1)}`;
    })
    .join(" ");

  const useIdx = peakAt ? slotIndexForPeakAt(slots, peakAt) : maxIdx;
  const peakSlot = slots[useIdx] ?? slots[0];

  return {
    loadPath: line((p) => p.load),
    wsPath: wsArea,
    gapPath: `${gapArea} Z`,
    peakX: xAt(useIdx),
    peakYLoad: y(slotGw(peakSlot).load),
    peakYWs: y(slotGw(peakSlot).ws),
    plotTop: frame.pad.top,
    plotBottom: frame.pad.top + plotH,
    labelLoad: { x: frame.pad.left + plotW * 0.34, y: frame.pad.top + 14 },
    labelWs: { x: frame.pad.left + plotW * 0.16, y: frame.pad.top + plotH * 0.58 },
    labelGap: { x: frame.pad.left + plotW * 0.52, y: frame.pad.top + plotH * 0.4 },
  };
}

export function LueckeChart({
  slots,
  peakGw,
  peakAt,
}: {
  slots: ResidualSlot[];
  peakGw: number | null;
  peakAt: string | null;
}) {
  const patternId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const compact = useSyncExternalStore(subscribeCompact, getCompactSnapshot, getCompactServerSnapshot);
  const [shellWidth, setShellWidth] = useState(335);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) {
      return undefined;
    }
    const sync = () => setShellWidth(Math.max(280, Math.round(node.clientWidth)));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const frame = compact
    ? { w: shellWidth, h: MOBILE_H, pad: MOBILE_PAD }
    : { w: DESKTOP.w, h: DESKTOP.h, pad: DESKTOP.pad };

  const dayKind = useMemo(() => lueckeDayKind(slots.length), [slots.length]);

  const geometry = useMemo(
    () => buildGeometry(slots, peakAt, frame),
    [frame.h, frame.pad.bottom, frame.pad.left, frame.pad.right, frame.pad.top, frame.w, peakAt, slots]
  );

  const peakLabel =
    peakGw !== null ? `${formatQuantity(peakGw, "de", 1).replace(/\s/g, "")} GW` : "—";
  const peakTimeLabel = peakAt !== null ? `${peakLabel} · ${peakAt} Uhr` : peakLabel;
  const peakCaption = "Abendspitze der Residuallast";

  const peakLabelY =
    peakGw !== null ? Math.max(frame.pad.top + 16, geometry.peakYLoad - 20) : frame.pad.top + 28;
  const labelInsideSvg = !compact && peakGw !== null && peakLabelY > frame.pad.top + 12;
  const hours = [0, 6, 12, 18, 24];
  const plotW = frame.w - frame.pad.left - frame.pad.right;
  const plotH = frame.h - frame.pad.top - frame.pad.bottom;

  const padVars = compact
    ? ({
        "--v4-luecke-pad-left": `${MOBILE_PAD.left}px`,
        "--v4-luecke-pad-right": `${MOBILE_PAD.right}px`,
      } as CSSProperties)
    : undefined;

  return (
    <figure
      className={`v4-luecke-figure ${compact ? "is-compact" : ""} ${polish.root}`}
      style={padVars}
      data-luecke-slot-count={slots.length}
      data-luecke-day-kind={dayKind}
    >
      <div ref={shellRef} className="v4-luecke-svg-shell">
        {compact ? (
          <div className="v4-luecke-overlay" aria-hidden="true">
            <span
              className="v4-luecke-overlay-label"
              style={{
                left: `${(geometry.labelLoad.x / frame.w) * 100}%`,
                top: `${(geometry.labelLoad.y / frame.h) * 100}%`,
              }}
            >
              Verbrauch
            </span>
            <span
              className="v4-luecke-overlay-label v4-luecke-overlay-ws"
              style={{
                left: `${(geometry.labelWs.x / frame.w) * 100}%`,
                top: `${(geometry.labelWs.y / frame.h) * 100}%`,
              }}
            >
              Wind und Sonne
            </span>
            <span
              className="v4-luecke-overlay-label v4-luecke-overlay-gap"
              style={{
                left: `${(geometry.labelGap.x / frame.w) * 100}%`,
                top: `${(geometry.labelGap.y / frame.h) * 100}%`,
              }}
            >
              andere Quellen
            </span>
          </div>
        ) : null}
        <svg
          className="v4-luecke-chart"
          viewBox={`0 0 ${frame.w} ${frame.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Tagesverlauf Verbrauch, Wind und Sonne, Lücke andere Quellen. Spitze ${peakLabel}.`}
        >
          <defs>
            <pattern id={patternId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={6} className="v4-luecke-hatch" strokeWidth={1.1} />
            </pattern>
          </defs>
          {hours.map((h) => {
            const x = plotXForAxisHour(h, slots, frame.pad.left, plotW);
            return (
              <g key={h}>
                <line
                  x1={x}
                  x2={x}
                  y1={geometry.plotTop}
                  y2={geometry.plotBottom}
                  className="v4-luecke-grid"
                />
                <text
                  x={x}
                  y={compact ? frame.h - 6 : frame.h - 10}
                  textAnchor="middle"
                  className="v4-luecke-axis num"
                  fontSize={compact ? 12 : undefined}
                >
                  {String(h).padStart(2, "0")}
                </text>
              </g>
            );
          })}
          <path d={geometry.wsPath} className="v4-luecke-ws-fill" vectorEffect="non-scaling-stroke" />
          <path d={geometry.wsPath} className="v4-luecke-ws-line" fill="none" vectorEffect="non-scaling-stroke" />
          <path d={geometry.gapPath} fill={`url(#${patternId})`} className="v4-luecke-gap" />
          <path d={geometry.loadPath} className="v4-luecke-load" fill="none" vectorEffect="non-scaling-stroke" />
          {!compact ? (
            <>
              <text x={frame.pad.left + plotW * 0.34} y={frame.pad.top + 18} className="v4-luecke-label">
                Verbrauch
              </text>
              <text x={frame.pad.left + plotW * 0.18} y={frame.pad.top + plotH * 0.58} className="v4-luecke-label">
                Wind und Sonne
              </text>
              <text x={frame.pad.left + plotW * 0.52} y={frame.pad.top + plotH * 0.42} className="v4-luecke-gap-label">
                andere Quellen
              </text>
            </>
          ) : null}
          {peakGw !== null ? (
            <>
              <line
                x1={geometry.peakX}
                x2={geometry.peakX}
                y1={geometry.peakYWs}
                y2={geometry.peakYLoad}
                className="v4-luecke-peak-line"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={geometry.peakX} cy={geometry.peakYWs} r={4.5} className="v4-luecke-peak-dot" />
              <circle cx={geometry.peakX} cy={geometry.peakYLoad} r={4.5} className="v4-luecke-peak-dot" />
              {labelInsideSvg ? (
                <>
                  <text
                    x={geometry.peakX + 12}
                    y={peakLabelY}
                    textAnchor="start"
                    className="v4-luecke-peak-value num"
                  >
                    {peakLabel}
                  </text>
                  <text
                    x={geometry.peakX + 12}
                    y={peakLabelY + 18}
                    textAnchor="start"
                    className="v4-luecke-peak-caption"
                  >
                    {peakCaption}
                  </text>
                </>
              ) : null}
            </>
          ) : null}
        </svg>
      </div>
      {dayKind === "dst-fall-100" ? (
        <p className="v4-luecke-dst-note num">
          Zeitumstellung (Herbst): 25 Stunden Ortszeit, {slots.length} Viertelstunden — Verlauf in
          Zeitreihenfolge, nicht als doppelte Wanduhr übereinander.
        </p>
      ) : null}
      {dayKind === "dst-spring-92" ? (
        <p className="v4-luecke-dst-note num">
          Zeitumstellung (Frühling): 23 Stunden Ortszeit, {slots.length} Viertelstunden — die fehlende
          02:00–02:45 ist entfallen.
        </p>
      ) : null}
      {compact ? (
        <div className="v4-luecke-compact-foot">
          {peakGw !== null ? (
            <figcaption className="v4-luecke-peak-banner num">
              <span className="v4-luecke-peak-banner-value">{peakTimeLabel}</span>
              <span className="v4-luecke-peak-banner-caption">{peakCaption}</span>
            </figcaption>
          ) : null}
        </div>
      ) : peakGw !== null && !labelInsideSvg ? (
        <figcaption className="v4-luecke-peak-banner num">
          <span className="v4-luecke-peak-banner-value">{peakTimeLabel}</span>
          <span className="v4-luecke-peak-banner-caption">{peakCaption}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
