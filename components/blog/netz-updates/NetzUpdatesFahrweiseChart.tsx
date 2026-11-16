import { loadNetzUpdatesFahrweiseDay } from "@/lib/netzUpdatesChartData.server";

type Slot = { hourLabel: string; observedGw: number; priceGw: number; peakGw: number };

function polylinePoints(
  values: number[],
  yMin: number,
  yMax: number,
  vb: { L: number; T: number; plotW: number; plotH: number },
): string {
  return values
    .map((value, index) => {
      const x = vb.L + (index / (values.length - 1)) * vb.plotW;
      const y = vb.T + vb.plotH - ((value - yMin) / (yMax - yMin)) * vb.plotH;
      return `${x},${y}`;
    })
    .join(" ");
}

function slotIndexForHour(slots: Slot[], hour: number): number {
  const prefix = `${String(hour).padStart(2, "0")}:`;
  const idx = slots.findIndex((s) => s.hourLabel.startsWith(prefix));
  return idx >= 0 ? idx : Math.round((hour / 24) * (slots.length - 1));
}

function xAtIndex(index: number, vb: { L: number; plotW: number }, count: number): number {
  return vb.L + (index / (count - 1)) * vb.plotW;
}

function yAtValue(value: number, yMin: number, yMax: number, vb: { T: number; plotH: number }): number {
  return vb.T + vb.plotH - ((value - yMin) / (yMax - yMin)) * vb.plotH;
}

export function NetzUpdatesFahrweiseChart() {
  const data = loadNetzUpdatesFahrweiseDay();
  const yMin = 20;
  const yMax = 58;
  const vb = { w: 720, h: 380, L: 48, R: 16, T: 28, B: 52, plotW: 0, plotH: 0 };
  vb.plotW = vb.w - vb.L - vb.R;
  vb.plotH = vb.h - vb.T - vb.B;

  /** Mindestens 12 px Schrift bei 390 px Breite (viewBox 720). */
  const fs = Math.max(12, (12 * vb.w) / 390);
  const fsAxis = fs;

  const observed = data.slots.map((s) => s.observedGw);
  const price = data.slots.map((s) => s.priceGw);
  const peak = data.slots.map((s) => s.peakGw);
  const n = data.slots.length;
  const last = n - 1;

  const lineStyles = [
    { key: "observed", series: observed, stroke: "var(--blog-ink, #1c2429)", width: 1.5, fill: true, label: "beobachtet" },
    { key: "price", series: price, stroke: "var(--blog-ink, #1c2429)", width: 2, fill: false, label: "Markt" },
    { key: "peak", series: peak, stroke: "#4ecdc4", width: 2, fill: false, label: "gegen die Spitze" },
  ] as const;

  const title =
    "Tagesprofil 21.10.2026: beobachtete Restlast, Markt fährt nach Preis (Spitze 55,6 GW um 14:00), gegen die Spitze gedeckelt bei 51,7 GW. Zusatzflotte 4,6 GW, Modell Oktober 2026.";

  return (
    <figure className="blog-figure blog-netz-chart">
      <svg
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        className="blog-netz-chart-svg"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        {[20, 30, 40, 50].map((tick) => {
          const y = yAtValue(tick, yMin, yMax, vb);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + vb.plotW} y1={y} y2={y} stroke="var(--blog-grid, #e4e4dc)" strokeWidth="1" />
              <text
                x={vb.L - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--blog-muted, #6b7280)"
                fontSize={fsAxis}
              >
                {tick}
              </text>
            </g>
          );
        })}
        <text x={vb.L - 8} y={vb.T - 8} textAnchor="end" fill="var(--blog-muted, #6b7280)" fontSize={fsAxis}>
          GW
        </text>
        <polygon
          fill="rgb(143 154 164 / 22%)"
          points={`${vb.L},${vb.T + vb.plotH} ${polylinePoints(observed, yMin, yMax, vb)} ${vb.L + vb.plotW},${vb.T + vb.plotH}`}
        />
        {lineStyles.map((line) =>
          line.key === "observed" ? null : (
            <polyline
              key={line.key}
              fill="none"
              stroke={line.stroke}
              strokeWidth={line.width}
              points={polylinePoints(line.series, yMin, yMax, vb)}
            />
          ),
        )}
        {lineStyles.map((line, i) => {
          const val = line.series[last]!;
          const x = xAtIndex(last, vb, n);
          const y = yAtValue(val, yMin, yMax, vb);
          const labelY = y - 10 - i * 16;
          return (
            <text
              key={`${line.key}-label`}
              x={x - 4}
              y={labelY}
              textAnchor="end"
              fill="var(--blog-ink, #1c2429)"
              fontSize={fs}
              style={{ paintOrder: "stroke fill", stroke: "var(--blog-bg, #fff)", strokeWidth: 3 }}
            >
              {line.label}
            </text>
          );
        })}
        {[0, 6, 12, 18, 24].map((h) => {
          const idx = h === 24 ? last : slotIndexForHour(data.slots, h);
          const x = h === 24 ? vb.L + vb.plotW : xAtIndex(idx, vb, n);
          const label = `${String(h).padStart(2, "0")}`;
          return (
            <g key={`x-${h}`}>
              <line x1={x} x2={x} y1={vb.T + vb.plotH} y2={vb.T + vb.plotH + 5} stroke="var(--blog-ink, #1c2429)" strokeWidth="1" />
              <text
                x={x}
                y={vb.h - 10}
                textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
                fill="var(--blog-muted, #6b7280)"
                fontSize={fsAxis}
              >
                {label}
              </text>
            </g>
          );
        })}
        <text x={vb.L + vb.plotW / 2} y={vb.h - 24} textAnchor="middle" fill="var(--blog-muted, #6b7280)" fontSize={fsAxis}>
          Uhr (Europe/Berlin)
        </text>
      </svg>
      <figcaption className="blog-media-caption">
        Mi 21.10.2026: beobachtet {data.observedPeakGw.toFixed(1).replace(".", ",")} GW um {data.observedPeakLabel}; Markt{" "}
        {data.pricePeakGw.toFixed(1).replace(".", ",")} GW um {data.pricePeakLabel}; gegen die Spitze maximal{" "}
        {data.peakCapGw.toFixed(1).replace(".", ",")} GW.
      </figcaption>
    </figure>
  );
}