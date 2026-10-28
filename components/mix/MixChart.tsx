import { CARRIER_IDS, type ChartPoint } from "@/lib/powerMix";
import { CARRIER_COPY } from "@/lib/powerBoard";
import { niceAxis } from "@/lib/niceTicks";

const WIDTH = 720;
const HEIGHT = 340;
const PAD = { l: 48, r: 108, t: 18, b: 32 };

function yOf(value: number, min: number, max: number): number {
  const plot = HEIGHT - PAD.t - PAD.b;
  return PAD.t + ((max - value) / (max - min)) * plot;
}

function xOf(unix: number, min: number, max: number): number {
  const plot = WIDTH - PAD.l - PAD.r;
  if (max === min) {
    return PAD.l + plot / 2;
  }
  return PAD.l + ((unix - min) / (max - min)) * plot;
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

function bandPath(xs: number[], lower: number[], upper: number[], indexes: number[], min: number, max: number): string {
  if (indexes.length === 0) {
    return "";
  }
  const forward = indexes
    .map((index) => `${xOf(xs[index], xs[0], xs[xs.length - 1]).toFixed(1)},${yOf(upper[index], min, max).toFixed(1)}`)
    .join(" ");
  const back = [...indexes]
    .reverse()
    .map((index) => `${xOf(xs[index], xs[0], xs[xs.length - 1]).toFixed(1)},${yOf(lower[index], min, max).toFixed(1)}`)
    .join(" ");
  const [first] = indexes;
  return `M ${xOf(xs[first], xs[0], xs[xs.length - 1]).toFixed(1)},${yOf(lower[first], min, max).toFixed(1)} L ${forward} L ${back} Z`;
}

function linePath(points: ChartPoint[], pick: (point: ChartPoint) => number | null, min: number, max: number, xs: number[]): string {
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
    parts.push(`${cmd} ${xOf(xs[index], xs[0], xs[xs.length - 1]).toFixed(1)} ${yOf(value, min, max).toFixed(1)}`);
  });
  return parts.join(" ");
}

export function MixChart({
  points,
  unit,
  title,
  description,
  language,
}: {
  points: ChartPoint[];
  unit: "GW" | "GWh";
  title: string;
  description: string;
  language: "de" | "en";
}) {
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
      stack += value;
    }
    if (complete) {
      values.push(stack);
    }
    for (const value of [point.load, point.residual, point.trade]) {
      if (value !== null) {
        values.push(value);
      }
    }
  }
  const axis = niceAxis(Math.min(...values), Math.max(...values), 4);
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
      cursor += points[index].carriers[id] ?? 0;
      upper[carrier][index] = cursor;
    });
  }
  const completeRuns = runs(points.map((_, index) => index).filter((index) => completeIndex[index]));
  const labels: Array<{ y: number; text: string }> = [];
  const lastComplete = completeIndex.lastIndexOf(true);
  if (lastComplete >= 0) {
    CARRIER_IDS.forEach((id, carrier) => {
      const y1 = yOf(lower[carrier][lastComplete], axis.min, axis.max);
      const y2 = yOf(upper[carrier][lastComplete], axis.min, axis.max);
      if (Math.abs(y1 - y2) >= 14) {
        labels.push({ y: (y1 + y2) / 2, text: language === "de" ? CARRIER_COPY[id].de : CARRIER_COPY[id].en });
      }
    });
  }
  const lastOf = (pick: (point: ChartPoint) => number | null, text: string) => {
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const value = pick(points[index]);
      if (value !== null) {
        labels.push({ y: yOf(value, axis.min, axis.max), text });
        return;
      }
    }
  };
  lastOf((point) => point.load, language === "de" ? "Last" : "Load");
  lastOf((point) => point.residual, language === "de" ? "Residuallast" : "Residual");
  lastOf((point) => point.trade, language === "de" ? "Handel" : "Trade");
  labels.sort((left, right) => left.y - right.y);
  let cursor = PAD.t;
  for (const label of labels) {
    if (label.y < cursor) {
      label.y = cursor;
    }
    cursor = label.y + 13;
  }

  return (
    <svg className="mix-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      {axis.ticks.map((tick) => (
        <g key={tick}>
          <line className="mix-guide" x1={PAD.l} x2={WIDTH - PAD.r} y1={yOf(tick, axis.min, axis.max)} y2={yOf(tick, axis.min, axis.max)} />
          <text className="mix-axis" x={PAD.l - 6} y={yOf(tick, axis.min, axis.max)} textAnchor="end" dominantBaseline="middle">
            {tick}
          </text>
        </g>
      ))}
      <text className="mix-axis" x={PAD.l} y={12}>
        {unit}
      </text>
      {CARRIER_IDS.map((id, carrier) =>
        completeRuns.map((group) => (
          <path key={`${id}-${group[0]}`} className={`mix-carrier mix-carrier-${carrier + 1}`} d={bandPath(xs, lower[carrier], upper[carrier], group, axis.min, axis.max)} />
        ))
      )}
      <path className="mix-trade" d={tradePath(points, axis.min, axis.max, xs)} />
      <path className="mix-load" d={linePath(points, (point) => point.load, axis.min, axis.max, xs)} fill="none" />
      <path className="mix-residual" d={linePath(points, (point) => point.residual, axis.min, axis.max, xs)} fill="none" />
      {points.map((point, index) =>
        point.tick ? (
          <text key={point.unix} className="mix-axis" x={xOf(xs[index], xs[0], xs[xs.length - 1])} y={HEIGHT - 8} textAnchor="middle">
            {point.tick}
          </text>
        ) : null
      )}
      {labels.map((label) => (
        <text key={label.text} className="mix-direct" x={WIDTH - PAD.r + 8} y={label.y} dominantBaseline="middle">
          {label.text}
        </text>
      ))}
    </svg>
  );
}

function tradePath(points: ChartPoint[], min: number, max: number, xs: number[]): string {
  const indexes = points.map((point, index) => (point.trade === null ? -1 : index)).filter((index) => index >= 0);
  const lower = points.map(() => 0);
  const upper = points.map((point) => point.trade ?? 0);
  return runs(indexes)
    .map((group) => bandPath(xs, lower, upper, group, min, max))
    .join(" ");
}
