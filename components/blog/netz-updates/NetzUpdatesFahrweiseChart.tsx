import { loadNetzUpdatesFahrweiseDay } from "@/lib/netzUpdatesChartData.server";

function polylinePoints(
  slots: { hourLabel: string; value: number }[],
  yMin: number,
  yMax: number,
  vb: { L: number; T: number; plotW: number; plotH: number }
): string {
  return slots
    .map((slot, index) => {
      const x = vb.L + (index / (slots.length - 1)) * vb.plotW;
      const y = vb.T + vb.plotH - ((slot.value - yMin) / (yMax - yMin)) * vb.plotH;
      return `${x},${y}`;
    })
    .join(" ");
}

export function NetzUpdatesFahrweiseChart() {
  const data = loadNetzUpdatesFahrweiseDay();
  const yMin = 20;
  const yMax = 58;
  const vb = { w: 720, h: 380, L: 44, R: 12, T: 28, B: 52, plotW: 0, plotH: 0 };
  vb.plotW = vb.w - vb.L - vb.R;
  vb.plotH = vb.h - vb.T - vb.B;

  const observed = data.slots.map((s) => ({ hourLabel: s.hourLabel, value: s.observedGw }));
  const price = data.slots.map((s) => ({ hourLabel: s.hourLabel, value: s.priceGw }));
  const peak = data.slots.map((s) => ({ hourLabel: s.hourLabel, value: s.peakGw }));

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
          const y = vb.T + vb.plotH - ((tick - yMin) / (yMax - yMin)) * vb.plotH;
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + vb.plotW} y1={y} y2={y} stroke="var(--blog-grid, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 6} y={y + 4} textAnchor="end" fill="var(--blog-muted, #6b7280)" fontSize="11">
                {tick}
              </text>
            </g>
          );
        })}
        <text x={vb.L - 6} y={vb.T - 8} textAnchor="end" fill="var(--blog-muted, #6b7280)" fontSize="11">
          GW
        </text>
        <polygon
          fill="rgb(143 154 164 / 22%)"
          points={`${vb.L},${vb.T + vb.plotH} ${polylinePoints(observed, yMin, yMax, vb)} ${vb.L + vb.plotW},${vb.T + vb.plotH}`}
        />
        <polyline
          fill="none"
          stroke="var(--blog-ink, #1c2429)"
          strokeWidth="2"
          points={polylinePoints(price, yMin, yMax, vb)}
        />
        <polyline
          fill="none"
          stroke="#4ecdc4"
          strokeWidth="2"
          points={polylinePoints(peak, yMin, yMax, vb)}
        />
      </svg>
      <figcaption className="blog-media-caption">
        Mi 21.10.2026: beobachtet {data.observedPeakGw.toFixed(1).replace(".", ",")} GW um {data.observedPeakLabel}; Markt
        {data.pricePeakGw.toFixed(1).replace(".", ",")} GW um {data.pricePeakLabel}; gegen die Spitze maximal{" "}
        {data.peakCapGw.toFixed(1).replace(".", ",")} GW.
      </figcaption>
    </figure>
  );
}