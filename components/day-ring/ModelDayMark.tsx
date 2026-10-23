import { pxToUser } from "@/lib/dayRingScale";

/** Centre stamp. It lives in the ring SVG so a crop of the ring still shows it. */
export function ModelDayMark({
  pill,
  figure,
  unit,
  note,
  viewWidth,
  framePx,
}: {
  pill: string;
  figure: string;
  unit: string;
  note: readonly string[];
  viewWidth: number;
  framePx: number;
}) {
  const u = (px: number) => pxToUser(px, viewWidth, framePx);
  const pillSize = u(12);
  const figSize = u(26);
  const unitSize = u(12);
  const noteSize = u(11);
  const gap = u(5);
  const padX = u(8);
  const padY = u(3);
  const pillW = pillSize * 0.66 * pill.length + pillSize * 0.08 * Math.max(0, pill.length - 1) + padX * 2;
  const pillH = pillSize + padY * 2;
  const noteStep = noteSize * 1.35;
  const block = pillH + gap + figSize + u(2) + unitSize + gap + note.length * noteStep;
  let top = -block / 2;
  const pillY = top;
  top += pillH + gap;
  const figY = top + figSize / 2;
  top += figSize + u(2);
  const unitY = top + unitSize / 2;
  top += unitSize + gap;

  return (
    <g className="day-model-mark">
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
