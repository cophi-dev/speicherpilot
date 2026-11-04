"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import type { ResidualSlot } from "@/lib/windSolarResidual";

const DESKTOP = { w: 1152, h: 360, pad: { top: 40, right: 24, bottom: 36, left: 56 } };
const MOBILE_H = 240;
const MOBILE_PAD = { top: 8, right: 10, bottom: 8, left: 36 };
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
  const x = (i: number) => frame.pad.left + (i / Math.max(1, slots.length - 1)) * plotW;
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
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join(" ");

  const wsArea =
    line((p) => p.ws) +
    ` L ${x(pts.length - 1).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const gapArea = pts
    .map((p, i) => {
      const top = y(p.load);
      const bottom = y(p.ws);
      return `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${top.toFixed(1)} L ${x(i).toFixed(1)} ${bottom.toFixed(1)}`;
    })
    .join(" ");

  const idx = peakAt
    ? Math.max(
        0,
        slots.findIndex(
          (s) =>
            `${String(s.hourBerlin).padStart(2, "0")}:${String(s.minuteBerlin).padStart(2, "0")}` === peakAt
        )
      )
    : maxIdx;
  const useIdx = idx >= 0 ? idx : maxIdx;
  const peakSlot = slots[useIdx] ?? slots[0];

  return {
    loadPath: line((p) => p.load),
    wsPath: wsArea,
    gapPath: `${gapArea} Z`,
    peakX: x(useIdx),
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

  const geometry = useMemo(
    () => buildGeometry(slots, peakAt, frame),
    [frame.h, frame.pad.bottom, frame.pad.left, frame.pad.right, frame.pad.top, frame.w, peakAt, slots]
  );

  const peakLabel =
    peakGw !== null ? `${formatQuantity(peakGw, "de", 1).replace(/\s/g, "")} GW` : "—";
  const peakTimeLabel = peakAt !== null ? `${peakLabel} · ${peakAt} Uhr` : peakLabel;
  const peakCaption = "Abendspitze der Residuallast";

  const labelInsideSvg = !compact && peakGw !== null && geometry.peakYLoad > frame.pad.top + 72;
  const hours = [0, 6, 12, 18, 24];
  const plotW = frame.w - frame.pad.left - frame.pad.right;
  const plotH = frame.h - frame.pad.top - frame.pad.bottom;

  return (
    <figure className={`v4-luecke-figure ${compact ? "is-compact" : ""}`}>
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
            const x = frame.pad.left + (h / 24) * plotW;
            return (
              <g key={h}>
                <line
                  x1={x}
                  x2={x}
                  y1={geometry.plotTop}
                  y2={geometry.plotBottom}
                  className="v4-luecke-grid"
                />
                {!compact ? (
                  <text x={x} y={frame.h - 10} textAnchor="middle" className="v4-luecke-axis num">
                    {String(h).padStart(2, "0")}
                  </text>
                ) : null}
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
                    y={frame.pad.top + 28}
                    textAnchor="start"
                    className="v4-luecke-peak-value num"
                  >
                    {peakLabel}
                  </text>
                  <text
                    x={geometry.peakX + 12}
                    y={frame.pad.top + 46}
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
        {compact ? (
          <div className="v4-luecke-mobile-axis num" aria-hidden="true">
            {hours.map((h) => (
              <span key={h}>{String(h).padStart(2, "0")}</span>
            ))}
          </div>
        ) : null}
      </div>
      {peakGw !== null && (!labelInsideSvg || compact) ? (
        <figcaption className="v4-luecke-peak-banner num">
          <span className="v4-luecke-peak-banner-value">{peakTimeLabel}</span>
          <span className="v4-luecke-peak-banner-caption">{peakCaption}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
