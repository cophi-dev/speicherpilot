"use client";

import { useEffect, useRef, useState } from "react";

import { formatMonatLabel } from "@/lib/bessKarte3d/logic";
import type { MonatKumuliertEintrag } from "@/lib/bessKarte3d/types";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

type Props = {
  kurve: readonly MonatKumuliertEintrag[];
  activeIndex: number;
  onChangeIndex: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  mappedSitesCount: number;
};

/** Höhe der Plotfläche in px. Das SVG rechnet in echten Pixeln (viewBox = gemessene Breite),
 * damit Slider und Kurve exakt dieselbe x-Skala haben und Schrift nicht mitskaliert. */
const PLOT_H = 84;
const TICK_PX = 13;
const PAD_L = 22;
const PAD_T = 10;
const PAD_B = 22;
/** Platz rechts für den Endwert am Linienende. */
const PAD_R = 66;
/** Halbe Breite des nativen Range-Thumbs; der Slider wird um diesen Betrag nach außen versetzt,
 * damit die Thumb-Mitte genau über dem Kurvenpunkt steht. */
const THUMB_HALF = 8;

export function BessKarteTimeline({
  kurve,
  activeIndex,
  onChangeIndex,
  isPlaying,
  onTogglePlay,
  mappedSitesCount,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [chartW, setChartW] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setChartW((prev) => (prev === w ? prev : w));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (kurve.length === 0) return null;

  const safeIdx = Math.max(0, Math.min(kurve.length - 1, activeIndex));
  const current = kurve[safeIdx]!;
  const last = kurve[kurve.length - 1]!;
  const maxMw = Math.max(...kurve.map((d) => d.kumNettoMw), 100);
  const CHART_H = PAD_T + PLOT_H + PAD_B;
  const plotW = Math.max(40, chartW - PAD_L - PAD_R);
  const plotH = PLOT_H;
  const denom = Math.max(1, kurve.length - 1);

  const xAt = (i: number) => PAD_L + (i / denom) * plotW;
  const yAt = (mw: number) => PAD_T + plotH - (mw / maxMw) * plotH;

  const linePath = kurve
    .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(d.kumNettoMw).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L${xAt(kurve.length - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${PAD_L.toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;

  // Jahres-Ticks im Januar; bei schmaler Breite nur gerade Jahre.
  const everyYear = plotW >= 420;
  const yearTicks: Array<{ idx: number; label: string }> = [];
  for (let i = 0; i < kurve.length; i += 1) {
    const m = kurve[i]!.monat;
    if (m.endsWith("-01")) {
      const y = Number(m.slice(0, 4));
      if (everyYear || y % 2 === 0) yearTicks.push({ idx: i, label: String(y) });
    }
  }

  function scrubFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * chartW;
    const frac = Math.max(0, Math.min(1, (svgX - PAD_L) / plotW));
    const idx = Math.round(frac * (kurve.length - 1));
    onChangeIndex(idx);
  }

  const activeX = xAt(safeIdx);
  const activeY = yAt(current.kumNettoMw);
  // Endwert direkt aus den Daten (letzter Monat der Reihe), kein Achsen-Tick.
  const endLabel = last.kumNettoMw >= 1000
    ? insertDisplayUnitNbsp(formatQuantityUnit(last.kumNettoMw / 1000, "de", 2, "GW"))
    : insertDisplayUnitNbsp(formatQuantityUnit(last.kumNettoMw, "de", 0, "MW"));

  return (
    <div className={styles.timelineBox}>
      <div className={styles.timelineTopRow}>
        <button
          type="button"
          className={styles.playBtn}
          onClick={onTogglePlay}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? "Zeitachse pausieren" : "Zeitachse abspielen"}
        >
          <span aria-hidden="true">{isPlaying ? "❚❚" : "▶"}</span>
          <span>{isPlaying ? "Pause" : "Abspielen"}</span>
        </button>

        <div className={styles.timelineStatus}>
          <strong className="num">{formatMonatLabel(current.monat)}</strong>
          <span className="num">
            {current.kumNettoMw >= 1000
              ? insertDisplayUnitNbsp(formatQuantityUnit(current.kumNettoMw / 1000, "de", 2, "GW"))
              : insertDisplayUnitNbsp(formatQuantityUnit(current.kumNettoMw, "de", 1, "MW"))}{" "}
            netto ·{" "}
            {current.kumKapMwh >= 1000
              ? insertDisplayUnitNbsp(formatQuantityUnit(current.kumKapMwh / 1000, "de", 2, "GWh"))
              : insertDisplayUnitNbsp(formatQuantityUnit(current.kumKapMwh, "de", 0, "MWh"))}{" "}
            · {formatQuantity(current.kumN, "de", 0)} Einheiten ({formatQuantity(mappedSitesCount, "de", 0)} Lokationen kartiert)
          </span>
        </div>
      </div>

      <div
        className={styles.sliderRow}
        style={{ paddingLeft: PAD_L - THUMB_HALF, paddingRight: PAD_R - THUMB_HALF }}
      >
        <input
          type="range"
          className={styles.timelineSlider}
          min={0}
          max={kurve.length - 1}
          step={1}
          value={safeIdx}
          onChange={(e) => onChangeIndex(Number(e.target.value))}
          aria-label="Monat auf der Zeitachse wählen"
          aria-valuetext={`${formatMonatLabel(current.monat)}, ${formatQuantity(current.kumNettoMw, "de", 1)} MW netto`}
        />
      </div>

      <div className={styles.curveWrap} ref={wrapRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartW} ${CHART_H}`}
          width={chartW}
          height={CHART_H}
          className={styles.curveSvg}
          role="img"
          aria-label={`Kumulierte Nettoleistung Dezember 2017 bis ${formatMonatLabel(last.monat)}`}
          onPointerDown={(e) => {
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) scrubFromClientX(e.clientX);
          }}
          onPointerUp={(e) => {
            draggingRef.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        >
          <line
            x1={PAD_L}
            y1={PAD_T + plotH}
            x2={PAD_L + plotW}
            y2={PAD_T + plotH}
            className={styles.curveAxis}
          />
          <text x={PAD_L - 6} y={PAD_T + plotH} textAnchor="end" className={styles.curveTickLabel}
              style={{ fontSize: TICK_PX }}>
            0
          </text>

          <path d={areaPath} className={styles.curveArea} />
          <path d={linePath} className={styles.curveLine} />

          <line
            x1={activeX}
            y1={PAD_T}
            x2={activeX}
            y2={PAD_T + plotH}
            className={styles.curveCursor}
          />
          <circle cx={activeX} cy={activeY} r={4.5} className={styles.curveDot} />
          <text
            x={xAt(kurve.length - 1) + 8}
            y={yAt(last.kumNettoMw) + TICK_PX * 0.35}
            textAnchor="start"
            className={styles.curveEndLabel}
            style={{ fontSize: TICK_PX }}
          >
            {endLabel}
          </text>

          {yearTicks.map((t) => (
            <text
              key={t.label}
              x={xAt(t.idx)}
              y={CHART_H - 5}
              textAnchor="middle"
              className={styles.curveTickLabel}
              style={{ fontSize: TICK_PX }}
            >
              {t.label}
            </text>
          ))}
        </svg>
        <p className={`${styles.curveNote} num`}>
          Kumulierte Nettoleistung (Sockel Ende 2017 → Nov 2026; Stand 24.11.2026, November unvollständig durch Nachmeldungen).
        </p>
      </div>
    </div>
  );
}
