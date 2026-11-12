"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";

import type { ResearchDayModel, ResearchFactor } from "@/lib/research/researchTypes";
import { labelBox, placePeakPointLabel } from "@/lib/chartLabelLayout";
import { formatResearchPeakPointLabel } from "@/lib/research/researchFormat";

import styles from "@/components/research/research.module.css";

const FACTORS: ResearchFactor[] = [2, 5, 10];
const Y_MIN = 45;
const Y_MAX = 70;
const PAD_X = 40;
const PAD_RIGHT = 44;
const MARGIN_COL_W = 48;
const HIT = 44;

function yMap(value: number, height: number) {
  const inner = height - 66;
  return 26 + ((Y_MAX - value) / (Y_MAX - Y_MIN)) * inner;
}

function xMap(index: number, n: number, width: number) {
  const inner = width - PAD_X - 36;
  return PAD_X + (index / Math.max(1, n - 1)) * inner;
}

function hourIndex(model: ResearchDayModel, h: number): number {
  if (h === 24) return model.series.length - 1;
  const idx = model.series.findIndex((p) => p.hour === h && p.minute === 0);
  return idx >= 0 ? idx : 0;
}

export function MesserHeroChart({
  model,
  factor,
  onFactor,
  width = 350,
  height = 342,
}: {
  model: ResearchDayModel;
  factor: ResearchFactor;
  onFactor: (f: ResearchFactor) => void;
  width?: number;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  const stages = useMemo(() => FACTORS.map((f) => model.stages.find((s) => s.factor === f)!), [model.stages]);
  const active = model.stages.find((s) => s.factor === factor)!;

  const peakIdx = useMemo(() => {
    let idx = 0;
    let max = 0;
    model.series.forEach((p, i) => {
      if (p.residualGw > max) {
        max = p.residualGw;
        idx = i;
      }
    });
    return idx;
  }, [model.series]);

  const n = model.series.length;

  const line = model.series
    .map((p, i) => `${i === 0 ? "M" : "L"}${xMap(i, n, width).toFixed(1)},${yMap(p.residualGw, height).toFixed(1)}`)
    .join(" ");

  const cappedPaths = useMemo(() => {
    const cap = active.capGw;
    const paths: string[] = [];
    let run: Array<{ x: number; y: number }> = [];
    const flush = () => {
      if (run.length < 2) {
        run = [];
        return;
      }
      const capY = yMap(cap, height);
      const top = run.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
      const bot = [...run].reverse().map((p) => `${p.x.toFixed(1)},${capY.toFixed(1)}`).join(" L");
      paths.push(`M${top} L${bot} Z`);
      run = [];
    };
    model.series.forEach((p, i) => {
      const x = xMap(i, n, width);
      const y = yMap(p.residualGw, height);
      if (p.residualGw > cap) run.push({ x, y });
      else flush();
    });
    flush();
    return paths;
  }, [active.capGw, height, model.series, n, width]);

  const peak = model.series[peakIdx]!;
  const px = xMap(peakIdx, n, width);
  const py = yMap(peak.residualGw, height);
  const capY = yMap(active.capGw, height);
  const ghost4hGw = model.peakGw - active.reduction4hGw;
  const ghost4hY = yMap(ghost4hGw, height);

  const peakLabelText = formatResearchPeakPointLabel(model.peakGw, model.peakTime);
  const peakLabel = placePeakPointLabel({
    pointX: px,
    pointY: py,
    text: peakLabelText,
    plotLeft: PAD_X,
    plotRight: width - MARGIN_COL_W,
    plotTop: 26,
    topTickLabelBaselineY: yMap(Y_MAX, height) + 4,
  });
  const peakLabelBox = labelBox(peakLabel.x, peakLabel.y, peakLabel.anchor, peakLabelText);

  const snapFromClientY = useCallback(
    (clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = width - MARGIN_COL_W / 2;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      const gw = Y_MAX - ((local.y - 26) / (height - 66)) * (Y_MAX - Y_MIN);
      const caps = stages.map((s) => s.capGw);
      let best = FACTORS[1]!;
      let bestDist = Infinity;
      FACTORS.forEach((f, i) => {
        const d = Math.abs(caps[i]! - gw);
        if (d < bestDist) {
          bestDist = d;
          best = f;
        }
      });
      onFactor(best);
    },
    [height, onFactor, stages, width]
  );

  const labelRows = FACTORS.map((f) => {
    const cap = model.stages.find((s) => s.factor === f)!.capGw;
    return { f, y: yMap(cap, height), active: f === factor };
  });

  const gripTop = 20;
  const gripH = height - 60;
  const zoneH = gripH / 3;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={styles.chartFixed}
      role="img"
      aria-label="Restlast national mit Kappung"
    >
      {[45, 50, 55, 60, 65, 70].map((tick) => (
        <g key={tick}>
          <line x1={PAD_X} x2={width - PAD_RIGHT} y1={yMap(tick, height)} y2={yMap(tick, height)} stroke="var(--research-line)" />
          <text x={32} y={yMap(tick, height) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick}
          </text>
        </g>
      ))}
      <line
        x1={PAD_X}
        x2={width - PAD_RIGHT}
        y1={ghost4hY}
        y2={ghost4hY}
        stroke="var(--research-muted)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      {cappedPaths.map((d, i) => (
        <motion.path
          key={`${factor}-${i}`}
          d={d}
          fill="color-mix(in srgb, var(--research-accent) 30%, transparent)"
          initial={false}
          animate={{ d }}
          transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        />
      ))}
      {labelRows.map(({ f, y, active: isOn }) => (
        <g key={f}>
          <line
            x1={PAD_X}
            x2={width - PAD_RIGHT}
            y1={y}
            y2={y}
            stroke={isOn ? "var(--research-accent)" : "var(--research-dim)"}
            strokeWidth={isOn ? 2 : 1}
            strokeDasharray={isOn ? undefined : "3 4"}
          />
        </g>
      ))}
      <path d={line} fill="none" stroke="var(--research-fg)" strokeWidth={1.5} />
      <circle cx={px} cy={py} r={3.5} fill="var(--research-fg)" />
      <motion.line
        x1={px}
        x2={px}
        initial={false}
        animate={{ y1: py, y2: capY }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        stroke="var(--research-accent)"
        strokeWidth={2}
      />
      <motion.line
        x1={PAD_X}
        x2={width - PAD_RIGHT}
        initial={false}
        animate={{ y1: capY, y2: capY }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        stroke="var(--research-accent)"
        strokeWidth={2}
      />
      <g aria-hidden="true">
        <rect
          className={styles.peakPointLabelBackdrop}
          x={peakLabelBox.left - 3}
          y={peakLabelBox.top - 2}
          width={peakLabelBox.right - peakLabelBox.left + 6}
          height={peakLabelBox.bottom - peakLabelBox.top + 4}
          rx={2}
        />
        <text
          x={peakLabel.x}
          y={peakLabel.y}
          textAnchor={peakLabel.anchor}
          fontSize={12}
          fill="var(--research-fg)"
          fontFamily="var(--font-jetbrains-mono)"
          className={styles.peakPointLabelText}
        >
          {peakLabelText}
        </text>
      </g>
      <g
        role="slider"
        aria-label="Das Messer: Stufe ×2 ×5 ×10"
        aria-valuemin={2}
        aria-valuemax={10}
        aria-valuenow={factor}
        tabIndex={0}
        onKeyDown={(e) => {
          const i = FACTORS.indexOf(factor);
          if (e.key === "ArrowUp" && i > 0) onFactor(FACTORS[i - 1]!);
          if (e.key === "ArrowDown" && i < FACTORS.length - 1) onFactor(FACTORS[i + 1]!);
        }}
      >
        {FACTORS.map((f, i) => (
          <rect
            key={f}
            x={width - MARGIN_COL_W}
            y={gripTop + i * zoneH}
            width={MARGIN_COL_W}
            height={Math.max(zoneH, HIT)}
            fill="transparent"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              onFactor(f);
              snapFromClientY(e.clientY);
            }}
            onPointerMove={(e) => {
              if (!(e.target as Element).hasPointerCapture(e.pointerId)) return;
              snapFromClientY(e.clientY);
            }}
          />
        ))}
        {labelRows.map(({ f, y, active: isOn }) => (
          <text
            key={f}
            x={width - 8}
            y={y + 4}
            textAnchor="end"
            fontSize={isOn ? 14 : 12}
            fontWeight={isOn ? 700 : 500}
            fill={isOn ? "var(--research-fg)" : "var(--research-muted)"}
            fontFamily="var(--font-jetbrains-mono)"
            style={{ pointerEvents: "none" }}
          >
            ×{f}
          </text>
        ))}
      </g>
      {[0, 6, 12, 18, 24].map((h) => {
        const idx = hourIndex(model, h);
        const x = xMap(idx, n, width);
        const label = h === 24 ? "24" : h === 0 ? "0" : String(h).padStart(2, "0");
        return (
          <text
            key={h}
            x={x}
            y={height - 6}
            textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
            fontSize={12}
            fill="var(--research-muted)"
            fontFamily="var(--font-jetbrains-mono)"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
