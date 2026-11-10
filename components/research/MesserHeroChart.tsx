"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import type { ResearchDayModel, ResearchFactor } from "@/lib/research/researchTypes";

const FACTORS: ResearchFactor[] = [2, 5, 10];
const Y_MIN = 45;
const Y_MAX = 70;
const WIDTH = 350;
const HEIGHT = 342;
const PAD_X = 40;
const PAD_RIGHT = 44;
const MARGIN_COL_W = 44;

function yMap(value: number, height: number) {
  const inner = height - 66;
  return 26 + ((Y_MAX - value) / (Y_MAX - Y_MIN)) * inner;
}

function xMap(index: number, n: number) {
  const inner = WIDTH - PAD_X - 36;
  return PAD_X + (index / Math.max(1, n - 1)) * inner;
}

export function MesserHeroChart({
  model,
  factor,
  onFactor,
}: {
  model: ResearchDayModel;
  factor: ResearchFactor;
  onFactor: (f: ResearchFactor) => void;
}) {
  const reduced = useReducedMotion();
  const dragRef = useRef<SVGGElement | null>(null);
  const [dragging, setDragging] = useState(false);

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

  const line = model.series
    .map((p, i) => `${i === 0 ? "M" : "L"}${xMap(i, model.series.length).toFixed(1)},${yMap(p.residualGw, HEIGHT).toFixed(1)}`)
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
      const capY = yMap(cap, HEIGHT);
      const top = run.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
      const bot = [...run].reverse().map((p) => `${p.x.toFixed(1)},${capY.toFixed(1)}`).join(" L");
      paths.push(`M${top} L${bot} Z`);
      run = [];
    };
    model.series.forEach((p, i) => {
      const x = xMap(i, model.series.length);
      const y = yMap(p.residualGw, HEIGHT);
      if (p.residualGw > cap) run.push({ x, y });
      else flush();
    });
    flush();
    return paths;
  }, [active.capGw, model.series]);

  const peak = model.series[peakIdx]!;
  const px = xMap(peakIdx, model.series.length);
  const py = yMap(peak.residualGw, HEIGHT);
  const capY = yMap(active.capGw, HEIGHT);

  const snapFromClientY = useCallback(
    (clientY: number) => {
      const svg = dragRef.current?.ownerSVGElement;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = WIDTH - MARGIN_COL_W / 2;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      const gw = Y_MAX - ((local.y - 26) / (HEIGHT - 66)) * (Y_MAX - Y_MIN);
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
    [onFactor, stages]
  );

  const labelRows = FACTORS.map((f) => {
    const cap = model.stages.find((s) => s.factor === f)!.capGw;
    return { f, y: yMap(cap, HEIGHT), active: f === factor };
  });

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Restlast national mit Kappung">
      {[45, 50, 55, 60, 65, 70].map((tick) => (
        <g key={tick}>
          <line x1={PAD_X} x2={WIDTH - PAD_RIGHT} y1={yMap(tick, HEIGHT)} y2={yMap(tick, HEIGHT)} stroke="var(--research-line)" />
          {tick === 45 ? null : (
            <text x={32} y={yMap(tick, HEIGHT) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {tick}
            </text>
          )}
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
      {labelRows.map(({ f, y, active: isOn }) => (
        <g key={f}>
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_RIGHT}
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
      <text x={px - 4} y={py - 10} textAnchor="end" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
        {model.peakGw.toFixed(2).replace(".", ",")} GW · {model.peakTime}
      </text>
      <motion.line
        x1={px}
        x2={px}
        y1={py}
        animate={{ y2: capY }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        stroke="var(--research-accent)"
        strokeWidth={2}
      />
      <motion.line
        x1={PAD_X}
        x2={WIDTH - PAD_RIGHT}
        animate={{ y1: capY, y2: capY }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        stroke="var(--research-accent)"
        strokeWidth={2}
      />
      <g
        ref={dragRef}
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
        <rect
          x={WIDTH - MARGIN_COL_W}
          y={20}
          width={MARGIN_COL_W}
          height={HEIGHT - 60}
          fill="transparent"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            setDragging(true);
            (e.target as Element).setPointerCapture(e.pointerId);
            snapFromClientY(e.clientY);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            snapFromClientY(e.clientY);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        />
        {labelRows.map(({ f, y, active: isOn }) => (
          <text
            key={f}
            x={WIDTH - 6}
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
        const idx = Math.max(0, model.series.findIndex((p) => p.hour === h && p.minute === 0));
        const x = xMap(idx, model.series.length);
        return (
          <text
            key={h}
            x={x}
            y={HEIGHT - 4}
            textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
            fontSize={11}
            fill="var(--research-muted)"
            fontFamily="var(--font-jetbrains-mono)"
          >
            {h === 24 ? "24 h" : String(h)}
          </text>
        );
      })}
    </svg>
  );
}
