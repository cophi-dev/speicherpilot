"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

type Slot = { hourLabel: string; observedGw: number; priceGw: number; peakGw: number };

function polylinePoints(
  values: number[],
  yMin: number,
  yMax: number,
  vb: { L: number; T: number; plotW: number; plotH: number },
): string {
  return values
    .map((value, index) => {
      const x = vb.L + (index / (values.length - 1)) * vb.plotW;
      const y = vb.T + vb.plotH - ((value - yMin) / (yMax - yMin)) * vb.plotH;
      return `${x},${y}`;
    })
    .join(" ");
}

function slotIndexForHour(slots: Slot[], hour: number): number {
  const prefix = `${String(hour).padStart(2, "0")}:`;
  const idx = slots.findIndex((s) => s.hourLabel.startsWith(prefix));
  return idx >= 0 ? idx : Math.round((hour / 24) * (slots.length - 1));
}

function xAtIndex(index: number, vb: { L: number; plotW: number }, count: number): number {
  return vb.L + (index / (count - 1)) * vb.plotW;
}

function yAtValue(value: number, yMin: number, yMax: number, vb: { T: number; plotH: number }): number {
  return vb.T + vb.plotH - ((value - yMin) / (yMax - yMin)) * vb.plotH;
}

const RENDER_MIN_W = 350;
const vb = { w: 720, h: 416, L: 52, R: 24, T: 32, B: 52, plotW: 0, plotH: 0 };
vb.plotW = vb.w - vb.L - vb.R;
vb.plotH = vb.h - vb.T - vb.B;

type FahrweiseDay = ReturnType<typeof import("@/lib/netzUpdatesChartData.server").loadNetzUpdatesFahrweiseDay>;

export function NetzUpdatesFahrweiseChartSvg({ data }: { data: FahrweiseDay }) {
  const figRef = useRef<HTMLElement>(null);
  const [clientW, setClientW] = useState(RENDER_MIN_W);

  useLayoutEffect(() => {
    const el = figRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setClientW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = clientW / vb.w;
  const fs = (13 * vb.w) / RENDER_MIN_W;
  const fsAxis = fs;
  const yMin = 20;
  const yMax = 58;

  const observed = data.slots.map((s) => s.observedGw);
  const price = data.slots.map((s) => s.priceGw);
  const peak = data.slots.map((s) => s.peakGw);
  const n = data.slots.length;
  const last = n - 1;
  const labelColX = vb.L + vb.plotW - 2;

  const lineStyles = [
    { key: "observed", series: observed, stroke: "var(--blog-ink, #1c2429)", width: 1.5, label: "beobachtet" },
    { key: "price", series: price, stroke: "var(--blog-ink, #1c2429)", width: 2, label: "Markt" },
    { key: "peak", series: peak, stroke: "#4ecdc4", width: 2, label: "gegen die Spitze" },
  ] as const;

  const placedLabels = useMemo(() => {
    const rawLabels = lineStyles.map((line) => ({
      label: line.label,
      lineY: yAtValue(line.series[last]!, yMin, yMax, vb),
    }));
    rawLabels.sort((a, b) => a.lineY - b.lineY);
    const minGapVb = 4 / Math.max(scale, 0.01);
    const stackStep = fs + minGapVb + Math.max(8, fs * 0.35);
    const stackTop = vb.T + fs + 4;
    return rawLabels.map((item, i) => ({ label: item.label, y: stackTop + i * stackStep, lineY: item.lineY }));
  }, [data.slots, fs, last, peak, price, observed, scale]);

  const narrow = clientW <= 420;
  const hourTicks = (narrow ? [0, 6, 12, 18] : [0, 6, 12, 18, 24]) as readonly number[];

  const xAxisY = vb.T + vb.plotH + 26;

  const title =
    "Tagesprofil 21.10.2026: beobachtete Restlast, Markt fährt nach Preis (Spitze 55,6 GW um 14:00), gegen die Spitze gedeckelt bei 51,7 GW. Zusatzflotte 4,6 GW, Modell Oktober 2026.";

  return (
    <figure ref={figRef} className="blog-figure blog-netz-chart">
      <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className="blog-netz-chart-svg" role="img" aria-label={title} overflow="visible">
        <title>{title}</title>
        {[20, 30, 40, 50].map((tick) => {
          const y = yAtValue(tick, yMin, yMax, vb);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + vb.plotW} y1={y} y2={y} stroke="var(--blog-grid, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 6} y={y + 4} textAnchor="end" fill="var(--blog-muted, #6b7280)" fontSize={fsAxis}>
                {tick}
              </text>
            </g>
          );
        })}
        <text x={vb.L + 2} y={vb.T - 6} textAnchor="start" fill="var(--blog-muted, #6b7280)" fontSize={fsAxis}>
          GW
        </text>
        <polygon
          fill="rgb(143 154 164 / 22%)"
          points={`${vb.L},${vb.T + vb.plotH} ${polylinePoints(observed, yMin, yMax, vb)} ${vb.L + vb.plotW},${vb.T + vb.plotH}`}
        />
        {lineStyles.map((line) =>
          line.key === "observed" ? null : (
            <polyline
              key={line.key}
              fill="none"
              stroke={line.stroke}
              strokeWidth={line.width}
              points={polylinePoints(line.series, yMin, yMax, vb)}
            />
          ),
        )}
        {placedLabels.map((item) => (
          <g key={item.label}>
            <line
              x1={labelColX - 14}
              y1={item.lineY}
              x2={labelColX - 4}
              y2={item.y - fs / 3}
              stroke="var(--blog-muted, #6b7280)"
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={labelColX}
              y={item.y}
              textAnchor="end"
              fill="var(--blog-ink, #1c2429)"
              fontSize={fs}
              style={{ paintOrder: "stroke fill", stroke: "var(--blog-bg, #fff)", strokeWidth: 4 }}
            >
              {item.label}
            </text>
          </g>
        ))}
        {hourTicks.map((h) => {
          const idx = h === 24 ? last : slotIndexForHour(data.slots, h);
          const xTick = h === 24 ? vb.L + vb.plotW : h === 0 ? vb.L : xAtIndex(idx, vb, n);
          const text = h === 24 ? "24 Uhr" : `${String(h).padStart(2, "0")}`;
          const anchor: "start" | "middle" | "end" = h === 0 ? "start" : h === 24 ? "end" : "middle";
          const labelX = h === 24 ? vb.L + vb.plotW - 2 : h === 0 ? vb.L : xAtIndex(slotIndexForHour(data.slots, h), vb, n);
          return (
            <g key={`x-${h}`}>
              <line
                x1={xTick}
                x2={xTick}
                y1={vb.T + vb.plotH}
                y2={vb.T + vb.plotH + 5}
                stroke="var(--blog-ink, #1c2429)"
                strokeWidth="1"
              />
              <text x={labelX} y={xAxisY} textAnchor={anchor} fill="var(--blog-muted, #6b7280)" fontSize={fsAxis}>
                {text}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="blog-media-caption">
        Mi 21.10.2026: beobachtet {data.observedPeakGw.toFixed(1).replace(".", ",")} GW um {data.observedPeakLabel}; Markt{" "}
        {data.pricePeakGw.toFixed(1).replace(".", ",")} GW um {data.pricePeakLabel}; gegen die Spitze maximal{" "}
        {data.peakCapGw.toFixed(1).replace(".", ",")} GW.
      </figcaption>
    </figure>
  );
}