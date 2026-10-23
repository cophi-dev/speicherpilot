"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { pxToUser } from "@/lib/dayRingScale";

/** Centre stamp. It lives in the ring SVG so a crop of the ring still shows it. */
export function ModelDayMark({
  pill,
  figure,
  unit,
  note,
  viewWidth,
  framePx,
  holeRadius,
}: {
  pill: string;
  figure: string;
  unit: string;
  note: readonly string[];
  viewWidth: number;
  framePx: number;
  /** State-of-charge inner edge, in user units. The stamp stays inside it. */
  holeRadius: number;
}) {
  const ref = useRef<SVGGElement>(null);
  const [scale, setScale] = useState(1);
  const [fitted, setFitted] = useState(false);
  const u = (px: number) => pxToUser(px, viewWidth, framePx);
  const pillSize = u(12) * scale;
  const figSize = u(26) * scale;
  const unitSize = u(12) * scale;
  const noteSize = u(11) * scale;
  const gap = u(5) * scale;
  const padX = u(8) * scale;
  const padY = u(3) * scale;
  const pillW = pillSize * 0.66 * pill.length + pillSize * 0.08 * Math.max(0, pill.length - 1) + padX * 2;
  const pillH = pillSize + padY * 2;
  const noteStep = noteSize * 1.35;
  const block = pillH + gap + figSize + u(2) * scale + unitSize + gap + note.length * noteStep;
  let top = -block / 2;
  const pillY = top;
  top += pillH + gap;
  const figY = top + figSize / 2;
  top += figSize + u(2) * scale;
  const unitY = top + unitSize / 2;
  top += unitSize + gap;

  useLayoutEffect(() => {
    const node = ref.current;
    const svg = node?.ownerSVGElement;
    if (!node || !svg || !(holeRadius > 0)) {
      return;
    }
    const measure = () => {
      const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
      const rect = node.getBoundingClientRect();
      if (!ctm || rect.width === 0 || rect.height === 0) {
        return;
      }
      const toRadius = (x: number, y: number) => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const user = point.matrixTransform(ctm.inverse());
        return Math.hypot(user.x, user.y);
      };
      const maxR = Math.max(
        toRadius(rect.left, rect.top),
        toRadius(rect.right, rect.top),
        toRadius(rect.left, rect.bottom),
        toRadius(rect.right, rect.bottom)
      );
      const limit = holeRadius - pxToUser(4, viewWidth, framePx);
      if (maxR > limit + 0.6) {
        setScale((current) => Math.max(0.4, current * (limit / maxR)));
        setFitted(false);
        return;
      }
      setFitted(true);
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [figure, framePx, holeRadius, note, pill, scale, unit, viewWidth]);

  return (
    <g ref={ref} className="day-model-mark" data-fitted={fitted ? "true" : "false"}>
      <rect
        className="day-model-pill"
        x={-pillW / 2}
        y={pillY}
        width={pillW}
        height={pillH}
        rx={pillH / 2}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <text className="day-model-pill-text" x={0} y={pillY + pillH / 2} fontSize={pillSize} textAnchor="middle" dominantBaseline="central">
        {pill}
      </text>
      <text className="day-model-figure" x={0} y={figY} fontSize={figSize} textAnchor="middle" dominantBaseline="central">
        {figure}
      </text>
      <text className="day-model-unit" x={0} y={unitY} fontSize={unitSize} textAnchor="middle" dominantBaseline="central">
        {unit}
      </text>
      {note.map((line, index) => (
        <text
          key={`${index}-${line}`}
          className="day-model-note"
          x={0}
          y={top + noteSize / 2 + index * noteStep}
          fontSize={noteSize}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
