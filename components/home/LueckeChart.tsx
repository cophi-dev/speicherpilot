"use client";

import { useId, useMemo } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import type { ResidualSlot } from "@/lib/windSolarResidual";

const W = 1152;
const H = 360;
const PAD = { top: 56, right: 24, bottom: 44, left: 48 };
const Y_MAX_GW = 80;

function slotGw(slot: ResidualSlot) {
  return {
    load: slot.loadMw / 1000,
    ws: (slot.windMw + slot.solarMw) / 1000,
    gap: Math.max(0, slot.loadMw - slot.windMw - slot.solarMw) / 1000,
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
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const { loadPath, wsPath, gapPath, peakX, peakYLoad, peakYWs, peakIndex } = useMemo(() => {
    if (slots.length === 0) {
      return {
        loadPath: "",
        wsPath: "",
        gapPath: "",
        peakX: 0,
        peakYLoad: 0,
        peakYWs: 0,
        peakIndex: 0,
      };
    }
    const x = (i: number) => PAD.left + (i / Math.max(1, slots.length - 1)) * plotW;
    const y = (gw: number) => PAD.top + plotH - (gw / Y_MAX_GW) * plotH;

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

    return {
      loadPath: line((p) => p.load),
      wsPath: wsArea,
      gapPath: `${gapArea} Z`,
      peakX: x(idx >= 0 ? idx : maxIdx),
      peakYLoad: y(slotGw(slots[idx >= 0 ? idx : maxIdx] ?? slots[0]).load),
      peakYWs: y(slotGw(slots[idx >= 0 ? idx : maxIdx] ?? slots[0]).ws),
      peakIndex: idx >= 0 ? idx : maxIdx,
    };
  }, [peakAt, plotH, plotW, slots]);

  const peakLabel =
    peakGw !== null ? `${formatQuantity(peakGw, "de", 1).replace(/\s/g, "")} GW` : "—";
  const peakTimeLabel =
    peakAt !== null ? `Abendspitze der Residuallast, ${peakAt} Uhr` : "Abendspitze der Residuallast";

  const hours = [0, 6, 12, 18, 24];

  return (
    <svg
      className="v4-luecke-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Tagesverlauf Verbrauch, Wind und Sonne, Lücke andere Quellen. Spitze ${peakLabel}.`}
    >
      <defs>
        <pattern id={patternId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} className="v4-luecke-hatch" strokeWidth={1.1} />
        </pattern>
      </defs>
      {hours.map((h) => {
        const x = PAD.left + (h / 24) * plotW;
        return (
          <g key={h}>
            <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + plotH} className="v4-luecke-grid" />
            <text x={x} y={H - 12} textAnchor="middle" className="v4-luecke-axis num">
              {String(h).padStart(2, "0")}
            </text>
          </g>
        );
      })}
      <path d={wsPath} className="v4-luecke-ws-fill" />
      <path d={wsPath} className="v4-luecke-ws-line" fill="none" />
      <path d={gapPath} fill={`url(#${patternId})`} className="v4-luecke-gap" />
      <path d={loadPath} className="v4-luecke-load" fill="none" />
      <text x={PAD.left + plotW * 0.32} y={PAD.top + 24} className="v4-luecke-label">
        Verbrauch
      </text>
      <text x={PAD.left + plotW * 0.2} y={PAD.top + plotH * 0.55} className="v4-luecke-label">
        Wind und Sonne
      </text>
      <text x={PAD.left + plotW * 0.55} y={PAD.top + plotH * 0.35} className="v4-luecke-gap-label">
        andere Quellen
      </text>
      {peakGw !== null ? (
        <>
          <line
            x1={peakX}
            x2={peakX}
            y1={peakYWs}
            y2={peakYLoad}
            className="v4-luecke-peak-line"
          />
          <circle cx={peakX} cy={peakYWs} r={4.5} className="v4-luecke-peak-dot" />
          <circle cx={peakX} cy={peakYLoad} r={4.5} className="v4-luecke-peak-dot" />
          <line x1={peakX} x2={peakX} y1={PAD.top + 8} y2={peakYLoad} className="v4-luecke-peak-hair" />
          <text x={peakX - 12} y={PAD.top + 52} textAnchor="end" className="v4-luecke-peak-value num">
            {peakLabel}
          </text>
          <text x={peakX - 12} y={PAD.top + 68} textAnchor="end" className="v4-luecke-peak-caption">
            {peakTimeLabel}
          </text>
        </>
      ) : null}
    </svg>
  );
}
