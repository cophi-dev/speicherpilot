type ScenarioChartProps = {
  percentA: number[];
  percentB: number[];
  percentC: number[];
  breakevenMonth: number | null;
  label: string;
  neverText: string | null;
  missText: string;
  markLabel: string;
};

const WIDTH = 640;
const HEIGHT = 300;
const LEFT = 44;
const RIGHT = 36;
const TOP = 16;
const BOTTOM = 32;

function niceMax(values: number[]): number {
  const peak = Math.max(100, ...values.filter((value) => Number.isFinite(value)));
  return Math.max(100, Math.ceil(peak / 50) * 50);
}

function xAt(month: number): number {
  return LEFT + (month / 36) * (WIDTH - LEFT - RIGHT);
}

function yAt(value: number, max: number): number {
  const plot = HEIGHT - TOP - BOTTOM;
  return TOP + (1 - value / max) * plot;
}

function path(series: number[], max: number): string {
  return series
    .map((value, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(value, max).toFixed(1)}`)
    .join(" ");
}

export function ScenarioChart({ percentA, percentB, percentC, breakevenMonth, label, neverText, missText, markLabel }: ScenarioChartProps) {
  const max = niceMax([...percentA, ...percentB, ...percentC]);
  const ticks = Array.from({ length: max / 50 + 1 }, (_, index) => index * 50);
  const endA = yAt(percentA[36] ?? 0, max);
  const endB = yAt(percentB[36] ?? 0, max);
  const endC = yAt(percentC[36] ?? 0, max);
  const labels = [
    { id: "A", y: endA },
    { id: "B", y: endB },
    { id: "C", y: endC },
  ].sort((a, b) => a.y - b.y);
  const placed = new Map<string, number>();
  let last = -Infinity;
  for (const labelPoint of labels) {
    const y = Math.max(labelPoint.y, last + 16);
    placed.set(labelPoint.id, y);
    last = y;
  }
  const mark = breakevenMonth === null ? null : xAt(breakevenMonth);

  return (
    <figure className="szen-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="szen-gridline" x1={LEFT} x2={WIDTH - RIGHT} y1={yAt(tick, max)} y2={yAt(tick, max)} />
            <text className="szen-axis" x={LEFT - 8} y={yAt(tick, max) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {[0, 12, 24, 36].map((month) => (
          <text key={month} className="szen-axis" x={xAt(month)} y={HEIGHT - 8} textAnchor="middle">
            {month}
          </text>
        ))}
        <path className="szen-line szen-line-a" d={path(percentA, max)} />
        <path className="szen-line szen-line-b" d={path(percentB, max)} />
        <path className="szen-line szen-line-c" d={path(percentC, max)} />
        <text className="szen-end szen-end-a" x={WIDTH - RIGHT + 6} y={(placed.get("A") ?? endA) + 4}>
          A
        </text>
        <text className="szen-end szen-end-b" x={WIDTH - RIGHT + 6} y={(placed.get("B") ?? endB) + 4}>
          B
        </text>
        <text className="szen-end szen-end-c" x={WIDTH - RIGHT + 6} y={(placed.get("C") ?? endC) + 4}>
          C
        </text>
        {mark !== null ? (
          <>
            <line className="szen-mark" x1={mark} x2={mark} y1={TOP} y2={HEIGHT - BOTTOM} />
            <text className="szen-mark-label" x={mark + 4} y={TOP + 14}>
              {markLabel}
            </text>
          </>
        ) : (
          <text className="szen-miss" x={LEFT + 8} y={TOP + 28}>
            {neverText ?? missText}
          </text>
        )}
      </svg>
      <figcaption className="szen-chart-caption">Prozent eines Jahres Modellerlös von A, über 36 Monate. A durchgezogen, B gestrichelt, C gepunktet.</figcaption>
    </figure>
  );
}
