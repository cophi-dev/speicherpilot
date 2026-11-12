"use client";

import { useMemo, useState } from "react";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import {
  formatGw,
  formatMioEur,
  pctOfMarket,
  type SimulatorFahrweisenData,
  type SimulatorFrontPoint,
} from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

const FULL_X = [0, 36] as const;
const FULL_Y = [0, 4.2] as const;
const ZOOM_X = [33.7, 34.18] as const;

function mapX(v: number, xmin: number, xmax: number, plotW: number, padL: number) {
  return padL + ((v - xmin) / (xmax - xmin)) * plotW;
}

function mapY(v: number, ymin: number, ymax: number, plotH: number, padT: number) {
  return padT + plotH - ((v - ymin) / (ymax - ymin)) * plotH;
}

export function SimulatorParetoSection({ data }: { data: SimulatorFahrweisenData }) {
  const wide = useLayoutWide(1100);
  const { colors } = useSimulatorTheme();
  const [idx, setIdx] = useState(data.defaultIndex);
  const point = data.front[idx]!;
  const mkt = data.endpoints.marketLex;
  const net = data.endpoints.netzLex;
  const e70 = data.endpoints.eps70;
  const costDeltaMio = mkt.revenueMioEur - net.revenueMioEur;
  const costPct = ((costDeltaMio / mkt.revenueMioEur) * 100).toFixed(2).replace(".", ",");
  const displayPct = (((mkt.revenueMioEur - e70.revenueMioEur) / mkt.revenueMioEur) * 100)
    .toFixed(2)
    .replace(".", ",");

  const ariaFor = (p: SimulatorFrontPoint, label: string) =>
    `${label}: ${p.revenueMioEur.toFixed(2).replace(".", ",")} Millionen Euro Modellschätzung, Senkung ${formatGw(p.reductionGw)}`;

  const frontPts = useMemo(() => data.front.map((p) => ({ ...p, xMio: p.revenueMioEur, yGw: p.reductionGw })), [data.front]);

  return (
    <section className={styles.section} aria-labelledby="sim-g1-title" data-testid="simulator-pareto">
      <p className={styles.eyebrow}>Monatsfront · Monatsspitze, Oktober · Zusatzflotte ×2 (4,64 GW / 8,15 GWh)</p>
      <p className={simStyles.display} aria-hidden="true">
        {displayPct}%
      </p>
      <h2 id="sim-g1-title" className={styles.h1}>
        für 70 Prozent
        <br />
        der Monatssenkung.
      </h2>
      <p className={styles.lead}>
        Die volle Senkung kostet 0,30 von 34,09 Mio. €. Modellschätzung, Endpunkte lexikographisch.{" "}
        <strong>netzdienlich = senkt die Monatsspitze, nicht jeden Tag.</strong> Auf Tagesbasis gab es im Oktober keinen
        Tag, an dem beide Ziele gleichzeitig optimal waren.
      </p>
      <p className={simStyles.modelNote}>
        Fest ×2, ohne Preisrückwirkung · {data.euroLabel} bei Euro-Zahlen
      </p>
      <div className={styles.insight}>
        <div>
          {formatGw(e70.reductionGw)}
          <div className={styles.insightMuted}>Senkung · Kompromiss ε-70</div>
        </div>
        <div>
          {formatMioEur(e70.revenueMioEur)}
          <div className={styles.insightMuted}>Erlös · {pctOfMarket(e70.revenueMioEur, mkt.revenueMioEur)} des Markts</div>
        </div>
      </div>
      <ParetoCharts
        wide={wide}
        colors={colors}
        frontPts={frontPts}
        mkt={mkt}
        net={net}
        e70={e70}
        selected={idx}
        costDeltaMio={costDeltaMio}
        costPct={costPct}
      />
      <div className={simStyles.sliderRow}>
        <label className={simStyles.sliderLabel} htmlFor="sim-front-range">
          Fahrweise
        </label>
        <input
          id="sim-front-range"
          className={simStyles.range}
          type="range"
          min={0}
          max={data.front.length - 1}
          step={1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={data.front.length - 1}
          aria-valuenow={idx}
          aria-valuetext={ariaFor(
            point,
            idx === data.namedIndices.markt
              ? "Maximaler Erlös"
              : idx === data.namedIndices.netzdienlich
                ? "Netzdienlich"
                : idx === data.namedIndices.kompromiss
                  ? "Kompromiss"
                  : "Frontpunkt",
          )}
        />
        <div className={simStyles.namedButtons} role="group" aria-label="Benannte Fahrweisen">
          {(
            [
              ["markt", "Max. Erlös"],
              ["kompromiss", "Kompromiss"],
              ["netzdienlich", "Netzdienlich"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={simStyles.namedBtn}
              aria-pressed={idx === data.namedIndices[key]}
              onClick={() => setIdx(data.namedIndices[key])}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <table className={styles.valuesTable} aria-label="Fahrweisen nach Frontpunkt">
        <thead>
          <tr>
            <th scope="col">Fahrweise</th>
            <th scope="col">Erlös ({data.euroLabel})</th>
            <th scope="col">Senkung</th>
            <th scope="col">Spitze</th>
          </tr>
        </thead>
        <tbody>
          <tr className={idx === data.namedIndices.markt ? simStyles.rowActive : undefined}>
            <th scope="row">Max. Erlös</th>
            <td>{formatMioEur(mkt.revenueMioEur)}</td>
            <td>{formatGw(mkt.reductionGw)}</td>
            <td>{formatGw(mkt.peakGw)}</td>
          </tr>
          <tr className={idx === data.namedIndices.kompromiss ? simStyles.rowActive : undefined}>
            <th scope="row">Kompromiss (ε-70)</th>
            <td>
              {formatMioEur(e70.revenueMioEur)} ({pctOfMarket(e70.revenueMioEur, mkt.revenueMioEur)})
            </td>
            <td>{formatGw(e70.reductionGw)}</td>
            <td>{formatGw(e70.peakGw)}</td>
          </tr>
          <tr className={idx === data.namedIndices.netzdienlich ? simStyles.rowActive : undefined}>
            <th scope="row">Netzdienlich</th>
            <td>{formatMioEur(net.revenueMioEur)}</td>
            <td>{formatGw(net.reductionGw)}</td>
            <td>{formatGw(net.peakGw)}</td>
          </tr>
          <tr>
            <td colSpan={4} className={simStyles.arteFakt}>
              {data.endpoints.solverArtefactNote}
            </td>
          </tr>
          <tr className={idx !== data.namedIndices.markt && idx !== data.namedIndices.kompromiss && idx !== data.namedIndices.netzdienlich ? simStyles.rowActive : undefined}>
            <th scope="row">Auswahl (λ-Punkt)</th>
            <td>{formatMioEur(point.revenueMioEur)}</td>
            <td>{formatGw(point.reductionGw)}</td>
            <td>{formatGw(point.peakGw)}</td>
          </tr>
        </tbody>
      </table>
      <p className={styles.figcaption}>{MONAT_V1_GRAPH_CAPTION}</p>
      <p className={simStyles.kipppunktHint}>
        Kipppunkt neue Monatsspitze unter Markt-Fahrplan ≈×3,9 (Preisnehmer) —{" "}
        <a href="#monat-v1-a1" className="v4-text-link">
          siehe Graph 1 oben
        </a>
        . Analytisch: Restlast 21.10. 14:00 plus Voll-Laden ergibt 64 428 MW (
        <a href="/methodik#simulator-kipppunkt" className="v4-text-link">
          Methodik
        </a>
        ).
      </p>
    </section>
  );
}

function ParetoCharts({
  wide,
  colors,
  frontPts,
  mkt,
  net,
  e70,
  selected,
  costDeltaMio,
  costPct,
}: {
  wide: boolean;
  colors: ReturnType<typeof import("@/components/monat-v1/simulatorPalette").simulatorPalette>;
  frontPts: Array<{ index: number; xMio: number; yGw: number; isMarketLex: boolean; isNetzLex: boolean; isEps70: boolean }>;
  mkt: { revenueMioEur: number; reductionGw: number };
  net: { revenueMioEur: number; reductionGw: number };
  e70: { revenueMioEur: number; reductionGw: number };
  selected: number;
  costDeltaMio: number;
  costPct: string;
}) {
  const fullVb = wide
    ? { w: 260, h: 360, L: 40, R: 14, T: 32, B: 52 }
    : { w: 350, h: 120, L: 38, R: 16, T: 16, B: 36 };
  const zoomVb = wide
    ? { w: 868, h: 360, L: 52, R: 36, T: 32, B: 54 }
    : { w: 350, h: 300, L: 48, R: 18, T: 26, B: 54 };

  const renderChart = (zoom: boolean) => {
    const vb = zoom ? zoomVb : fullVb;
    const [xmin, xmax] = zoom ? ZOOM_X : FULL_X;
    const [ymin, ymax] = FULL_Y;
    const plotW = vb.w - vb.L - vb.R;
    const plotH = vb.h - vb.T - vb.B;
    const line = frontPts
      .map((p) => `${mapX(p.xMio, xmin, xmax, plotW, vb.L)},${mapY(p.yGw, ymin, ymax, plotH, vb.T)}`)
      .join(" ");
    const x70 = 0.7 * mkt.revenueMioEur;
    const y70 = 0.7 * net.reductionGw;
    const title = zoom
      ? `Zoom ${ZOOM_X[0].toFixed(2).replace(".", ",")}–${ZOOM_X[1].toFixed(2).replace(".", ",")} Mio. € Erlös`
      : "Volle Achse Day-Ahead-Erlös";
    return (
      <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-label={title}>
        {zoom ? (
          <rect
            x={mapX(x70, xmin, xmax, plotW, vb.L)}
            y={vb.T}
            width={mapX(xmax, xmin, xmax, plotW, vb.L) - mapX(x70, xmin, xmax, plotW, vb.L)}
            height={mapY(y70, ymin, ymax, plotH, vb.T) - vb.T}
            fill={colors.field70}
          />
        ) : null}
        {zoom ? (
          <line
            x1={vb.L}
            x2={vb.L + plotW}
            y1={mapY(e70.reductionGw, ymin, ymax, plotH, vb.T)}
            y2={mapY(e70.reductionGw, ymin, ymax, plotH, vb.T)}
            stroke={colors.muted}
            strokeWidth={1}
            strokeDasharray="5 4"
          />
        ) : null}
        {[0, 1, 2, 3, 4].map((t) => {
          if (!zoom && t > 0 && t < 4) return null;
          const yv = zoom ? t : t === 4 ? 4 : t * (wide ? 1 : 4);
          const y = mapY(yv, ymin, ymax, plotH, vb.T);
          return (
            <g key={`y${t}`}>
              <line x1={vb.L} x2={vb.L + plotW} y1={y} y2={y} stroke={colors.grid} strokeWidth={1} />
              <text x={vb.L - 4} y={y + 4} textAnchor="end" fill={colors.muted} fontSize="12">
                {zoom ? (t === 0 ? "" : String(yv)) : yv}
              </text>
            </g>
          );
        })}
        <polyline points={line} fill="none" stroke={colors.ink} strokeWidth={2.5} strokeLinejoin="round" />
        {frontPts.map((p) => {
          const cx = mapX(p.xMio, xmin, xmax, plotW, vb.L);
          const cy = mapY(p.yGw, ymin, ymax, plotH, vb.T);
          const isSel = p.index === selected;
          const r = p.isMarketLex || p.isNetzLex || p.isEps70 ? 6 : 3;
          return (
            <g key={p.index}>
              {isSel ? <circle cx={cx} cy={cy} r={11} fill="none" stroke={colors.rust} strokeWidth={2.25} /> : null}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={p.isMarketLex ? colors.rust : colors.flaeche}
                stroke={p.isMarketLex ? colors.rust : colors.ink}
                strokeWidth={p.isMarketLex ? 0 : 1.25}
              />
            </g>
          );
        })}
        {!zoom ? (
          <rect
            x={mapX(ZOOM_X[0], xmin, xmax, plotW, vb.L)}
            y={vb.T}
            width={mapX(ZOOM_X[1], xmin, xmax, plotW, vb.L) - mapX(ZOOM_X[0], xmin, xmax, plotW, vb.L)}
            height={plotH}
            fill={colors.rust}
            fillOpacity={0.12}
            stroke={colors.rust}
            strokeWidth={1.5}
          />
        ) : null}
        <text x={vb.L} y={vb.T - 8} fill={colors.ink} fontSize="12" fontWeight="500">
          {zoom ? "Senkung, GW" : "Volle Achse"}
        </text>
        {!zoom ? (
          <text x={vb.L + plotW} y={vb.T - 8} textAnchor="end" fill={colors.muted} fontSize="12">
            0,30 von 34,09 · Zoom
          </text>
        ) : (
          <text x={vb.L + plotW / 2} y={vb.h - 12} textAnchor="middle" fill={colors.muted} fontSize="12">
            Day-Ahead-Erlös, Mio. € · Modellschätzung
          </text>
        )}
        {zoom ? (
          <text x={vb.L + 8} y={mapY(e70.reductionGw, ymin, ymax, plotH, vb.T) - 10} fill={colors.muted} fontSize="12">
            70 % der max. Senkung
          </text>
        ) : null}
        {zoom ? (
          <text x={vb.L + plotW / 2} y={vb.T + 14} textAnchor="middle" fill={colors.muted} fontSize="12">
            volle Senkung {formatMioEur(costDeltaMio)} ({costPct} %)
          </text>
        ) : null}
      </svg>
    );
  };

  return (
    <div className={wide ? simStyles.paretoWide : simStyles.paretoStack}>
      {renderChart(false)}
      {renderChart(true)}
    </div>
  );
}
