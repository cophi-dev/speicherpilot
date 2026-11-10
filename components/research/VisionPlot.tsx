"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import type { VisionPageModel, VisionStageId } from "@/lib/research/researchTypes";
import { formatGwSenkung } from "@/lib/research/fleetBasis";

const WIDTH = 350;
const HEIGHT = 280;
const TRACK_Y = HEIGHT + 22;
const X_MAX = 100;

function xPos(gw: number) {
  return 40 + (gw / X_MAX) * (WIDTH - 72);
}

function yPos(senkungGw: number) {
  return 28 + (senkungGw / 20) * (HEIGHT - 72);
}

function LabelLeader({
  x1,
  y1,
  x2,
  y2,
  children,
  anchor = "start",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  children: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--research-muted)" strokeWidth={1} />
      <text x={x2} y={y2} textAnchor={anchor} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        {children}
      </text>
    </g>
  );
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
  const x1 = points.find((p) => p.id === "x1")!;

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
  const showCurves = pathsReady || !guessMode;
  const dragY = guessY ?? yPos(-12);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.6 }}
    >
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT + 52}`} role="img" aria-label="Vision Sättigung Oktober" style={{ overflow: "visible" }}>
        <text x={32} y={16} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          GW
        </text>
        {[0, -5, -10, -15, -20].map((tick) => (
          <g key={tick}>
            <line
              x1={40}
              x2={WIDTH - 16}
              y1={yPos(tick)}
              y2={yPos(tick)}
              stroke="var(--research-line)"
              opacity={guessMode && !showCurves ? 0.45 : 1}
            />
            <text x={32} y={yPos(tick) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {tick}
            </text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((gw) => (
          <line
            key={`vx-${gw}`}
            x1={xPos(gw)}
            x2={xPos(gw)}
            y1={26}
            y2={HEIGHT - 16}
            stroke="var(--research-line)"
            opacity={0.35}
          />
        ))}
        <line
          x1={xPos(model.commitmentsGw)}
          x2={xPos(model.commitmentsGw)}
          y1={26}
          y2={HEIGHT - 16}
          stroke="var(--research-muted)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <text x={WIDTH - 18} y={20} textAnchor="end" fontSize={10} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          ≥ {model.commitmentsGw} GW Zusagen*
        </text>
        {showCurves ? (
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
                </g>
              );
            })}
          </>
        ) : (
          <>
            <circle cx={x1.x} cy={x1.y} r={4} fill="var(--research-fg)" opacity={0.65} />
            <text x={x1.x + 38} y={x1.y - 6} textAnchor="start" fontSize={11} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              ×1 = 0
            </text>
          </>
        )}
        {stageId === active.id && showCurves ? (
          <line x1={active.x} x2={active.x} y1={26} y2={HEIGHT - 20} stroke="var(--research-accent)" strokeWidth={1.5} opacity={0.6} />
        ) : null}
        {guessMode && !showCurves ? (
          <>
            <circle
              ref={dragRef}
              cx={nepB.x}
              cy={dragY}
              r={9}
              fill="var(--research-accent)"
              stroke="var(--research-bg)"
              strokeWidth={2}
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
                const guessed = guessedFromY(y);
                setPathsReady(true);
                onGuessEnd(guessed, -guessTruth);
              }}
            />
            <LabelLeader x1={nepB.x + 10} y1={dragY - 4} x2={nepB.x + 56} y2={dragY - 18} anchor="start">
              zieh mich
            </LabelLeader>
          </>
        ) : null}
        {guessY != null && guessMode && !showCurves ? (
          <text x={nepB.x - 8} y={dragY + 20} textAnchor="end" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
            Schätzung {formatGwSenkung(-guessedFromY(dragY))}
          </text>
        ) : null}
        {[0, 25, 50, 75, 100].map((gw, i) => (
          <text
            key={gw}
            x={xPos(gw)}
            y={HEIGHT - 8 + (i % 2) * 0}
            textAnchor="middle"
            fontSize={11}
            fill="var(--research-muted)"
            fontFamily="var(--font-jetbrains-mono)"
          >
            {gw}
          </text>
        ))}
        <rect
          x={36}
          y={TRACK_Y - 6}
          width={WIDTH - 52}
          height={34}
          fill="transparent"
          onPointerDown={(e) => {
            snapStage(e.clientX);
          }}
        />
        <line x1={40} x2={WIDTH - 16} y1={TRACK_Y} y2={TRACK_Y} stroke="var(--research-line)" strokeWidth={2} />
        <circle
          cx={active.x}
          cy={TRACK_Y}
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
        {points
          .filter((p) => p.id !== "x1")
          .map((p) => (
            <text
              key={p.id}
              x={p.x}
              y={TRACK_Y + 18}
              textAnchor="middle"
              fontSize={12}
              fill={p.id === stageId ? "var(--research-fg)" : "var(--research-muted)"}
              fontFamily="var(--font-jetbrains-mono)"
            >
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
