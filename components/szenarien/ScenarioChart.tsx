type ScenarioChartProps = {
  percentA: number[];
  percentB: number[];
  percentC: number[];
  breakevenMonth: number | null;
  label: string;
  caption: string;
  neverText: string | null;
  missText: string;
  markLabel: string;
};

const WIDTH = 640;
const HEIGHT = 420;
const LEFT = 56;
const RIGHT = 36;
const TOP = 28;
const BOTTOM = 36;

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

function leftOf(x: number): string {
  return `${(x / WIDTH) * 100}%`;
}

function topOf(y: number): string {
  return `${(y / HEIGHT) * 100}%`;
}

export function ScenarioChart({ percentA, percentB, percentC, breakevenMonth, label, caption, neverText, missText, markLabel }: ScenarioChartProps) {
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
    const y = Math.max(labelPoint.y, last + 18);
    placed.set(labelPoint.id, y);
    last = y;
  }
  const mark = breakevenMonth === null ? null : xAt(breakevenMonth);

  return (
    <figure className="szen-chart">
      <div className="szen-chart-plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
          {ticks.map((tick) => (
            <line key={tick} className="szen-gridline" x1={LEFT} x2={WIDTH - RIGHT} y1={yAt(tick, max)} y2={yAt(tick, max)} />
          ))}
          <path className="szen-line szen-line-a" d={path(percentA, max)} />
          <path className="szen-line szen-line-b" d={path(percentB, max)} />
          <path className="szen-line szen-line-c" d={path(percentC, max)} />
          {mark !== null ? <line className="szen-mark" x1={mark} x2={mark} y1={TOP} y2={HEIGHT - BOTTOM} /> : null}
        </svg>
        <div className="szen-chart-labels" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="szen-html-label szen-html-axis" style={{ left: leftOf(LEFT - 8), top: topOf(yAt(tick, max)) }}>
              {tick}
            </span>
          ))}
          {[0, 12, 24, 36].map((month) => (
            <span key={month} className="szen-html-label szen-html-month" style={{ left: leftOf(xAt(month)), top: topOf(HEIGHT - 16) }}>
              {month}
            </span>
          ))}
          {(["A", "B", "C"] as const).map((id) => (
            <span key={id} className={`szen-html-label szen-html-end szen-end-${id.toLowerCase()}`} style={{ left: leftOf(WIDTH - 6), top: topOf(placed.get(id) ?? 0) }}>
              {id}
            </span>
          ))}
          {mark !== null ? (
            <span className="szen-html-label szen-html-mark" style={{ left: leftOf(mark + 6), top: topOf(TOP + 8) }}>
              {markLabel}
            </span>
          ) : (
            <span className="szen-html-note" style={{ left: leftOf(LEFT + 8), top: topOf(TOP + 4) }}>
              {neverText ?? missText}
            </span>
          )}
        </div>
      </div>
      <figcaption className="szen-chart-caption">{caption}</figcaption>
    </figure>
  );
}
