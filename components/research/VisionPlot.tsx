"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import type { VisionCurvePoint, VisionPageModel, VisionStageId } from "@/lib/research/researchTypes";
import { formatGwSenkung } from "@/lib/research/fleetBasis";

const WIDTH = 350;
const HEIGHT = 280;
const X_MAX = 100;

function xPos(gw: number) {
  return 40 + (gw / X_MAX) * (WIDTH - 72);
}

function yPos(senkungGw: number) {
  return 28 + (senkungGw / 20) * (HEIGHT - 72);
}

export function VisionPlot({
  model,
  duration,
  stageId,
  onStage,
  guessMode,
  onGuessEnd,
}: {
  model: VisionPageModel;
  duration: "1.76" | "2" | "4";
  stageId: VisionStageId;
  onStage: (id: VisionStageId) => void;
  guessMode: boolean;
  onGuessEnd: (guessSenkung: number, truth: number) => void;
}) {
  const reduced = useReducedMotion();
  const [pathsReady, setPathsReady] = useState(!guessMode);
  const [guessY, setGuessY] = useState<number | null>(null);
  const dragRef = useRef<SVGCircleElement | null>(null);

  const points = useMemo(
    () =>
      model.curve.map((p) => ({
        ...p,
        x: xPos(p.powerGw),
        y: yPos(-p.senkungGw[duration]),
        y4: yPos(-p.senkungGw["4"]),
      })),
    [model.curve, duration]
  );

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const path4 = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y4.toFixed(1)}`).join(" ");

  const stageIdx = points.findIndex((p) => p.id === stageId);
  const active = points[stageIdx]!;
  const nepB = points.find((p) => p.id === "nep-b")!;

  const snapStage = useCallback(
    (clientX: number) => {
      const svg = dragRef.current?.ownerSVGElement;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = 0;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      let best: VisionStageId = "nep-b";
      let bestD = Infinity;
      for (const p of points) {
        if (p.id === "x1") continue;
        const d = Math.abs(p.x - local.x);
        if (d < bestD) {
          bestD = d;
          best = p.id as VisionStageId;
        }
      }
      onStage(best);
    },
    [onStage, points]
  );

  const guessTruth = nepB.senkungGw[duration];

  return (
    <motion.div
      initial={false}
      animate={{ opacity: pathsReady || !guessMode ? 1 : 0.35 }}
      transition={reduced ? { duration: 0 } : { duration: 0.6 }}
    >
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT + 56}`} role="img" aria-label="Vision Sättigung Oktober">
        <text x={32} y={16} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          GW
        </text>
        {[0, -5, -10, -15, -20].map((tick) => (
          <g key={tick}>
            <line x1={40} x2={WIDTH - 16} y1={yPos(tick)} y2={yPos(tick)} stroke="var(--research-line)" />
            <text x={32} y={yPos(tick) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {tick}
            </text>
          </g>
        ))}
        <line x1={xPos(model.commitmentsGw)} x2={xPos(model.commitmentsGw)} y1={26} y2={HEIGHT - 16} stroke="var(--research-muted)" strokeDasharray="4 3" strokeWidth={1} />
        <text x={xPos(model.commitmentsGw) + 4} y={40} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          ≥ {model.commitmentsGw} GW Zusagen*
        </text>
        {(pathsReady || !guessMode) && (
          <>
            <path d={path4} fill="none" stroke="var(--research-muted)" strokeWidth={1.5} strokeDasharray="2 3" />
            <motion.path
              d={path}
              fill="none"
              stroke="var(--research-accent)"
              strokeWidth={2}
              initial={guessMode ? { pathLength: 0 } : { pathLength: 1 }}
              animate={{ pathLength: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.6 }}
            />
          </>
        )}
        {points.map((p) => {
          const isActive = p.id === stageId;
          const shape = p.id.startsWith("nep") ? "square" : "circle";
          return (
            <g key={p.id}>
              {shape === "square" ? (
                <rect
                  x={p.x - (isActive ? 5 : 4)}
                  y={p.y - (isActive ? 5 : 4)}
                  width={isActive ? 10 : 8}
                  height={isActive ? 10 : 8}
                  fill={isActive ? "var(--research-accent)" : "var(--research-fg)"}
                />
              ) : (
                <circle cx={p.x} cy={p.y} r={isActive ? 5 : 3.5} fill={isActive ? "var(--research-accent)" : "var(--research-fg)"} />
              )}
              <text x={p.x} y={HEIGHT - 30} textAnchor="middle" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
                {p.label}
              </text>
            </g>
          );
        })}
        {stageId === active.id && pathsReady ? (
          <line x1={active.x} x2={active.x} y1={26} y2={HEIGHT - 20} stroke="var(--research-accent)" strokeWidth={1.5} opacity={0.6} />
        ) : null}
        {guessMode ? (
          <circle
            ref={dragRef}
            cx={nepB.x}
            cy={guessY ?? yPos(-12)}
            r={8}
            fill="var(--research-accent)"
            style={{ touchAction: "none", cursor: "ns-resize" }}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!(e.target as Element).hasPointerCapture(e.pointerId)) return;
              const svg = dragRef.current?.ownerSVGElement;
              if (!svg) return;
              const pt = svg.createSVGPoint();
              pt.x = nepB.x;
              pt.y = e.clientY;
              const ctm = svg.getScreenCTM();
              if (!ctm) return;
              const local = pt.matrixTransform(ctm.inverse());
              setGuessY(Math.max(yPos(-20), Math.min(yPos(0), local.y)));
            }}
            onPointerUp={() => {
              const y = guessY ?? yPos(-12);
              const guessed = ((y - 28) / (HEIGHT - 72)) * 20;
              setPathsReady(true);
              onGuessEnd(guessed, -guessTruth);
            }}
          />
        ) : null}
        {guessY != null && guessMode ? (
          <text x={nepB.x + 12} y={guessY} fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
            Schätzung {formatGwSenkung(-guessedFromY(guessY))}
          </text>
        ) : null}
        {[0, 25, 50, 75, 100].map((gw) => (
          <text key={gw} x={xPos(gw)} y={HEIGHT - 12} textAnchor="middle" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {gw}
          </text>
        ))}
        <rect
          x={36}
          y={HEIGHT + 8}
          width={WIDTH - 52}
          height={36}
          fill="transparent"
          onPointerDown={(e) => {
            snapStage(e.clientX);
          }}
        />
        <line x1={40} x2={WIDTH - 16} y1={HEIGHT + 28} y2={HEIGHT + 28} stroke="var(--research-line)" strokeWidth={2} />
        <circle
          cx={active.x}
          cy={HEIGHT + 28}
          r={10}
          fill="var(--research-accent)"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!(e.target as Element).hasPointerCapture(e.pointerId)) return;
            snapStage(e.clientX);
          }}
        />
        {points.filter((p) => p.id !== "x1").map((p) => (
          <text key={p.id} x={p.x} y={HEIGHT + 48} textAnchor="middle" fontSize={12} fill={p.id === stageId ? "var(--research-fg)" : "var(--research-muted)"} fontFamily="var(--font-jetbrains-mono)">
            {p.label}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}

function guessedFromY(y: number): number {
  return ((y - 28) / (HEIGHT - 72)) * 20;
}
