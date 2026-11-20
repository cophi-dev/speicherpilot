import styles from "./neonStart.module.css";

export interface NeonDaySlot {
  readonly timestampIso: string;
  readonly hourBerlin: number;
  readonly minuteBerlin: number;
  readonly loadMw: number;
  readonly windMw: number;
  readonly solarMw: number;
}

export interface NeonPriceSlot {
  readonly hm: string;
  readonly eurPerMwh: number;
  readonly i?: number;
}

export interface NeonDayChartProps {
  readonly slots: ReadonlyArray<NeonDaySlot>;
  readonly preise: ReadonlyArray<NeonPriceSlot>;
  readonly dayLabel: string;
}

interface AxisScale {
  readonly min: number;
  readonly max: number;
  readonly ticks: ReadonlyArray<number>;
}

const fmtPriceDe = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtAxisInt = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

function computeNiceStep(roughStep: number): number {
  if (!Number.isFinite(roughStep) || roughStep <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(roughStep));
  const power = Math.pow(10, exponent);
  const fraction = roughStep / power;
  if (fraction <= 1) {
    return 1 * power;
  }
  if (fraction <= 2) {
    return 2 * power;
  }
  if (fraction <= 2.5) {
    return 2.5 * power;
  }
  if (fraction <= 5) {
    return 5 * power;
  }
  return 10 * power;
}

function buildAxisScale(rawMin: number, rawMax: number, includeZero: boolean): AxisScale {
  let minVal = includeZero ? Math.min(0, rawMin) : rawMin;
  let maxVal = includeZero ? Math.max(0, rawMax) : rawMax;

  if (Math.abs(maxVal - minVal) < 1e-6) {
    minVal -= 5;
    maxVal += 5;
  }

  const step = computeNiceStep((maxVal - minVal) / 4);
  const niceMin = Math.floor(minVal / step) * step;
  const niceMax = Math.ceil(maxVal / step) * step;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.001; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
    if (ticks.length > 8) {
      break;
    }
  }

  return { min: niceMin, max: niceMax, ticks };
}

function parseHmFraction(hm: string): number | null {
  const parts = hm.split(":");
  if (parts.length < 2) {
    return null;
  }
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }
  return Math.max(0, Math.min(24, h + m / 60)) / 24;
}

function formatCoord(n: number): string {
  return n.toFixed(1);
}

export function NeonDayChart({ slots, preise, dayLabel }: NeonDayChartProps) {
  const validLoadPoints: Array<{ readonly idx: number; readonly restGw: number }> = [];
  for (let i = 0; i < slots.length; i += 1) {
    const s = slots[i];
    if (!s) {
      continue;
    }
    const restGw = (s.loadMw - s.windMw - s.solarMw) / 1000;
    if (Number.isFinite(restGw)) {
      validLoadPoints.push({ idx: i, restGw });
    }
  }

  if (validLoadPoints.length === 0) {
    return (
      <div className={styles.chartEmpty} role="status">
        Für diesen Tag liegen noch keine Daten vor.
      </div>
    );
  }

  const validPrices: Array<{
    readonly idx: number;
    readonly hm: string;
    readonly eurPerMwh: number;
  }> = [];
  for (let i = 0; i < preise.length; i += 1) {
    const p = preise[i];
    if (!p || !Number.isFinite(p.eurPerMwh)) {
      continue;
    }
    validPrices.push({ idx: i, hm: p.hm, eurPerMwh: p.eurPerMwh });
  }

  const hasPrices = validPrices.length > 0;
  const width = 360;
  const height = hasPrices ? 264 : 216;
  const padLeft = 36;
  const padRight = hasPrices ? 44 : 14;
  const padTop = 24;
  const plotBottom = 186;
  const plotW = width - padLeft - padRight;
  const plotH = plotBottom - padTop;

  let loadMin = validLoadPoints[0].restGw;
  let loadMax = validLoadPoints[0].restGw;
  for (const pt of validLoadPoints) {
    if (pt.restGw < loadMin) {
      loadMin = pt.restGw;
    }
    if (pt.restGw > loadMax) {
      loadMax = pt.restGw;
    }
  }
  const loadScale = buildAxisScale(loadMin, loadMax, true);

  const slotCount = slots.length;
  const xForSlot = (idx: number): number => {
    if (slotCount <= 1) {
      return padLeft;
    }
    return padLeft + (idx / slotCount) * plotW;
  };

  const yForLoad = (gw: number): number => {
    const span = loadScale.max - loadScale.min;
    const ratio = span > 0 ? (gw - loadScale.min) / span : 0.5;
    return plotBottom - ratio * plotH;
  };

  const loadPolyline = validLoadPoints
    .map((pt) => `${formatCoord(xForSlot(pt.idx))},${formatCoord(yForLoad(pt.restGw))}`)
    .join(" ");

  let priceScale: AxisScale | null = null;
  let pricePolyline = "";
  let priceMaxPt: {
    readonly x: number;
    readonly y: number;
    readonly hm: string;
    readonly eurPerMwh: number;
  } | null = null;
  let priceMinPt: {
    readonly x: number;
    readonly y: number;
    readonly hm: string;
    readonly eurPerMwh: number;
  } | null = null;

  if (hasPrices) {
    let pMin = validPrices[0].eurPerMwh;
    let pMax = validPrices[0].eurPerMwh;
    for (const pt of validPrices) {
      if (pt.eurPerMwh < pMin) {
        pMin = pt.eurPerMwh;
      }
      if (pt.eurPerMwh > pMax) {
        pMax = pt.eurPerMwh;
      }
    }
    priceScale = buildAxisScale(pMin, pMax, true);

    const priceCount = preise.length;
    const useIndexRatio =
      priceCount === 96 || priceCount === 92 || priceCount === 100 || priceCount === slotCount;

    const xForPrice = (idx: number, hm: string): number => {
      if (useIndexRatio && priceCount > 1) {
        return padLeft + (idx / priceCount) * plotW;
      }
      const parsed = parseHmFraction(hm);
      if (parsed !== null) {
        return padLeft + parsed * plotW;
      }
      return priceCount > 1 ? padLeft + (idx / priceCount) * plotW : padLeft;
    };

    const yForPrice = (eur: number): number => {
      if (!priceScale) {
        return plotBottom;
      }
      const span = priceScale.max - priceScale.min;
      const ratio = span > 0 ? (eur - priceScale.min) / span : 0.5;
      return plotBottom - ratio * plotH;
    };

    const coords: string[] = [];
    for (const pt of validPrices) {
      const cx = xForPrice(pt.idx, pt.hm);
      const cy = yForPrice(pt.eurPerMwh);
      coords.push(`${formatCoord(cx)},${formatCoord(cy)}`);

      if (priceMaxPt === null || pt.eurPerMwh > priceMaxPt.eurPerMwh) {
        priceMaxPt = { x: cx, y: cy, hm: pt.hm, eurPerMwh: pt.eurPerMwh };
      }
      if (priceMinPt === null || pt.eurPerMwh < priceMinPt.eurPerMwh) {
        priceMinPt = { x: cx, y: cy, hm: pt.hm, eurPerMwh: pt.eurPerMwh };
      }
    }
    pricePolyline = coords.join(" ");
  }

  const xTicks = [0, 6, 12, 18, 24];
  const hasLoadZeroLine = loadScale.min < 0 && loadScale.max > 0;
  const zeroY = yForLoad(0);

  const ariaSummary =
    hasPrices && priceMaxPt && priceMinPt
      ? `Tagesverlauf ${dayLabel}: Restlast in GW und Day-Ahead-Preis in €/MWh von 0 bis 24 Uhr. Preisminimum ${fmtPriceDe.format(priceMinPt.eurPerMwh)}\u202f€/MWh um ${priceMinPt.hm} Uhr, Preismaximum ${fmtPriceDe.format(priceMaxPt.eurPerMwh)}\u202f€/MWh um ${priceMaxPt.hm} Uhr.`
      : `Tagesverlauf ${dayLabel}: Restlast in GW von 0 bis 24 Uhr.`;

  const maxTagY =
    priceMaxPt !== null
      ? priceMaxPt.y > padTop + 18
        ? priceMaxPt.y - 8
        : priceMaxPt.y + 16
      : 0;
  const maxTagAnchor =
    priceMaxPt !== null
      ? priceMaxPt.x > padLeft + plotW - 34
        ? "end"
        : priceMaxPt.x < padLeft + 34
          ? "start"
          : "middle"
      : "middle";

  const minTagY =
    priceMinPt !== null
      ? priceMinPt.y < plotBottom - 18
        ? priceMinPt.y + 16
        : priceMinPt.y - 8
      : 0;
  const minTagAnchor =
    priceMinPt !== null
      ? priceMinPt.x > padLeft + plotW - 34
        ? "end"
        : priceMinPt.x < padLeft + 34
          ? "start"
          : "middle"
      : "middle";

  return (
    <div className={styles.chartFrame}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={ariaSummary}
      >
        {/* Achsen-Einheiten oben */}
        <text x={padLeft - 4} y={14} textAnchor="end" className={styles.svgAxisUnit}>
          GW
        </text>
        {hasPrices && (
          <text x={width - 2} y={14} textAnchor="end" className={styles.svgAxisUnit}>
            €/MWh
          </text>
        )}

        {/* Horizontale Hilfslinien & linke Y-Achse (Restlast GW) */}
        {loadScale.ticks.map((tick) => {
          const y = yForLoad(tick);
          return (
            <g key={`load-tick-${tick}`}>
              <line
                x1={padLeft}
                y1={y}
                x2={padLeft + plotW}
                y2={y}
                className={tick === loadScale.min ? styles.svgAxisLine : styles.svgGridLine}
              />
              <text x={padLeft - 5} y={y + 4} textAnchor="end" className={styles.svgTickText}>
                {fmtAxisInt.format(tick)}
              </text>
            </g>
          );
        })}

        {/* Rechte Y-Achse (Day-Ahead €/MWh) */}
        {priceScale &&
          priceScale.ticks.map((tick) => {
            const span = priceScale.max - priceScale.min;
            const ratio = span > 0 ? (tick - priceScale.min) / span : 0.5;
            const y = plotBottom - ratio * plotH;
            return (
              <text
                key={`price-tick-${tick}`}
                x={padLeft + plotW + 5}
                y={y + 4}
                textAnchor="start"
                className={styles.svgTickText}
              >
                {fmtAxisInt.format(tick)}
              </text>
            );
          })}

        {/* Nulllinie bei negativer Restlast */}
        {hasLoadZeroLine && (
          <line
            x1={padLeft}
            y1={zeroY}
            x2={padLeft + plotW}
            y2={zeroY}
            className={styles.svgZeroLine}
          />
        )}

        {/* Vertikale Zeit-Ticks 0 / 6 / 12 / 18 / 24 */}
        {xTicks.map((hour) => {
          const x = padLeft + (hour / 24) * plotW;
          return (
            <g key={`x-tick-${hour}`}>
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={plotBottom}
                className={styles.svgVerticalGrid}
              />
              <text x={x} y={plotBottom + 18} textAnchor="middle" className={styles.svgTickText}>
                {hour}
              </text>
            </g>
          );
        })}

        {/* Kurve 1: Restlast (alle Punkte, ungeschnitten) */}
        <polyline
          fill="none"
          points={loadPolyline}
          className={styles.svgLoadLine}
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Kurve 2: Day-Ahead-Preis (alle Punkte, ungeschnitten) */}
        {hasPrices && pricePolyline.length > 0 && (
          <polyline
            fill="none"
            points={pricePolyline}
            className={styles.svgPriceLine}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Tagesmax & Tagesmin des Preises auf der Kurve */}
        {priceMaxPt && (
          <g>
            <circle cx={priceMaxPt.x} cy={priceMaxPt.y} r={4} className={styles.svgPriceDotMax} />
            <text
              x={priceMaxPt.x}
              y={maxTagY}
              textAnchor={maxTagAnchor}
              className={styles.svgPinLabel}
            >
              Max
            </text>
          </g>
        )}

        {priceMinPt && (
          <g>
            <circle cx={priceMinPt.x} cy={priceMinPt.y} r={4} className={styles.svgPriceDotMin} />
            <text
              x={priceMinPt.x}
              y={minTagY}
              textAnchor={minTagAnchor}
              className={styles.svgPinLabel}
            >
              Min
            </text>
          </g>
        )}

        {/* Exakte Tagesmax/-min Preisbeschriftung mit Uhrzeit & Wert */}
        {priceMaxPt && priceMinPt && (
          <g>
            <circle cx={14} cy={226} r={4} className={styles.svgPriceDotMax} />
            <text x={24} y={230} textAnchor="start" className={styles.svgCalloutText}>
              {`Max ${priceMaxPt.hm}\u00a0Uhr · ${fmtPriceDe.format(priceMaxPt.eurPerMwh)}\u202f€/MWh`}
            </text>

            <circle cx={14} cy={248} r={4} className={styles.svgPriceDotMin} />
            <text x={24} y={252} textAnchor="start" className={styles.svgCalloutText}>
              {`Min ${priceMinPt.hm}\u00a0Uhr · ${fmtPriceDe.format(priceMinPt.eurPerMwh)}\u202f€/MWh`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
