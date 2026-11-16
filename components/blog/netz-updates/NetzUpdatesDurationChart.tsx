import { loadNetzUpdatesDurationSeries } from "@/lib/netzUpdatesChartData.server";

function formatGwReduction(gw: number): string {
  if (gw === 0) {
    return "0";
  }
  return `−${gw.toFixed(1).replace(".", ",")}`;
}

export function NetzUpdatesDurationChart() {
  const cats = loadNetzUpdatesDurationSeries();
  const vb = { w: 720, h: 360, L: 48, R: 16, T: 32, B: 56 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const yMax = 20;
  const yRed = (reductionGw: number) => vb.T + plotH - (reductionGw / yMax) * plotH;

  const title =
    "Spitzensenkung der nationalen Restlast im Oktober 2026 über die Flottenstufen ×1 bis ×10. Türkise Punkte: 4 h, weiße Punkte: 1,76 h.";

  return (
    <figure className="blog-figure blog-netz-chart">
      <svg
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        className="blog-netz-chart-svg"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        {[0, 5, 10, 15, 20].map((tick) => {
          const y = yRed(tick);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + plotW} y1={y} y2={y} stroke="var(--blog-grid, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 6} y={y + 4} textAnchor="end" fill="var(--blog-muted, #6b7280)" fontSize="12">
                {tick === 0 ? "0" : `−${tick}`}
              </text>
            </g>
          );
        })}
        <text x={vb.L - 6} y={vb.T - 10} textAnchor="end" fill="var(--blog-muted, #6b7280)" fontSize="12">
          GW
        </text>
        {cats.map((c, i) => {
          const x = vb.L + ((i + 0.5) / cats.length) * plotW;
          const y176 = yRed(c.h176);
          const y4 = yRed(c.h4);
          return (
            <g key={c.factor}>
              <line x1={x} x2={x} y1={vb.T} y2={vb.T + plotH} stroke="var(--blog-linie, #8f9aa4)" strokeWidth="1.5" />
              <text x={x} y={vb.T + plotH + 18} textAnchor="middle" fill="var(--blog-ink, #1c2429)" fontSize="13">
                ×{c.factor}
              </text>
              <text x={x} y={vb.T + plotH + 36} textAnchor="middle" fill="var(--blog-muted, #6b7280)" fontSize="11">
                {c.powerGwLabel}
              </text>
              <line x1={x - 8} y1={y176} x2={x + 8} y2={y4} stroke="var(--blog-linie, #8f9aa4)" strokeWidth="1.25" />
              <circle cx={x} cy={y176} r={5} fill="var(--blog-flaeche, #fff)" stroke="var(--blog-muted, #6b7280)" strokeWidth="1.75" />
              <circle cx={x} cy={y4} r={6} fill="#4ecdc4" />
              {c.factor > 1 && (c.factor === 5 || c.factor === 10) ? (
                <>
                  <text x={x} y={y4 - 10} textAnchor="middle" fontSize="11" fill="var(--blog-ink, #1c2429)">
                    {formatGwReduction(c.h4)}
                  </text>
                  {c.factor === 10 ? (
                    <text x={x} y={y176 + 18} textAnchor="middle" fontSize="11" fill="var(--blog-ink, #1c2429)">
                      {formatGwReduction(c.h176)}
                    </text>
                  ) : null}
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="blog-media-caption">
        Halbe Leistung, gleiche Senkung: ×5 mit 4 h und ×10 mit 1,76 h liegen beide bei −14,0 GW (Oktober 2026, national).
      </figcaption>
    </figure>
  );
}