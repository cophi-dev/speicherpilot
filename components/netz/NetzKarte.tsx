import type { NetzDemoFile, NetzState } from "@/lib/netzDemo";

import styles from "./netz-demo.module.css";

const VIEW_W = 760;
const VIEW_H = 448;
const PAD_L = 28;
const PAD_R = 18;
const PAD_T = 28;
const ROW = 44;

type Point = { x: number; y: number; strang: number; depth: number };

const VOLTAGE_FILL = {
  low: "#4DA3FF",
  midlow: "#8CA3BA",
  mid: "#E1E6EA",
  midhigh: "#E6D2A8",
  high: "#FF8F1F",
} as const;

const TIP_FILL = ["#4DA3FF", "#8CA3BA", "#E1E6EA", "#E6D2A8", "#7DFCE6"] as const;

function voltageBand(pu: number): keyof typeof VOLTAGE_FILL {
  if (pu < 0.965) return "low";
  if (pu < 0.99) return "midlow";
  if (pu <= 1.03) return "mid";
  if (pu <= 1.055) return "midhigh";
  return "high";
}

function tipBand(mw: number): 0 | 1 | 2 | 3 | 4 {
  if (mw < 2) return 0;
  if (mw < 5) return 1;
  if (mw < 10) return 2;
  if (mw < 20) return 3;
  return 4;
}

function layout(data: NetzDemoFile): Map<number, Point> {
  const points = new Map<number, Point>();
  const strands = new Map<number, typeof data.tree>();
  let maxDepth = 1;
  for (const node of data.tree) {
    maxDepth = Math.max(maxDepth, node.depth);
    const list = strands.get(node.strang) ?? [];
    list.push(node);
    strands.set(node.strang, list);
  }
  const rows = [...strands.keys()].filter((strand) => strand > 0).sort((a, b) => a - b);
  const col = (VIEW_W - PAD_L - 36 - PAD_R) / maxDepth;
  const busbar = data.tree.find((node) => node.strang === 0);
  const mid = PAD_T + ((rows.length - 1) * ROW) / 2;
  if (busbar) {
    points.set(busbar.bus, { x: PAD_L + 8, y: mid, strang: 0, depth: 0 });
  }
  for (const [row, strand] of rows.entries()) {
    const byDepth = new Map<number, typeof data.tree>();
    for (const node of strands.get(strand) ?? []) {
      const group = byDepth.get(node.depth) ?? [];
      group.push(node);
      byDepth.set(node.depth, group);
    }
    for (const [depth, group] of byDepth) {
      group.sort((a, b) => a.bus - b.bus);
      group.forEach((node, index) => {
        const offset = (index - (group.length - 1) / 2) * 12;
        points.set(node.bus, {
          x: PAD_L + 36 + depth * col,
          y: PAD_T + row * ROW + offset,
          strang: strand,
          depth,
        });
      });
    }
  }
  return points;
}

function lineStroke(loading: number | undefined, open: boolean): { stroke: string; width: number; dash?: string } {
  if (open) {
    return { stroke: "#8CA3BA", width: 1.4, dash: "5 4" };
  }
  if (loading == null) {
    return { stroke: "rgb(102, 115, 127)", width: 1.3 };
  }
  if (loading > 100) {
    return { stroke: "#FFFFFF", width: 2.8, dash: "6 4" };
  }
  if (loading >= 80) {
    return { stroke: "#E1E6EA", width: 2.3 };
  }
  return { stroke: "rgb(102, 115, 127)", width: 1.3 };
}

function NodeMark({
  x,
  y,
  fill,
  shape,
  ring,
  storage,
}: {
  x: number;
  y: number;
  fill: string;
  shape: "circle" | "down" | "up" | "square" | "diamond";
  ring: boolean;
  storage: boolean;
}) {
  return (
    <g>
      {storage ? <circle cx={x} cy={y} r={11} fill="none" stroke="#7DFCE6" strokeWidth={2} /> : null}
      {ring ? <circle cx={x} cy={y} r={8} fill="none" stroke="#FFFFFF" strokeWidth={1.6} /> : null}
      {shape === "circle" ? <circle cx={x} cy={y} r={4.2} fill={fill} /> : null}
      {shape === "square" ? <rect x={x - 4} y={y - 4} width={8} height={8} fill={fill} /> : null}
      {shape === "down" ? <polygon points={`${x},${y + 5} ${x - 5},${y - 4} ${x + 5},${y - 4}`} fill={fill} /> : null}
      {shape === "up" ? <polygon points={`${x},${y - 5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill={fill} /> : null}
      {shape === "diamond" ? <polygon points={`${x},${y - 5.5} ${x + 5},${y} ${x},${y + 5.5} ${x - 5},${y}`} fill={fill} /> : null}
    </g>
  );
}

export function NetzKarte({
  data,
  state,
  mode,
  tipping,
  storageBus,
  title,
  description,
}: {
  data: NetzDemoFile;
  state: NetzState;
  mode: "spannung" | "kipp";
  tipping: number[];
  storageBus: number | null;
  title: string;
  description: string;
}) {
  const points = layout(data);
  const titleId = "netz-karte-titel";
  const loadingById = new Map<number, number>();
  if (state.loading) {
    data.lines.forEach((line, index) => {
      const value = state.loading?.[index];
      if (value != null) {
        loadingById.set(line.id, value);
      }
    });
  }
  const voltageByBus = new Map<number, number>();
  if (state.u) {
    data.mvBusIds.forEach((bus, index) => {
      const value = state.u?.[index];
      if (value != null) {
        voltageByBus.set(bus, value);
      }
    });
  }
  const tipByBus = new Map<number, number>();
  data.mvBusIds.forEach((bus, index) => {
    const value = tipping[index];
    if (value != null) {
      tipByBus.set(bus, value);
    }
  });
  const edgeOf = new Map<string, { id: number; open: boolean }>();
  for (const line of data.lines) {
    const key = `${Math.min(line.a, line.b)}-${Math.max(line.a, line.b)}`;
    edgeOf.set(key, { id: line.id, open: line.openEnd });
  }

  const closed: Array<{ x1: number; y1: number; x2: number; y2: number; stroke: string; width: number; dash?: string; key: string }> = [];
  for (const node of data.tree) {
    if (node.parent == null) continue;
    const from = points.get(node.parent);
    const to = points.get(node.bus);
    if (!from || !to) continue;
    const edge = edgeOf.get(`${Math.min(node.parent, node.bus)}-${Math.max(node.parent, node.bus)}`);
    const paint = lineStroke(mode === "spannung" ? loadingById.get(edge?.id ?? -1) : undefined, false);
    closed.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, ...paint, key: `c-${node.bus}` });
  }
  const open = data.lines.filter((line) => line.openEnd);

  return (
    <svg className={styles.mapSvg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-labelledby={titleId}>
      <title id={titleId}>{title}</title>
      <desc>{description}</desc>
      <line x1={PAD_L + 8} y1={PAD_T - 8} x2={PAD_L + 8} y2={PAD_T + 8 * ROW + 8} stroke="#E1E6EA" strokeWidth={3} />
      {closed.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.stroke}
          strokeWidth={line.width}
          strokeDasharray={line.dash}
          strokeLinecap="round"
        />
      ))}
      {open.map((line) => {
        const from = points.get(line.a);
        const to = points.get(line.b);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        return (
          <g key={`o-${line.id}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#8CA3BA" strokeWidth={1.4} strokeDasharray="5 4" />
            <path d={`M ${midX - 3} ${midY - 3} L ${midX + 3} ${midY + 3} M ${midX + 3} ${midY - 3} L ${midX - 3} ${midY + 3}`} stroke="#E1E6EA" strokeWidth={1.2} />
          </g>
        );
      })}
      {data.tree.map((node) => {
        const point = points.get(node.bus);
        if (!point) return null;
        const storage = storageBus === node.bus;
        if (mode === "kipp") {
          const tip = tipByBus.get(node.bus) ?? 0;
          const band = tipBand(tip);
          const shape = band === 0 ? "down" : band === 1 ? "square" : band === 3 ? "diamond" : "circle";
          return <NodeMark key={node.bus} x={point.x} y={point.y} fill={TIP_FILL[band]} shape={shape} ring={band === 4} storage={storage} />;
        }
        const pu = voltageByBus.get(node.bus);
        if (pu == null) {
          return <NodeMark key={node.bus} x={point.x} y={point.y} fill="rgb(102, 115, 127)" shape="circle" ring={false} storage={storage} />;
        }
        const band = voltageBand(pu);
        const shape = band === "low" ? "down" : band === "high" ? "up" : "circle";
        return <NodeMark key={node.bus} x={point.x} y={point.y} fill={VOLTAGE_FILL[band]} shape={shape} ring={band === "low" || band === "high"} storage={storage} />;
      })}
    </svg>
  );
}

export const STRAND_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const MAP_VIEW = { width: VIEW_W, height: VIEW_H, padTop: PAD_T, row: ROW };

export const VOLTAGE_LEGEND = [
  { fill: VOLTAGE_FILL.low, shape: "down" as const, de: "unter 0,965 p.u.", en: "below 0.965 p.u." },
  { fill: VOLTAGE_FILL.midlow, shape: "circle" as const, de: "0,965 bis 0,990", en: "0.965 to 0.990" },
  { fill: VOLTAGE_FILL.mid, shape: "circle" as const, de: "0,990 bis 1,030", en: "0.990 to 1.030" },
  { fill: VOLTAGE_FILL.midhigh, shape: "circle" as const, de: "1,030 bis 1,055", en: "1.030 to 1.055" },
  { fill: VOLTAGE_FILL.high, shape: "up" as const, de: "über 1,055 p.u.", en: "above 1.055 p.u." },
];

export const TIP_LEGEND = [
  { fill: TIP_FILL[0], shape: "down" as const, de: "unter 2 MW", en: "below 2 MW" },
  { fill: TIP_FILL[1], shape: "square" as const, de: "2 bis unter 5 MW", en: "2 to below 5 MW" },
  { fill: TIP_FILL[2], shape: "circle" as const, de: "5 bis unter 10 MW", en: "5 to below 10 MW" },
  { fill: TIP_FILL[3], shape: "diamond" as const, de: "10 bis unter 20 MW", en: "10 to below 20 MW" },
  { fill: TIP_FILL[4], shape: "circle" as const, de: "20 MW und mehr", en: "20 MW and more" },
];
