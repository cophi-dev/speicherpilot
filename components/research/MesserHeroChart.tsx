"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";

import type { ResearchDayModel, ResearchFactor } from "@/lib/research/researchTypes";
import { labelBox, placePeakPointLabel } from "@/lib/chartLabelLayout";
import { formatResearchPeakPointLabel } from "@/lib/research/researchFormat";
import {
  collidesWithPath,
  labelBoxPx,
  linesWithinPx,
  placeLineEndLabel,
  type PlotPoint,
} from "@/lib/messerHeroLabels";
import {
  messerHeroAxis,
  messerHeroPlotBounds,
  messerHeroYMap,
} from "@/lib/research/messerHeroAxis";
import { useTypographicSvgFontSize } from "@/lib/svgTypographicFont";

import styles from "@/components/research/research.module.css";

const FACTORS: ResearchFactor[] = [2, 5, 10];
const PAD_X = 40;
const PAD_RIGHT = 44;
const MARGIN_COL_W = 48;
const HIT = 44;
const EQUIV_GW = 0.12;

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
  const fs = useTypographicSvgFontSize(svgRef, width, 12);

  const yAxis = useMemo(() => messerHeroAxis(model, factor), [model, factor]);
  const yMin = yAxis.min;
  const yMax = yAxis.max;

  const yMap = useCallback(
    (value: number) => messerHeroYMap(value, yMin, yMax, height),
    [height, yMax, yMin],
  );

  const stages = useMemo(() => FACTORS.map((f) => model.stages.find((s) => s.factor === f)!), [model.stages]);
  const active = model.stages.find((s) => s.factor === factor)!;
  const stage5 = model.stages.find((s) => s.factor === 5)!;
  const stage10 = model.stages.find((s) => s.factor === 10)!;

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
  const plotTop = messerHeroPlotBounds(height).top;
  const plotBottom = messerHeroPlotBounds(height).bottom;
  const labelX = width - PAD_RIGHT - 4;

  const pathPoints = useMemo((): PlotPoint[] => {
    return model.series.map((p, i) => ({
      x: xMap(i, n, width),
      y: yMap(p.residualGw),
    }));
  }, [model.series, n, width, yMap]);

  const line = pathPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const cappedPaths = useMemo(() => {
    const cap = active.capGw;
    const paths: string[] = [];
    let run: Array<{ x: number; y: number }> = [];
    const flush = () => {
      if (run.length < 2) {
        run = [];
        return;
      }
      const capY = yMap(cap);
      const top = run.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
      const bot = [...run].reverse().map((p) => `${p.x.toFixed(1)},${capY.toFixed(1)}`).join(" L");
      paths.push(`M${top} L${bot} Z`);
      run = [];
    };
    model.series.forEach((p, i) => {
      const x = xMap(i, n, width);
      const y = yMap(p.residualGw);
      if (p.residualGw > cap) run.push({ x, y });
      else flush();
    });
    flush();
    return paths;
  }, [active.capGw, model.series, n, width, yMap]);

  const peak = model.series[peakIdx]!;
  const px = xMap(peakIdx, n, width);
  const py = yMap(peak.residualGw);
  const capY = yMap(active.capGw);

  const five4hCapGw = model.peakGw - stage5.reduction4hGw;
  const x10eqX5_4h = Math.abs(stage10.capGw - five4hCapGw) < EQUIV_GW;
  const equivY = yMap(stage10.capGw);

  const ghostGw = model.peakGw - active.reduction4hGw;
  const ghostY = yMap(ghostGw);

  const showGhostLine =
    !linesWithinPx(ghostY, capY, 3) &&
    !(x10eqX5_4h && linesWithinPx(ghostY, equivY, 3));

  const peakLabelText = formatResearchPeakPointLabel(model.peakGw, model.peakTime);
  const peakLabelBase = placePeakPointLabel({
    pointX: px,
    pointY: py,
    text: peakLabelText,
    plotLeft: PAD_X,
    plotRight: width - MARGIN_COL_W,
    plotTop,
    topTickLabelBaselineY: yMap(yMax) + 4,
  });

  const peakLabel = useMemo(() => {
    const ySteps = [0, -16, 16, -32, 32];
    for (const dy of ySteps) {
      const y = peakLabelBase.y + dy;
      const box = labelBoxPx(peakLabelBase.x, y, peakLabelBase.anchor, peakLabelText, fs);
      if (!collidesWithPath(box, pathPoints, 6)) {
        return { ...peakLabelBase, y };
      }
    }
    return { ...peakLabelBase, y: peakLabelBase.y - 24 };
  }, [fs, pathPoints, peakLabelBase, peakLabelText]);

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
      const inner = height - 66;
      const gw = yMax - ((local.y - 26) / inner) * (yMax - yMin);
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
    [height, onFactor, stages, width, yMax, yMin],
  );

  const inactiveCaps = FACTORS.filter((f) => f !== factor).filter((f) => {
    if (x10eqX5_4h && f === 10) return false;
    const y = yMap(model.stages.find((s) => s.factor === f)!.capGw);
    if (linesWithinPx(y, capY, 3)) return false;
    if (x10eqX5_4h && linesWithinPx(y, equivY, 3)) return false;
    if (linesWithinPx(y, ghostY, 3)) return false;
    return true;
  });

  const endLabels = useMemo(() => {
    const items: Array<{ text: string; lineY: number; fill: string }> = [];
    if (x10eqX5_4h) {
      items.push({ text: "×10 = ×5 mit 4 h", lineY: equivY, fill: "var(--research-fg)" });
    }
    if (showGhostLine) {
      items.push({
        text: `×${factor} · 4 h`,
        lineY: ghostY,
        fill: "var(--research-muted)",
      });
    }
    return items.map((item) => {
      const placed = placeLineEndLabel({
        text: item.text,
        lineY: item.lineY,
        x: labelX,
        path: pathPoints,
        plotTop,
        plotBottom,
        fontSize: fs,
      });
      return { ...item, ...placed };
    });
  }, [equivY, factor, fs, ghostY, labelX, pathPoints, plotBottom, plotTop, showGhostLine, x10eqX5_4h]);

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
      {yAxis.ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD_X} x2={width - PAD_RIGHT} y1={yMap(tick)} y2={yMap(tick)} stroke="var(--research-line)" />
          <text
            x={32}
            y={yMap(tick) + 4}
            textAnchor="end"
            fontSize={fs}
            fill="var(--research-muted)"
            fontFamily="var(--font-jetbrains-mono)"
          >
            {Number.isInteger(tick) ? tick : tick.toFixed(1)}
          </text>
        </g>
      ))}
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
      <path d={line} fill="none" stroke="var(--research-fg)" strokeWidth={1.5} />
      {inactiveCaps.map((f) => {
        const y = yMap(model.stages.find((s) => s.factor === f)!.capGw);
        return (
          <line
            key={f}
            x1={PAD_X}
            x2={width - PAD_RIGHT}
            y1={y}
            y2={y}
            stroke="var(--research-dim)"
            strokeWidth={1}
            strokeDasharray="1 3"
          />
        );
      })}
      {showGhostLine ? (
        <line
          x1={PAD_X}
          x2={width - PAD_RIGHT}
          y1={ghostY}
          y2={ghostY}
          stroke="var(--research-muted)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.7}
        />
      ) : null}
      <motion.line
        x1={PAD_X}
        x2={width - PAD_RIGHT}
        initial={false}
        animate={{ y1: capY, y2: capY }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        stroke="var(--research-accent)"
        strokeWidth={2}
      />
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
      {endLabels.map((lab) => (
        <text
          key={lab.text}
          x={lab.x}
          y={lab.y}
          textAnchor={lab.anchor}
          fontSize={fs}
          fill={lab.fill}
          fontFamily="var(--font-jetbrains-mono)"
          className={styles.peakPointLabelText}
        >
          {lab.text}
        </text>
      ))}
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
          fontSize={fs}
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
        {FACTORS.map((f) => {
          if (x10eqX5_4h && f === 10) return null;
          const y = yMap(model.stages.find((s) => s.factor === f)!.capGw);
          const isOn = f === factor;
          return (
            <text
              key={f}
              x={width - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={isOn ? fs + 2 : fs}
              fontWeight={isOn ? 600 : 500}
              fill={isOn ? "var(--research-fg)" : "var(--research-muted)"}
              fontFamily="var(--font-jetbrains-mono)"
              className={isOn ? styles.peakPointLabelText : undefined}
              style={{ pointerEvents: "none" }}
            >
              ×{f}
            </text>
          );
        })}
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
            fontSize={fs}
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