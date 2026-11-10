"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import { reductionFromY, yFromReduction } from "@/components/research/chartY";
import { formatGwSenkung } from "@/lib/research/fleetBasis";
import type { VisionPageModel, VisionStageId } from "@/lib/research/researchTypes";

import styles from "@/components/research/research.module.css";

const Y_MAX = 20;
const X_MAX = 100;
const PAD_TOP = 36;
const PAD_BOTTOM = 92;
const HIT = 44;

function xPos(gw: number, width: number) {
  return 40 + (gw / X_MAX) * (width - 72);
}

export function VisionPlot({
  model,
  duration,
  stageId,
  onStage,
  guessMode,
  onGuessEnd,
  width,
  height,
}: {
  model: VisionPageModel;
  duration: "1.76" | "2" | "4";
  stageId: VisionStageId;
  onStage: (id: VisionStageId) => void;
  guessMode: boolean;
  onGuessEnd: (guessSenkung: number, truth: number) => void;
  width: number;
  height: number;
}) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [pathsReady, setPathsReady] = useState(!guessMode);
  const [guessY, setGuessY] = useState<number | null>(null);

  const trackY = height - 48;
  const yPos = useCallback(
    (reductionGw: number) => yFromReduction(reductionGw, Y_MAX, height, PAD_TOP, PAD_BOTTOM),
    [height]
  );

  const points = useMemo(
    () =>
      model.curve.map((p) => ({
        ...p,
        x: xPos(p.powerGw, width),
        y: yPos(p.senkungGw[duration]),
        y4: yPos(p.senkungGw["4"]),
      })),
    [model.curve, duration, width, yPos]
  );

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const path4 = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y4.toFixed(1)}`).join(" ");

  const stageIdx = points.findIndex((p) => p.id === stageId);
  const active = points[stageIdx]!;
  const nepB = points.find((p) => p.id === "nep-b")!;
  const x1 = points.find((p) => p.id === "x1")!;

  const snapStage = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
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
  const dragY = guessY ?? yPos(12);

  const plotLo = yPos(Y_MAX);
  const plotHi = yPos(0);

  return (
    <div
      className={styles.chartClip}
      style={guessMode && !showCurves ? { touchAction: "none" } : undefined}
    >
      <motion.div initial={false} animate={{ opacity: 1 }} transition={reduced ? { duration: 0 } : { duration: 0.6 }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={styles.chartFixed}
          role="img"
          aria-label="Vision Sättigung Oktober"
        >
          <text x={32} y={20} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            GW
          </text>
          {[0, 5, 10, 15, 20].map((tick) => (
            <g key={tick}>
              <line
                x1={40}
                x2={width - 16}
                y1={yPos(tick)}
                y2={yPos(tick)}
                stroke="var(--research-line)"
                opacity={guessMode && !showCurves ? 0.45 : 1}
              />
              <text x={32} y={yPos(tick) + 4} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
                {tick === 0 ? "0" : `−${tick}`}
              </text>
            </g>
          ))}
          {[0, 25, 50, 75, 100].map((gw) => (
            <line key={`vx-${gw}`} x1={xPos(gw, width)} x2={xPos(gw, width)} y1={plotHi} y2={plotLo} stroke="var(--research-line)" opacity={0.35} />
          ))}
          <line
            x1={xPos(model.commitmentsGw, width)}
            x2={xPos(model.commitmentsGw, width)}
            y1={plotHi}
            y2={plotLo}
            stroke="var(--research-muted)"
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <text x={width - 20} y={24} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
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
              <text x={Math.min(x1.x + 10, width - 96)} y={Math.max(x1.y + 16, plotHi + 12)} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
                ×1 = 0
              </text>
            </>
          )}
          {stageId === active.id && showCurves ? (
            <line x1={active.x} x2={active.x} y1={plotHi} y2={plotLo} stroke="var(--research-accent)" strokeWidth={1.5} opacity={0.6} />
          ) : null}
          {guessMode && !showCurves ? (
            <>
              <rect
                x={nepB.x - HIT / 2}
                y={dragY - HIT / 2}
                width={HIT}
                height={HIT}
                fill="transparent"
                style={{ touchAction: "none", cursor: "ns-resize" }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!(e.target as Element).hasPointerCapture(e.pointerId)) return;
                  const svg = svgRef.current;
                  if (!svg) return;
                  const pt = svg.createSVGPoint();
                  pt.x = nepB.x;
                  pt.y = e.clientY;
                  const ctm = svg.getScreenCTM();
                  if (!ctm) return;
                  const local = pt.matrixTransform(ctm.inverse());
                  setGuessY(Math.max(yPos(Y_MAX), Math.min(yPos(0), local.y)));
                }}
                onPointerUp={(e) => {
                  if (!(e.target as Element).hasPointerCapture(e.pointerId)) return;
                  const y = guessY ?? yPos(12);
                  setPathsReady(true);
                  onGuessEnd(reductionFromY(y, Y_MAX, height, PAD_TOP, PAD_BOTTOM), guessTruth);
                }}
              />
              <circle cx={nepB.x} cy={dragY} r={8} fill="var(--research-accent)" stroke="var(--research-bg)" strokeWidth={2} style={{ pointerEvents: "none" }} />
              <text x={Math.min(nepB.x + 14, width - 8)} y={Math.max(dragY - 10, plotHi + 8)} fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
                zieh mich
              </text>
            </>
          ) : null}
          {guessY != null && guessMode && !showCurves ? (
            <text x={nepB.x} y={Math.min(dragY + 22, plotLo - 4)} textAnchor="middle" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
              Schätzung {formatGwSenkung(reductionFromY(dragY, Y_MAX, height, PAD_TOP, PAD_BOTTOM))}
            </text>
          ) : null}
          {[0, 25, 50, 75, 100].map((gw) => (
            <text key={gw} x={xPos(gw, width)} y={trackY - 20} textAnchor="middle" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {gw}
            </text>
          ))}
          <rect
            x={36}
            y={trackY - HIT / 2}
            width={width - 52}
            height={HIT}
            fill="transparent"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              snapStage(e.clientX);
            }}
            onPointerMove={(e) => {
              if (!(e.currentTarget as Element).hasPointerCapture(e.pointerId)) return;
              snapStage(e.clientX);
            }}
          />
          <line x1={40} x2={width - 16} y1={trackY} y2={trackY} stroke="var(--research-line)" strokeWidth={2} />
          <circle cx={active.x} cy={trackY} r={10} fill="var(--research-accent)" style={{ pointerEvents: "none" }} />
          {points
            .filter((p) => p.id !== "x1")
            .map((p) => (
              <text
                key={p.id}
                x={p.x}
                y={height - 14}
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
    </div>
  );
}
