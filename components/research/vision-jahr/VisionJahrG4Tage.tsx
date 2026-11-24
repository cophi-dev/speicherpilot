"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";

import { yAxisTickLabelDy } from "@/components/research/chartY";
import { VisionJahrChartFoot } from "@/components/research/vision-jahr/VisionJahrChartFoot";
import { formatVisionGermanDate, formatVisionGwWithUnit } from "@/lib/research/visionJahrFormat";
import { layoutG4KappeLabels } from "@/lib/research/visionG4Labels";
import { visionAxisFontSize } from "@/lib/research/visionChartMetrics";
import type { VisionJahrModel } from "@/lib/research/visionJahrTypes";

import styles from "@/components/research/research.module.css";

const Y_MIN = 40;
const Y_MAX = 75;
const PAD_LEFT = 40;
const PAD_RIGHT = 8;
const PAD_TOP = 32;
const PAD_BOTTOM = 62;

function yPos(gw: number, height: number) {
  const inner = height - PAD_TOP - PAD_BOTTOM;
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, gw));
  return PAD_TOP + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * inner;
}

export function VisionJahrG4Tage({ model, width, height }: { model: VisionJahrModel; width: number; height: number }) {
  const axisFs = visionAxisFontSize(width);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const barW = innerW / model.tagesspitzen.length;
  const kappeC = model.kappeNepCGw;
  const kappeAVal = model.kappeNepAGw;
  const annotIndex = model.tagesspitzen.findIndex((d) => d.tag === model.leerTagNepC);

  const monthTicks = useMemo(
    () => [
      { x: PAD_LEFT + 15 * barW, label: "Dez" },
      { x: PAD_LEFT + 45 * barW, label: "Feb" },
      { x: PAD_LEFT + 105 * barW, label: "Apr" },
      { x: PAD_LEFT + 165 * barW, label: "Jun" },
      { x: PAD_LEFT + 225 * barW, label: "Aug" },
      { x: PAD_LEFT + 285 * barW, label: "Okt" },
      { x: PAD_LEFT + 345 * barW, label: "Dez" },
    ],
    [barW]
  );

  const yTicks = [40, 45, 50, 55, 60, 65, 70, 75];
  const annot = annotIndex >= 0 ? model.tagesspitzen[annotIndex]! : null;
  const activeDay = activeIndex != null ? model.tagesspitzen[activeIndex]! : null;

  const pickIndex = useCallback(
    (clientX: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const xInSvg = ((clientX - rect.left) / rect.width) * width;
      const i = Math.max(0, Math.min(model.tagesspitzen.length - 1, Math.floor((xInSvg - PAD_LEFT) / barW)));
      setActiveIndex(i);
      const cx = ((PAD_LEFT + i * barW + barW / 2) / width) * rect.width;
      setTooltip({ x: cx, y: yPos(model.tagesspitzen[i]!.spitzeGw, height) * (rect.height / height) });
    },
    [barW, height, model.tagesspitzen, width]
  );

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    pickIndex(e.clientX);
  };

  const onPointerLeave = () => {
    setActiveIndex(null);
    setTooltip(null);
  };

  const kappeLabels = layoutG4KappeLabels(kappeC, kappeAVal, height);

  return (
    <div className={styles.g4ChartWrap} ref={wrapRef}>
      <div className={styles.g4KappeRow} aria-hidden={false}>
        {kappeLabels.map((label) => (
          <span key={label.key} className={styles.g4KappePill} style={{ marginTop: 0 }}>
            {label.text}
          </span>
        ))}
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.chartFixed} role="img" aria-label="Tageshöchstwerte über das Jahr">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(tick, height)} y2={yPos(tick, height)} stroke="var(--research-line)" />
            <text x={PAD_LEFT - 8} y={yPos(tick, height) + yAxisTickLabelDy(tick)} textAnchor="end" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {tick}
            </text>
          </g>
        ))}
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(kappeC, height)} y2={yPos(kappeC, height)} stroke="var(--research-fg)" strokeWidth={1.25} />
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(kappeAVal, height)} y2={yPos(kappeAVal, height)} stroke="var(--research-muted)" strokeDasharray="4 3" />
        {model.tagesspitzen.map((day, i) => {
          const x = PAD_LEFT + i * barW;
          const yTop = yPos(day.spitzeGw, height);
          const yBase = yPos(Y_MIN, height);
          const over = day.spitzeGw > kappeC;
          const w = Math.max(0.5, barW - 0.15);
          const isActive = i === activeIndex;
          return (
            <rect
              key={day.tag}
              x={x}
              y={yTop}
              width={w}
              height={Math.max(0, yBase - yTop)}
              fill={over ? "var(--research-accent)" : "var(--research-muted)"}
              opacity={isActive ? 1 : over ? 0.9 : 0.45}
            />
          );
        })}
        {annot ? (
          <g>
            <line
              x1={PAD_LEFT + annotIndex * barW + barW / 2}
              y1={yPos(annot.spitzeGw, height) - 6}
              x2={PAD_LEFT + annotIndex * barW + barW / 2}
              y2={PAD_TOP + 8}
              stroke="var(--research-fg)"
              strokeWidth={1}
            />
            <text x={PAD_LEFT + annotIndex * barW + barW / 2 + 6} y={PAD_TOP + 18} fontSize={axisFs} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
              {formatVisionGermanDate(annot.tag).slice(0, 5)}.: Speicher leer
            </text>
          </g>
        ) : null}
        {monthTicks.map((tick) => (
          <text key={tick.label + tick.x} x={tick.x} y={height - 26} fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick.label}
          </text>
        ))}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={innerW}
          height={height - PAD_TOP - PAD_BOTTOM}
          fill="transparent"
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onPointerLeave={onPointerLeave}
          style={{ cursor: "crosshair", touchAction: "none" }}
        />
        <text x={width / 2} y={height - 8} textAnchor="middle" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          höchste Restlast des Tages [GW]
        </text>
      </svg>
      {activeDay && tooltip ? (
        <div className={styles.g4Tooltip} style={{ left: tooltip.x, top: tooltip.y - 8 }} role="status">
          {formatVisionGermanDate(activeDay.tag)} · {formatVisionGwWithUnit(activeDay.spitzeGw)} ·{" "}
          <Link href={`/tag/${activeDay.tag}`}>Tag öffnen</Link>
        </div>
      ) : null}
      <VisionJahrChartFoot />
      <p className={styles.meta}>Ziehen oder tippen auf die Fläche — nächster Tag · {model.tageNepCCount} Tage über NEP-C-Kappe, fast nur Okt–März</p>
    </div>
  );
}