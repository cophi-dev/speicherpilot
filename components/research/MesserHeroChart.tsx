"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ResearchDayModel, ResearchFactor } from "@/lib/research/researchTypes";
import { labelBox, placePeakPointLabel } from "@/lib/chartLabelLayout";
import { formatResearchPeakPointLabel } from "@/lib/research/researchFormat";
import {
  collidesWithPolyline,
  gutterReserveWidth,
  labelBoxPx,
  linesWithinPx,
  placeLineEndLabel,
  stackGutterLabels,
  type GutterLabelCandidate,
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
  const [typoScale, setTypoScale] = useState(1);

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

  const gutterTexts = useMemo(
    () => [
      ...(x10eqX5_4h ? ["×10 = ×5 mit 4 h"] : []),
      ...(showGhostLine ? [`×${factor} · 4 h`] : []),
      ...FACTORS.filter((f) => !(x10eqX5_4h && (f === 10 || f === 5)) && !(showGhostLine && f === factor)).map(
        (f) => `×${f}`,
      ),
    ],
    [factor, showGhostLine, x10eqX5_4h],
  );

  const [viewBoxW, setViewBoxW] = useState(() => width + gutterReserveWidth(gutterTexts, 12, MARGIN_COL_W, 12));
  const fs = useTypographicSvgFontSize(svgRef, viewBoxW, 12);
  useLayoutEffect(() => {
    const next = width + gutterReserveWidth(gutterTexts, fs, MARGIN_COL_W, 12);
    if (Math.abs(next - viewBoxW) > 0.01) setViewBoxW(next);
  }, [fs, gutterTexts, viewBoxW, width]);
  const plotRight = width - PAD_RIGHT;
  const gutterX = viewBoxW - 8;

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el || viewBoxW <= 0) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const vbW = el.viewBox.baseVal.width || viewBoxW;
      if (w > 0) setTypoScale(w / vbW);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewBoxW]);

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
      if (!collidesWithPolyline(box, pathPoints, 2)) {
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
      pt.x = viewBoxW - MARGIN_COL_W / 2;
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
    [height, viewBoxW, onFactor, stages, yMax, yMin],
  );

  const inactiveCaps = FACTORS.filter((f) => f !== factor).filter((f) => {
    if (x10eqX5_4h && f === 10) return false;
    const y = yMap(model.stages.find((s) => s.factor === f)!.capGw);
    if (linesWithinPx(y, capY, 3)) return false;
    if (x10eqX5_4h && linesWithinPx(y, equivY, 3)) return false;
    if (linesWithinPx(y, ghostY, 3)) return false;
    return true;
  });

  const gutterLabelsBase = useMemo(() => {
    const candidates: GutterLabelCandidate[] = [];
    if (x10eqX5_4h) {
      const placed = placeLineEndLabel({
        text: "×10 = ×5 mit 4 h",
        lineY: equivY,
        x: labelX,
        path: pathPoints,
        plotLeft: PAD_X,
        plotRight,
        plotTop,
        plotBottom,
        fontSize: fs,
        gutterX,
      });
      candidates.push({
        key: "unified",
        text: "×10 = ×5 mit 4 h",
        preferredY: placed.y,
        fontSize: fs,
        fill: "var(--research-fg)",
        lineY: equivY,
      });
    }
    if (showGhostLine) {
      const placed = placeLineEndLabel({
        text: `×${factor} · 4 h`,
        lineY: ghostY,
        x: labelX,
        path: pathPoints,
        plotLeft: PAD_X,
        plotRight,
        plotTop,
        plotBottom,
        fontSize: fs,
        gutterX,
      });
      candidates.push({
        key: "ghost",
        text: `×${factor} · 4 h`,
        preferredY: placed.y,
        fontSize: fs,
        fill: "var(--research-muted)",
        lineY: ghostY,
      });
    }
    FACTORS.forEach((f) => {
      if (x10eqX5_4h && (f === 10 || f === 5)) return;
      if (showGhostLine && f === factor) return;
      const y = yMap(model.stages.find((s) => s.factor === f)!.capGw);
      candidates.push({
        key: `factor-${f}`,
        text: `×${f}`,
        preferredY: y + 4,
        fontSize: f === factor ? fs + 2 : fs,
        fill: f === factor ? "var(--research-fg)" : "var(--research-muted)",
        isBold: f === factor,
      });
    });
    return stackGutterLabels(candidates, gutterX, 4, typoScale, plotRight);
  }, [
    equivY,
    factor,
    fs,
    ghostY,
    gutterX,
    labelX,
    model.stages,
    pathPoints,
    plotBottom,
    plotRight,
    plotTop,
    showGhostLine,
    typoScale,
    x10eqX5_4h,
    yMap,
  ]);

  const [gutterDy, setGutterDy] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || typoScale <= 0) return;
    const entries = gutterLabelsBase
      .map((lab) => {
        const el = svg.querySelector(`[data-gutter-key="${lab.key}"]`);
        return el ? { lab, el: el as SVGTextElement } : null;
      })
      .filter((x): x is { lab: (typeof gutterLabelsBase)[0]; el: SVGTextElement } => !!x);
    if (entries.length === 0) return;
    for (const { lab, el } of entries) {
      el.setAttribute("y", String(lab.y));
    }
    const sorted = [...entries].sort((a, b) => a.lab.y - b.lab.y);
    const minGapPx = 4;
    const dy: Record<string, number> = {};
    let lastBottom = -Infinity;
    for (const { lab, el } of sorted) {
      const bb = el.getBoundingClientRect();
      if (bb.top < lastBottom + minGapPx) {
        const shiftUser = (lastBottom + minGapPx - bb.top) / typoScale;
        dy[lab.key] = shiftUser;
        el.setAttribute("y", String(lab.y + shiftUser));
        lastBottom = el.getBoundingClientRect().bottom;
      } else {
        lastBottom = bb.bottom;
      }
    }
    setGutterDy((prev) => {
      const same =
        Object.keys(dy).length === Object.keys(prev).length && Object.keys(dy).every((k) => prev[k] === dy[k]);
      return same ? prev : dy;
    });
  }, [gutterLabelsBase, typoScale, viewBoxW, fs]);

  const gutterLabels = useMemo(
    () => gutterLabelsBase.map((lab) => ({ ...lab, y: lab.y + (gutterDy[lab.key] ?? 0) })),
    [gutterDy, gutterLabelsBase],
  );

  const gripTop = 20;
  const gripH = height - 60;
  const zoneH = gripH / 3;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxW} ${height}`}
      className={styles.chartFixed}
      style={{ overflow: "visible" }}
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
      {gutterLabels.map((lab) => (
        <g key={lab.key}>
          {lab.leader ? (
            <line
              x1={lab.leader.x1}
              y1={lab.leader.y1}
              x2={lab.leader.x2}
              y2={lab.leader.y2}
              stroke={lab.fill}
              strokeWidth={1}
              opacity={0.55}
            />
          ) : null}
          <text
            data-gutter-key={lab.key}
            x={lab.x}
            y={lab.y}
            textAnchor={lab.anchor}
            fontSize={lab.fontSize}
            fontWeight={lab.isBold ? 600 : 500}
            fill={lab.fill}
            fontFamily="var(--font-jetbrains-mono)"
            className={lab.isBold ? styles.peakPointLabelText : undefined}
            style={
              lab.leader
                ? { paintOrder: "stroke fill", stroke: "hsl(var(--background))", strokeWidth: 3 }
                : undefined
            }
          >
            {lab.text}
          </text>
        </g>
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
            x={viewBoxW - MARGIN_COL_W}
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