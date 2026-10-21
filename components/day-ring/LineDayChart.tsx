import { useId } from "react";

import { energyColor, LINE_GW_MAX, LINE_GW_MIN } from "@/lib/dayRingScale";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

const WIDTH = 800;
const HEIGHT = 320;
const PAD = { l: 48, r: 16, t: 16, b: 28 };

export function LineDayChart({
  points,
  label,
  ohneLabel,
  mitLabel,
}: {
  points: LiveDispatchPoint[];
  label: string;
  ohneLabel: string;
  mitLabel: string;
}) {
  const titleId = useId();
  const yOf = (gw: number) => {
    const span = LINE_GW_MAX - LINE_GW_MIN;
    const clamped = Math.min(LINE_GW_MAX, Math.max(LINE_GW_MIN, gw));
    return PAD.t + ((LINE_GW_MAX - clamped) / span) * (HEIGHT - PAD.t - PAD.b);
  };
  const xOf = (hour: number) => PAD.l + (hour / 24) * (WIDTH - PAD.l - PAD.r);
  const ticks = [-10, 0, 10, 20, 30, 40, 50];

  return (
    <svg className="day-line" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={titleId}>
      <title id={titleId}>{label}</title>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.l} x2={WIDTH - PAD.r} y1={yOf(tick)} y2={yOf(tick)} stroke={tick === 0 ? "#14181C" : "#14181C22"} strokeDasharray={tick === 0 ? "4 4" : undefined} />
          <text x={PAD.l - 8} y={yOf(tick) + 4} textAnchor="end" fill="#14181C" fontSize="12" fontFamily="var(--font-plex-mono), monospace">
            {tick}
          </text>
        </g>
      ))}
      {points.map((point) => {
        const gw = point.ohneMw / 1000;
        const x = xOf(point.hour);
        const width = Math.max(1, xOf(point.hour + 0.25) - x);
        return <rect key={point.hour} x={x} y={Math.min(yOf(0), yOf(gw))} width={width} height={Math.abs(yOf(gw) - yOf(0))} fill={energyColor(gw)} opacity="0.9" />;
      })}
      <path d={stepPath(points, xOf, yOf, "mitMw")} fill="none" stroke="#0A0F14" strokeWidth="2.5" />
      {[0, 6, 12, 18, 24].map((hour) => (
        <text key={hour} x={xOf(hour)} y={HEIGHT - 8} textAnchor={hour === 24 ? "end" : hour === 0 ? "start" : "middle"} fill="#14181C" fontSize="12" fontFamily="var(--font-plex-mono), monospace">
          {String(hour).padStart(2, "0")}
        </text>
      ))}
      <text x={PAD.l} y={14} fill="#14181C" fontSize="12" fontFamily="var(--font-plex-sans), sans-serif">
        {ohneLabel}
      </text>
      <text x={PAD.l + 150} y={14} fill="#14181C" fontSize="12" fontFamily="var(--font-plex-sans), sans-serif">
        {mitLabel}
      </text>
    </svg>
  );
}

function stepPath(
  points: LiveDispatchPoint[],
  xOf: (hour: number) => number,
  yOf: (gw: number) => number,
  key: "ohneMw" | "mitMw"
): string {
  let path = "";
  points.forEach((point, index) => {
    const y = yOf(point[key] / 1000);
    const x0 = xOf(point.hour);
    const x1 = xOf(Math.min(24, point.hour + 0.25));
    path += index === 0 ? `M ${x0.toFixed(1)} ${y.toFixed(1)}` : `L ${x0.toFixed(1)} ${y.toFixed(1)}`;
    path += ` L ${x1.toFixed(1)} ${y.toFixed(1)}`;
  });
  return path;
}
