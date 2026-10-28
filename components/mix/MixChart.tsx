import { useLayoutEffect, useRef, useState, type RefObject } from "react";

import { CARRIER_IDS, type CarrierId, type ChartPoint } from "@/lib/powerMix";
import { CARRIER_COPY } from "@/lib/powerBoard";
import { niceAxis } from "@/lib/niceTicks";

export type ChartFrame = {
  width: number;
  height: number;
  pad: { l: number; r: number; t: number; b: number };
  font: number;
};

export function chartFrame(compact: boolean, width?: number): ChartFrame {
  if (compact) {
    const drawn = Math.max(300, Math.round(width && width > 0 ? width : 360));
    return { width: drawn, height: 260, pad: { l: 40, r: 14, t: 16, b: 42 }, font: 12 };
  }
  const drawn = Math.max(640, Math.round(width && width > 0 ? width : 960));
  return {
    width: drawn,
    height: Math.max(320, Math.min(420, Math.round(drawn * 0.32))),
    pad: { l: 56, r: 156, t: 18, b: 36 },
    font: 14,
  };
}

/** Keep the first and last time marks inside the view box. */
export function tickPlacement(x: number, frame: ChartFrame): { x: number; anchor: "start" | "middle" | "end" } {
  if (x >= frame.width - frame.pad.r - 2) {
    return { x: Math.min(x, frame.width - 3), anchor: "end" };
  }
  if (x <= frame.pad.l + 36) {
    return { x: Math.max(x, 2), anchor: "start" };
  }
  return { x, anchor: "middle" };
}

export function useChartWidth<T extends HTMLElement = HTMLDivElement>(): { hostRef: RefObject<T | null>; width: number } {
  const hostRef = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = hostRef.current;
    if (!node) {
      return;
    }
    const read = () => {
      const next = Math.round(node.clientWidth);
      setWidth((prev) => (prev === next ? prev : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { hostRef, width };
}

export function chartX(unix: number, min: number, max: number, frame: ChartFrame): number {
  const plot = frame.width - frame.pad.l - frame.pad.r;
  if (max === min) {
    return frame.pad.l + plot / 2;
  }
  return frame.pad.l + ((unix - min) / (max - min)) * plot;
}

function yOf(value: number, min: number, max: number, frame: ChartFrame): number {
  const plot = frame.height - frame.pad.t - frame.pad.b;
  return frame.pad.t + ((max - value) / (max - min)) * plot;
}

function runs(indexes: number[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  for (const index of indexes) {
    if (current.length === 0 || index === current[current.length - 1] + 1) {
      current.push(index);
    } else {
      groups.push(current);
      current = [index];
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups;
}

function bandPath(
  xs: number[],
  lower: number[],
  upper: number[],
  indexes: number[],
  min: number,
  max: number,
  frame: ChartFrame
): string {
  if (indexes.length === 0) {
    return "";
  }
  const x = (index: number) => chartX(xs[index], xs[0], xs[xs.length - 1], frame);
  const forward = indexes.map((index) => `${x(index).toFixed(1)},${yOf(upper[index], min, max, frame).toFixed(1)}`).join(" ");
  const back = [...indexes].reverse().map((index) => `${x(index).toFixed(1)},${yOf(lower[index], min, max, frame).toFixed(1)}`).join(" ");
  const [first] = indexes;
  return `M ${x(first).toFixed(1)},${yOf(lower[first], min, max, frame).toFixed(1)} L ${forward} L ${back} Z`;
}

function linePath(
  points: ChartPoint[],
  pick: (point: ChartPoint) => number | null,
  min: number,
  max: number,
  xs: number[],
  frame: ChartFrame
): string {
  const parts: string[] = [];
  let open = false;
  points.forEach((point, index) => {
    const value = pick(point);
    if (value === null) {
      open = false;
      return;
    }
    const cmd = open ? "L" : "M";
    open = true;
    parts.push(`${cmd} ${chartX(xs[index], xs[0], xs[xs.length - 1], frame).toFixed(1)} ${yOf(value, min, max, frame).toFixed(1)}`);
  });
  return parts.join(" ");
}

const LEGEND: Array<{ id: CarrierId | "load" | "residual" | "trade" | "surplus"; de: string; en: string }> = [
  ...CARRIER_IDS.map((id) => ({ id, ...CARRIER_COPY[id] })),
  { id: "load", de: "Last", en: "Load" },
  { id: "surplus", de: "Überschuss", en: "Surplus" },
  { id: "residual", de: "Residuallast", en: "Residual load" },
  { id: "trade", de: "Handel", en: "Trade" },
];

function windSolarGw(point: ChartPoint): number | null {
  const onshore = point.carriers.windOnshore;
  const solar = point.carriers.solar;
  if (onshore === null || solar === null) {
    return null;
  }
  return onshore + solar + (point.carriers.windOffshore ?? 0);
}

function keptTicks(points: ChartPoint[], compact: boolean): Set<number> {
  const indexes = points.map((point, index) => (point.tick ? index : -1)).filter((index) => index >= 0);
  if (!compact || indexes.length <= 4) {
    return new Set(indexes);
  }
  const last = indexes.length - 1;
  const picks = [0, Math.round(last / 3), Math.round((2 * last) / 3), last];
  return new Set(picks.map((pick) => indexes[pick]));
}

export function MixChart({
  points,
  unit,
  title,
  description,
  language,
  compact = false,
  surplusLabel = null,
}: {
  points: ChartPoint[];
  unit: "GW" | "GWh";
  title: string;
  description: string;
  language: "de" | "en";
  compact?: boolean;
  /** Measured surplus for the whole window, already formatted, or null when there is none. */
  surplusLabel?: string | null;
}) {
  const { hostRef, width } = useChartWidth<HTMLElement>();
  const frame = chartFrame(compact, width);
  const titleId = "mix-chart-title";
  const descId = "mix-chart-desc";
  if (points.length === 0) {
    return <p className="mix-empty">{language === "de" ? "Für diesen Zeitraum liegt keine Reihe vor." : "There is no series for this period."}</p>;
  }
  const values: number[] = [0];
  for (const point of points) {
    let stack = 0;
    let complete = true;
    for (const id of CARRIER_IDS) {
      const value = point.carriers[id];
      if (value === null) {
        complete = false;
        break;
      }
      stack += Math.max(0, value);
    }
    if (complete) {
      values.push(stack);
    }
    for (const value of [point.load, point.residual, point.trade, windSolarGw(point)]) {
      if (value !== null) {
        values.push(value);
      }
    }
  }
  const axis = niceAxis(Math.min(...values), Math.max(...values), 6);
  const xs = points.map((point) => point.unix);
  const completeIndex = points.map((point) => CARRIER_IDS.every((id) => point.carriers[id] !== null));
  const lower = CARRIER_IDS.map(() => points.map(() => 0));
  const upper = CARRIER_IDS.map(() => points.map(() => 0));
  for (let index = 0; index < points.length; index += 1) {
    if (!completeIndex[index]) {
      continue;
    }
    let cursor = 0;
    CARRIER_IDS.forEach((id, carrier) => {
      lower[carrier][index] = cursor;
      cursor += Math.max(0, points[index].carriers[id] ?? 0);
      upper[carrier][index] = cursor;
    });
  }
  const completeRuns = runs(points.map((_, index) => index).filter((index) => completeIndex[index]));
  const show = keptTicks(points, compact);
  const labels: Array<{ y: number; text: string }> = [];
  if (!compact) {
    const lastComplete = completeIndex.lastIndexOf(true);
    const ranked: Array<{ y: number; text: string; rank: number }> = [];
    const push = (y: number, text: string, rank: number) => ranked.push({ y, text, rank });
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const load = points[index].load;
      if (load !== null) {
        push(yOf(load, axis.min, axis.max, frame), language === "de" ? "Last" : "Load", 0);
        break;
      }
    }
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const residual = points[index].residual;
      if (residual !== null) {
        push(yOf(residual, axis.min, axis.max, frame), language === "de" ? "Residuallast" : "Residual", 1);
        break;
      }
    }
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const trade = points[index].trade;
      if (trade !== null) {
        push(yOf(trade, axis.min, axis.max, frame), language === "de" ? "Handel" : "Trade", 2);
        break;
      }
    }
    if (lastComplete >= 0) {
      CARRIER_IDS.forEach((id, carrier) => {
        const y1 = yOf(lower[carrier][lastComplete], axis.min, axis.max, frame);
        const y2 = yOf(upper[carrier][lastComplete], axis.min, axis.max, frame);
        const band = Math.abs(y1 - y2);
        if (band >= 16) {
          const name = language === "de" ? CARRIER_COPY[id].de : CARRIER_COPY[id].en;
          push((y1 + y2) / 2, name, 10 + (1000 - band));
        }
      });
    }
    ranked.sort((left, right) => left.rank - right.rank || left.y - right.y);
    const placed: number[] = [];
    for (const label of ranked) {
      if (placed.some((y) => Math.abs(y - label.y) < frame.font + 14)) {
        continue;
      }
      placed.push(label.y);
      labels.push(label);
    }
  }
  const loadPath = linePath(points, (point) => point.load, axis.min, axis.max, xs, frame);
  const residualPath = linePath(points, (point) => point.residual, axis.min, axis.max, xs, frame);
  const windSeries = points.map((point) => windSolarGw(point) ?? 0);
  const loadSeries = points.map((point) => point.load ?? 0);
  const surplusIndexes = points
    .map((point, index) => {
      const wind = windSolarGw(point);
      return wind !== null && point.load !== null && wind > point.load ? index : -1;
    })
    .filter((index) => index >= 0);
  const surplusPath = runs(surplusIndexes)
    .map((group) => bandPath(xs, loadSeries, windSeries, group, axis.min, axis.max, frame))
    .join(" ");
  const surplusMark = surplusLabel ? surplusMarkAt(surplusIndexes, xs, loadSeries, windSeries, axis.min, axis.max, frame, surplusLabel) : null;

  return (
    <figure className="mix-figure" ref={hostRef}>
      <svg className={compact ? "mix-chart is-compact" : "mix-chart"} viewBox={`0 0 ${frame.width} ${frame.height}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{title}</title>
        <desc id={descId}>{description}</desc>
        {axis.ticks.map((tick) => (
          <g key={tick}>
            <line
              className={tick === 0 ? "mix-zero" : "mix-guide"}
              x1={frame.pad.l}
              x2={frame.width - frame.pad.r}
              y1={yOf(tick, axis.min, axis.max, frame)}
              y2={yOf(tick, axis.min, axis.max, frame)}
            />
            <text className="mix-axis" fontSize={frame.font} x={frame.pad.l - 6} y={yOf(tick, axis.min, axis.max, frame)} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        <text className="mix-axis" fontSize={frame.font} x={frame.pad.l} y={12}>
          {unit}
        </text>
        {CARRIER_IDS.map((id, carrier) =>
          completeRuns.map((group) => (
            <path key={`${id}-${group[0]}`} className={`mix-carrier mix-fill-${id}`} d={bandPath(xs, lower[carrier], upper[carrier], group, axis.min, axis.max, frame)} />
          ))
        )}
        <path className="mix-trade" d={tradePath(points, axis.min, axis.max, xs, frame)} />
        {surplusPath ? <path className="mix-surplus" d={surplusPath} /> : null}
        <path className="mix-load" d={loadPath} fill="none" />
        <path className="mix-residual-edge" d={residualPath} fill="none" />
        <path className="mix-residual" d={residualPath} fill="none" />
        {points.map((point, index) => {
          if (!point.tick || !show.has(index)) {
            return null;
          }
          const placed = tickPlacement(chartX(xs[index], xs[0], xs[xs.length - 1], frame), frame);
          return (
            <text key={`${point.unix}-${point.tick}`} className="mix-axis" fontSize={frame.font} x={placed.x} y={frame.height - 10} textAnchor={placed.anchor}>
              {point.tick}
            </text>
          );
        })}
        {surplusMark ? (
          <text className="mix-surplus-label" fontSize={frame.font} x={surplusMark.x} y={surplusMark.y} textAnchor={surplusMark.anchor}>
            {surplusLabel}
          </text>
        ) : null}
        {labels.map((label) => (
          <text key={label.text} className="mix-direct" fontSize={frame.font} x={frame.width - frame.pad.r + 8} y={label.y} dominantBaseline="middle">
            {label.text}
          </text>
        ))}
      </svg>
      <ul className="mix-legend">
        {LEGEND.map((item) => (
          <li key={item.id}>
            <span className={`mix-dot mix-fill-${item.id}`} aria-hidden="true" />
            {language === "de" ? item.de : item.en}
          </li>
        ))}
      </ul>
    </figure>
  );
}

function surplusMarkAt(
  indexes: number[],
  xs: number[],
  load: number[],
  wind: number[],
  min: number,
  max: number,
  frame: ChartFrame,
  label: string
): { x: number; y: number; anchor: "start" | "middle" | "end" } | null {
  const groups = runs(indexes);
  const group = groups.sort((left, right) => right.length - left.length)[0];
  if (!group || group.length === 0) {
    return null;
  }
  const index = group[Math.floor(group.length / 2)];
  const rawX = chartX(xs[index], xs[0], xs[xs.length - 1], frame);
  const yLoad = yOf(load[index], min, max, frame);
  const yWind = yOf(wind[index], min, max, frame);
  const y = Math.min(frame.height - frame.pad.b - 8, Math.max(frame.pad.t + frame.font, (yLoad + yWind) / 2));
  const widthGuess = label.length * frame.font * 0.62;
  if (rawX + widthGuess > frame.width - 8) {
    return { x: Math.min(frame.width - 6, Math.max(rawX, frame.pad.l + widthGuess)), y, anchor: "end" };
  }
  if (rawX - widthGuess / 2 < frame.pad.l) {
    return { x: frame.pad.l + 4, y, anchor: "start" };
  }
  return { x: rawX, y, anchor: "middle" };
}

function tradePath(points: ChartPoint[], min: number, max: number, xs: number[], frame: ChartFrame): string {
  const indexes = points.map((point, index) => (point.trade === null ? -1 : index)).filter((index) => index >= 0);
  const lower = points.map(() => 0);
  const upper = points.map((point) => point.trade ?? 0);
  return runs(indexes)
    .map((group) => bandPath(xs, lower, upper, group, min, max, frame))
    .join(" ");
}
