"use client";

import { useMemo, useState } from "react";

import { SvgChartShell } from "@/components/charts/SvgChartShell";
import { nearestIndexFromClientXs } from "@/lib/chartNearestIndex";
import { paretoTooltipRows, paretoTooltipTime } from "@/lib/simulatorChartTooltip";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import type { SimulatorPalette } from "@/components/monat-v1/simulatorPalette";
import { HatchDefs, Knockout, SvgText, TwoLineLabel } from "@/components/monat-v1/simulatorSvg";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import {
  FULL_X,
  FULL_Y,
  ZOOM_X,
  compromisePct,
  formatDec,
  fullReduction,
  mapX,
  mapY,
} from "@/lib/simulatorFahrweisenDerived";
import {
  formatGw,
  formatMioEur,
  pctOfMarket,
  type SimulatorFahrweisenData,
  type SimulatorFrontPoint,
} from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";
import { FrontSlider } from "@/components/monat-v1/FrontSlider";

export function SimulatorParetoSection({ data }: { data: SimulatorFahrweisenData }) {
  const wide = useLayoutWide(1100);
  const { colors } = useSimulatorTheme();
  const [idx, setIdx] = useState(data.defaultIndex);
  const point = data.front[idx]!;
  const mkt = data.endpoints.marketLex;
  const net = data.endpoints.netzLex;
  const e70 = data.endpoints.eps70;
  const voll = fullReduction(mkt.revenueMioEur, net.revenueMioEur);
  const komp = compromisePct(mkt.revenueMioEur, e70.revenueMioEur);

  const ariaFor = (p: SimulatorFrontPoint, label: string) =>
    `${label}: ${p.revenueMioEur.toFixed(2).replace(".", ",")} Millionen Euro Modellschätzung, Senkung ${formatGw(p.reductionGw)}`;

  const frontPts = useMemo(
    () => data.front.map((p) => ({ ...p, xMio: p.revenueMioEur, yGw: p.reductionGw })),
    [data.front],
  );

  return (
    <section className={styles.section} aria-labelledby="sim-g1-title" data-testid="simulator-pareto">
      <p className={styles.eyebrow}>Monatsfront · Monatsspitze, Oktober · Zusatzflotte ×2 (4,64 GW / 8,15 GWh)</p>
      <p className={simStyles.display} aria-hidden="true">
        {komp.costLabel}{"\u00A0"}%
      </p>
      <h2 id="sim-g1-title" className={styles.h1}>
        für 70 Prozent
        <br />
        der Monatssenkung.
      </h2>
      <p className={`${styles.lead} ${simStyles.leadShort}`}>
        Die volle Senkung kostet {voll.vonLabel} Mio.{"\u00A0"}€. Modellschätzung.
      </p>
      <div className={wide ? simStyles.insight3wide : simStyles.insight3}>
        <div>
          {formatGw(e70.reductionGw)}
          <div className={styles.insightMuted}>Senkung · Kompromiss ε-70</div>
        </div>
        <div>
          {formatMioEur(e70.revenueMioEur)}
          <div className={styles.insightMuted}>Erlös · {data.euroLabel}</div>
        </div>
        <div>
          {pctOfMarket(e70.revenueMioEur, mkt.revenueMioEur)}
          <div className={styles.insightMuted}>des Markt-Erlöses</div>
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
        voll={voll}
      />
      <p className={styles.lead}>
        <strong>netzdienlich = senkt die Monatsspitze, nicht jeden Tag.</strong> Auf Tagesbasis gab es im Oktober keinen
        Tag, an dem beide Ziele gleichzeitig optimal waren.
      </p>
      <p className={simStyles.modelNote}>
        Fest ×2, ohne Preisrückwirkung · {data.euroLabel} bei Euro-Zahlen
      </p>
      <FrontSlider
        id="sim-front-range"
        value={idx}
        count={data.front.length}
        namedIndices={[data.namedIndices.markt, data.namedIndices.kompromiss, data.namedIndices.netzdienlich]}
        onChange={setIdx}
        ariaValueText={ariaFor(
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
              <>
              Ein reiner Spitzen-Löser liefert bei ×2 einen „Erlös“ von −3,08 Mio.{"\u00A0"}€ — Löser-Artefakt, kein
              Netz-Endpunkt.
            </>
            </td>
          </tr>
          <tr
            className={
              idx !== data.namedIndices.markt &&
              idx !== data.namedIndices.kompromiss &&
              idx !== data.namedIndices.netzdienlich
                ? simStyles.rowActive
                : undefined
            }
          >
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
        <a href="/monat/2026-10#graph-1" className="v4-text-link">
          siehe Graph 1 auf der Monatsseite
        </a>
        . Analytisch: Restlast 21.10. 14:00 plus Voll-Laden ergibt{" "}
        <span className={simStyles.nowrap}>
          64{"\u00A0"}428{"\u00A0"}MW{"\u00A0"}(
          <a href="/methodik#simulator-kipppunkt" className="v4-text-link">
            Methodik
          </a>
          )
        </span>
        .
      </p>
    </section>
  );
}

type FrontPt = SimulatorFrontPoint & { xMio: number; yGw: number };

function ParetoCharts({
  wide,
  colors,
  frontPts,
  mkt,
  net,
  e70,
  selected,
  voll,
}: {
  wide: boolean;
  colors: SimulatorPalette;
  frontPts: FrontPt[];
  mkt: { revenueMioEur: number; reductionGw: number };
  net: { revenueMioEur: number; reductionGw: number };
  e70: { revenueMioEur: number; reductionGw: number };
  selected: number;
  voll: ReturnType<typeof fullReduction>;
}) {
  return (
    <div className={wide ? simStyles.paretoWide : simStyles.paretoStack}>
      <FullAxisChart wide={wide} colors={colors} frontPts={frontPts} mkt={mkt} e70={e70} voll={voll} />
      <ZoomChart
        wide={wide}
        colors={colors}
        frontPts={frontPts}
        mkt={mkt}
        net={net}
        e70={e70}
        selected={selected}
        voll={voll}
      />
    </div>
  );
}

function FullAxisChart({
  wide,
  colors,
  frontPts,
  mkt,
  e70,
  voll,
}: {
  wide: boolean;
  colors: SimulatorPalette;
  frontPts: FrontPt[];
  mkt: { revenueMioEur: number };
  e70: { reductionGw: number };
  voll: ReturnType<typeof fullReduction>;
}) {
  const vb = wide
    ? { w: 260, h: 360, L: 40, R: 14, T: 32, B: 52 }
    : { w: 350, h: 120, L: 38, R: 16, T: 16, B: 36 };
  const [xmin, xmax] = FULL_X;
  const [ymin, ymax] = FULL_Y;
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const fx = (v: number) => mapX(v, xmin, xmax, plotW, vb.L);
  const fy = (v: number) => mapY(v, ymin, ymax, plotH, vb.T);
  const x70 = fx(0.7 * mkt.revenueMioEur);
  const y70 = fy(e70.reductionGw);
  const wx1 = fx(ZOOM_X[0]);
  const wx2 = fx(ZOOM_X[1]);
  const winW = Math.max(wx2 - wx1, 4) + 2;
  const xticks = wide ? [0, 10, 20, 30, 34] : [0, 20, 34];
  const yticks = wide ? [0, 1, 2, 3, 4] : [0, 4];
  const line = frontPts.map((p) => `${fx(p.xMio)},${fy(p.yGw)}`).join(" ");
  const mid = (wx1 + Math.max(wx2, wx1 + 4)) / 2;
  const aria = `Volle Pareto-Achse, 0 bis 36 Millionen Euro, Zoomfenster ${ZOOM_X[0].toFixed(2).replace(".", ",")}–${ZOOM_X[1].toFixed(2).replace(".", ",")}, ${voll.vonLabel} Millionen Euro`;
  const xs = frontPts.map((p) => fx(p.xMio));
  const pick = (clientX: number, target: HTMLDivElement) =>
    nearestIndexFromClientXs(clientX, target.getBoundingClientRect(), vb.w, xs);

  return (
    <SvgChartShell
      pointCount={frontPts.length}
      pickIndex={pick}
      ariaLabel={aria}
      testId="simulator-g1-full-tooltip"
      tooltip={(i) => {
        const pt = i != null ? frontPts[i] : null;
        return { timeLabel: pt ? paretoTooltipTime(pt) : null, rows: pt ? paretoTooltipRows(pt) : null };
      }}
    >
      {(activeIndex) => (
    <svg
      viewBox={`0 0 ${vb.w} ${vb.h}`}
      className={styles.svg}
      role="img"
      aria-label={aria}
      data-testid="simulator-g1-full"
    >
      <rect x={vb.L} y={vb.T} width={plotW} height={plotH} fill={colors.flaeche} />
      <rect x={x70} y={vb.T} width={fx(xmax) - x70} height={Math.max(0, y70 - vb.T)} fill={colors.field70} />
      {xticks.map((t) => (
        <g key={`x${t}`}>
          <line x1={fx(t)} x2={fx(t)} y1={vb.T} y2={vb.T + plotH} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={fx(t)} y={vb.T + plotH + 16} anchor="middle" fill={colors.muted}>
            {formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      {yticks.map((t) => (
        <g key={`y${t}`}>
          <line x1={vb.L} x2={vb.L + plotW} y1={fy(t)} y2={fy(t)} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={vb.L - 6} y={fy(t) + 4} anchor="end" fill={colors.muted}>
            {formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={y70}
        y2={y70}
        stroke={colors.muted}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <line x1={vb.L} x2={vb.L + plotW} y1={vb.T + plotH} y2={vb.T + plotH} stroke={colors.ink} strokeWidth={1.25} />
      <line x1={vb.L} y1={vb.T} x2={vb.L} y2={vb.T + plotH} stroke={colors.ink} strokeWidth={1.25} />
      <polyline points={line} fill="none" stroke={colors.ink} strokeWidth={2.5} strokeLinejoin="round" />
      {frontPts
        .filter((p) => p.isMarketLex || p.isNetzLex || p.isEps70)
        .map((p) => (
          <circle
            key={p.index}
            cx={fx(p.xMio)}
            cy={fy(p.yGw)}
            r={3.2}
            fill={p.isMarketLex ? colors.rust : colors.ink}
            stroke={colors.flaeche}
            strokeWidth={1}
          />
        ))}
      <rect
        x={wx1 - 1}
        y={vb.T}
        width={winW}
        height={plotH}
        fill={colors.rustTint}
        stroke={colors.rust}
        strokeWidth={1.5}
      />
      {wide ? (
        <>
          <SvgText x={vb.L} y={16} fill={colors.ink} weight={500}>
            Volle Achse
          </SvgText>
          <SvgText x={wx1 - 6} y={vb.T - 6} fill={colors.ink} weight={500} anchor="end">
            Zoom
          </SvgText>
          <SvgText x={mid} y={vb.T + plotH + 34} fill={colors.ink} weight={500} anchor="middle">
            {voll.costMioLabel}
          </SvgText>
        </>
      ) : (
        <>
          <SvgText x={vb.L} y={12} fill={colors.ink} weight={500}>
            Volle Achse
          </SvgText>
          <SvgText x={vb.L + plotW} y={12} fill={colors.ink} weight={500} anchor="end">
            {voll.vonLabel}
            {"  ·  "}Zoom
          </SvgText>
        </>
      )}
      {activeIndex != null ? (
        <line
          x1={xs[activeIndex]}
          x2={xs[activeIndex]}
          y1={vb.T}
          y2={vb.T + plotH}
          className="v4-chart-crosshair"
        />
      ) : null}
    </svg>
      )}
    </SvgChartShell>
  );
}

function ZoomChart({
  wide,
  colors,
  frontPts,
  mkt,
  net,
  e70,
  selected,
  voll,
}: {
  wide: boolean;
  colors: SimulatorPalette;
  frontPts: FrontPt[];
  mkt: { revenueMioEur: number; reductionGw: number };
  net: { revenueMioEur: number; reductionGw: number };
  e70: { revenueMioEur: number; reductionGw: number };
  selected: number;
  voll: ReturnType<typeof fullReduction>;
}) {
  const vb = wide
    ? { w: 868, h: 360, L: 52, R: 36, T: 32, B: 54 }
    : { w: 350, h: 300, L: 48, R: 18, T: 26, B: 54 };
  const [xmin, xmax] = ZOOM_X;
  const [ymin, ymax] = FULL_Y;
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const fx = (v: number) => mapX(v, xmin, xmax, plotW, vb.L);
  const fy = (v: number) => mapY(v, ymin, ymax, plotH, vb.T);
  const y70 = fy(e70.reductionGw);
  const xticks = wide ? [33.7, 33.8, 33.9, 34.0, 34.1] : [33.7, 33.9, 34.1];
  const yticks = wide ? [1, 2, 3, 4] : [2, 4];
  const line = frontPts.map((p) => `${fx(p.xMio)},${fy(p.yGw)}`).join(" ");
  const named = {
    markt: frontPts.find((p) => p.isMarketLex)!,
    netz: frontPts.find((p) => p.isNetzLex)!,
    komp: frontPts.find((p) => p.isEps70)!,
  };
  const mx = fx(named.markt.xMio);
  const my = fy(named.markt.yGw);
  const nx = fx(named.netz.xMio);
  const ny = fy(named.netz.yGw);
  const kx = fx(named.komp.xMio);
  const ky = fy(named.komp.yGw);
  const sel = frontPts.find((p) => p.index === selected) ?? named.komp;
  const sx = fx(sel.xMio);
  const sy = fy(sel.yGw);
  const valN = `${formatDec(net.revenueMioEur)}  ·  ${formatGw(net.reductionGw)}`;
  const valK = `${formatDec(e70.revenueMioEur)}  ·  ${formatGw(e70.reductionGw)}`;
  const valM = `${formatDec(mkt.revenueMioEur)}  ·  ${formatGw(mkt.reductionGw)}`;
  const zoomRange = `${formatDec(ZOOM_X[0], 2)}–${formatDec(ZOOM_X[1], 2)}`;
  const aria = `Zoom der Pareto-Front zwischen ${zoomRange} Millionen Euro. ${voll.fullCostSentence}`;
  const xs = frontPts.map((p) => fx(p.xMio));
  const pick = (clientX: number, target: HTMLDivElement) =>
    nearestIndexFromClientXs(clientX, target.getBoundingClientRect(), vb.w, xs);

  return (
    <SvgChartShell
      pointCount={frontPts.length}
      pickIndex={pick}
      ariaLabel={aria}
      testId="simulator-g1-zoom-tooltip"
      tooltip={(i) => {
        const pt = i != null ? frontPts[i] : null;
        return { timeLabel: pt ? paretoTooltipTime(pt) : null, rows: pt ? paretoTooltipRows(pt) : null };
      }}
    >
      {(activeIndex) => (
    <svg
      viewBox={`0 0 ${vb.w} ${vb.h}`}
      className={styles.svg}
      role="img"
      aria-label={aria}
      data-testid="simulator-g1-zoom"
    >
      <rect x={vb.L} y={vb.T} width={plotW} height={plotH} fill={colors.flaeche} />
      <rect x={vb.L} y={vb.T} width={plotW} height={Math.max(0, y70 - vb.T)} fill={colors.field70} />
      {xticks.map((t) => (
        <g key={`zx${t}`}>
          <line x1={fx(t)} x2={fx(t)} y1={vb.T} y2={vb.T + plotH} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={fx(t)} y={vb.T + plotH + 16} anchor="middle" fill={colors.muted}>
            {formatDec(t, wide ? 2 : 1)}
          </SvgText>
        </g>
      ))}
      {yticks.map((t) => (
        <g key={`zy${t}`}>
          <line x1={vb.L} x2={vb.L + plotW} y1={fy(t)} y2={fy(t)} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={vb.L - 8} y={fy(t) + 4} anchor="end" fill={colors.muted}>
            {formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={y70}
        y2={y70}
        stroke={colors.muted}
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <SvgText x={vb.L - 8} y={y70 + 4} anchor="end" fill={colors.ink} weight={500}>
        {formatDec(e70.reductionGw)}
      </SvgText>
      <line x1={vb.L} x2={vb.L + plotW} y1={vb.T + plotH} y2={vb.T + plotH} stroke={colors.ink} strokeWidth={1.25} />
      <line x1={vb.L} y1={vb.T} x2={vb.L} y2={vb.T + plotH} stroke={colors.ink} strokeWidth={1.25} />
      <SvgText x={(vb.L + vb.L + plotW) / 2} y={vb.h - 8} anchor="middle" fill={colors.muted}>
        Day-Ahead-Erlös, Mio.{"\u00A0"}€ · Modellschätzung
      </SvgText>
      {wide ? (
        <SvgText x={vb.L} y={16} fill={colors.ink} weight={500}>
          Zoom {zoomRange} · Senkung in GW
        </SvgText>
      ) : (
        <SvgText x={vb.L} y={12} fill={colors.ink} weight={500}>
          Senkung, GW
        </SvgText>
      )}
      <Knockout
        x={vb.L + (wide ? 8 : 6)}
        y={y70 - 22}
        width={wide ? 188 : 156}
        height={16}
        fill={colors.flaeche}
        opacity={0.92}
      />
      <SvgText x={vb.L + (wide ? 10 : 8)} y={y70 - 10} fill={colors.ink}>
        70{"\u00A0"}% der max. Senkung
      </SvgText>
      <polyline points={line} fill="none" stroke={colors.ink} strokeWidth={2.5} strokeLinejoin="round" />
      {frontPts
        .filter((p) => !p.isMarketLex && !p.isNetzLex && !p.isEps70)
        .map((p) => (
          <circle
            key={p.index}
            cx={fx(p.xMio)}
            cy={fy(p.yGw)}
            r={3}
            fill={colors.flaeche}
            stroke={colors.ink}
            strokeWidth={1.25}
          />
        ))}
      <circle cx={mx} cy={my} r={6} fill={colors.rust} stroke={colors.flaeche} strokeWidth={1.5} />
      <circle cx={nx} cy={ny} r={6} fill={colors.ink} stroke={colors.flaeche} strokeWidth={1.5} />
      <circle cx={kx} cy={ky} r={6} fill={colors.ink} stroke={colors.flaeche} strokeWidth={1.5} />
      <circle cx={sx} cy={sy} r={11} fill="none" stroke={colors.rust} strokeWidth={2.25} />
      <circle
        cx={sx}
        cy={sy}
        r={6}
        fill={sel.isMarketLex ? colors.rust : colors.ink}
        stroke={colors.flaeche}
        strokeWidth={1.5}
      />
      {wide ? (
        <>
          <TwoLineLabel
            x={nx + 12}
            y1={ny - 4}
            line1="Netzdienlich"
            line2={valN}
            anchor="start"
            fill={colors.ink}
            bg={colors.flaeche}
          />
          <TwoLineLabel
            x={kx + 12}
            y1={ky + 16}
            line1="Kompromiss"
            line2={valK}
            anchor="start"
            fill={colors.ink}
            bg={colors.flaeche}
          />
          <TwoLineLabel
            x={mx - 12}
            y1={my - 8}
            line1="Max. Erlös"
            line2={valM}
            anchor="end"
            fill={colors.ink}
            bg={colors.flaeche}
          />
          <CostBracket xL={nx} xR={mx} y={vb.T + 14} colors={colors} sentence={voll.fullCostSentence} />
        </>
      ) : (
        <>
          <TwoLineLabel
            x={nx + 10}
            y1={ny - 20}
            line1="Netzdienlich"
            line2={valN}
            anchor="start"
            fill={colors.ink}
            bg={colors.flaeche}
          />
          <TwoLineLabel
            x={kx - 10}
            y1={ky + 22}
            line1="Kompromiss"
            line2={valK}
            anchor="end"
            fill={colors.ink}
            bg={colors.flaeche}
          />
          <TwoLineLabel
            x={mx - 10}
            y1={my - 6}
            line1="Max. Erlös"
            line2={valM}
            anchor="end"
            fill={colors.ink}
            bg={colors.flaeche}
          />
        </>
      )}
      {activeIndex != null ? (
        <line
          x1={xs[activeIndex]}
          x2={xs[activeIndex]}
          y1={vb.T}
          y2={vb.T + plotH}
          className="v4-chart-crosshair"
        />
      ) : null}
    </svg>
      )}
    </SvgChartShell>
  );
}

function CostBracket({
  xL,
  xR,
  y,
  colors,
  sentence,
}: {
  xL: number;
  xR: number;
  y: number;
  colors: SimulatorPalette;
  sentence: string;
}) {
  const mid = (xL + xR) / 2;
  return (
    <g>
      <line x1={xL} y1={y} x2={xR} y2={y} stroke={colors.ink} strokeWidth={1} />
      <line x1={xL} y1={y - 4} x2={xL} y2={y + 4} stroke={colors.ink} strokeWidth={1} />
      <line x1={xR} y1={y - 4} x2={xR} y2={y + 4} stroke={colors.ink} strokeWidth={1} />
      <Knockout x={mid - 110} y={y - 16} width={220} height={16} fill={colors.flaeche} opacity={0.92} />
      <SvgText x={mid} y={y - 5} anchor="middle" fill={colors.ink} weight={500}>
        {sentence}
      </SvgText>
    </g>
  );
}
