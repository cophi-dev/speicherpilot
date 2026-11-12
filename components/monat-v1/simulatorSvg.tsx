import type { ReactNode } from "react";

/** Knockout-Rechteck hinter Schrift, Flächenfarbe, Deckkraft 0,90. */
export function Knockout({
  x,
  y,
  width,
  height,
  fill,
  opacity = 0.9,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
}) {
  return <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={opacity} aria-hidden="true" />;
}

export function SvgText({
  x,
  y,
  fill,
  anchor = "start",
  weight = 400,
  size = 12,
  children,
}: {
  x: number;
  y: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  size?: number;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill}
      fontSize={size}
      fontWeight={weight}
    >
      {children}
    </text>
  );
}

/** Zweizeiliges Label, Zeilenabstand 18 px, Knockout, Anker am Punkt. */
export function TwoLineLabel({
  x,
  y1,
  line1,
  line2,
  anchor,
  fill,
  bg,
}: {
  x: number;
  y1: number;
  line1: string;
  line2: string;
  anchor: "start" | "middle" | "end";
  fill: string;
  bg: string;
}) {
  const wch = Math.max(line1.length, line2.length) * 7.3 + 8;
  const kx = anchor === "end" ? x - wch : anchor === "middle" ? x - wch / 2 : x - 4;
  return (
    <g>
      <Knockout x={kx} y={y1 - 12} width={wch + 4} height={36} fill={bg} opacity={0.9} />
      <SvgText x={x} y={y1} fill={fill} anchor={anchor} weight={500}>
        {line1}
      </SvgText>
      <SvgText x={x} y={y1 + 18} fill={fill} anchor={anchor} weight={400}>
        {line2}
      </SvgText>
    </g>
  );
}

export function HatchDefs({
  id,
  color,
  bg,
}: {
  id: string;
  color: string;
  bg?: string;
}) {
  return (
    <defs>
      <pattern
        id={`hatch-${id}`}
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        {bg ? <rect width="7" height="7" fill={bg} /> : null}
        <line x1="0" y1="0" x2="0" y2="7" stroke={color} strokeWidth="1.25" />
      </pattern>
      <pattern
        id={`hatch-soc-${id}`}
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="0.9" opacity="0.55" />
      </pattern>
    </defs>
  );
}
