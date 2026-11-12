"use client";

import { SvgChartShell } from "@/components/charts/SvgChartShell";
import { nearestIndexFromClientXs } from "@/lib/chartNearestIndex";
import { beispieltagTooltipRows, beispieltagTooltipTime } from "@/lib/simulatorChartTooltip";
import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import type { SimulatorPalette } from "@/components/monat-v1/simulatorPalette";
import { HatchDefs, Knockout, SvgText } from "@/components/monat-v1/simulatorSvg";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import {
  DAY_Y,
  berlinHour,
  deriveExampleDay,
  formatDec,
  mapY,
  xHour,
  type ExampleDayMetrics,
} from "@/lib/simulatorFahrweisenDerived";
import type { SimulatorDispatchRow, SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";
import { formatGw, formatMioEur } from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

export function SimulatorBeispieltageSection({ data }: { data: SimulatorFahrweisenData }) {
  const wide = useLayoutWide(1100);
  const { colors } = useSimulatorTheme();
  const d21 = deriveExampleDay(data, "2026-10-21");
  const d29 = deriveExampleDay(data, "2026-10-29");
  const baseline = data.baselinePeakGw;
  const costPct = Math.round(d21.kompDayCostPct);

  return (
    <section className={styles.section} aria-labelledby="sim-g3-title" data-testid="simulator-beispieltage">
      <p className={styles.eyebrow}>Tageshorizont · Übergang zu /tag</p>
      <h2 id="sim-g3-title" className={styles.h2}>
        Am 21.10. lädt der Markt mittags. Am 29.10. liegt der Preis eine Stunde vor der Spitze.
      </h2>
      <p className={styles.lead}>
        Drei Fahrpläne auf derselben Restlast. Am 21.10. kostet der 70-Prozent-Kompromiss {costPct}
        {"\u00A0"}% des Tageserlöses ({formatMioEur(d21.kompDayRevMio)} statt {formatMioEur(d21.marketDayRevMio)}) —
        deutlich mehr als im Monatsmaßstab. Graues Band 23–24 Uhr: SoC-Rückkehr, Modellartefakt, kein Netzeffekt.
      </p>
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.dotHollow} style={{ borderColor: colors.muted }} /> Beobachtet
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} style={{ background: colors.rust }} /> Max. Erlös
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotFilled} style={{ background: colors.ink }} /> Netzdienlich
        </span>
        <span className={styles.legendItem}>Kompromiss (gestrichelt)</span>
        <span className={styles.legendItem}>
          <span className={styles.dotFilled} style={{ background: colors.rustTint }} /> Markt lädt
        </span>
      </div>
      <div className={wide ? simStyles.g3Wide : simStyles.g3Stack}>
        <DayChart
          date="2026-10-21"
          data={data}
          metrics={d21}
          wide={wide}
          colors={colors}
          baselineGw={baseline}
          title="21.10."
          subtitle={`Markt lädt mittags, neue Tagesspitze ${formatGw(d21.marketPeakGw)}`}
        />
        <DayChart
          date="2026-10-29"
          data={data}
          metrics={d29}
          wide={wide}
          colors={colors}
          baselineGw={baseline}
          title="29.10."
          subtitle={`Preismaximum ${d29.maxPriceLabel}, Restlastspitze ${d29.observedLabel}`}
        />
      </div>
      <p className={styles.figcaption}>
        {MONAT_V1_GRAPH_CAPTION}. Gleiche y-Achse 20–70{"\u00A0"}GW auf beiden Tagen, Zeitzone Europe/Berlin,
        15-min-Auflösung: die gehobene Spitze am 21.10. ({formatDec(d21.marketPeakGw)}) bleibt unter der Monatsspitze (
        {formatDec(baseline)}); dasselbe Laden überschreitet sie ab ×3,9.
      </p>
    </section>
  );
}

function DayChart({
  date,
  data,
  metrics,
  wide,
  colors,
  baselineGw,
  title,
  subtitle,
}: {
  date: string;
  data: SimulatorFahrweisenData;
  metrics: ExampleDayMetrics;
  wide: boolean;
  colors: SimulatorPalette;
  baselineGw: number;
  title: string;
  subtitle: string;
}) {
  const day = data.exampleDays[date]!;
  const market = day.modes.price;
  const netz = day.modes.peak;
  const komp = day.modes.eps70;
  const is21 = date.endsWith("21");
  const vb = wide
    ? { w: 560, L: 44, R: 16, T: 36, B: 28, topH: 240, priceH: 70, midH: 8 }
    : { w: 350, L: 40, R: 12, T: 40, B: 28, topH: 220, priceH: 70, midH: 8 };
  const VH = vb.T + vb.topH + vb.midH + vb.priceH + vb.B;
  const plotW = vb.w - vb.L - vb.R;
  const residualT = vb.T;
  const priceT = vb.T + vb.topH + vb.midH;
  const [ya, yb] = DAY_Y;
  const yR = (gw: number) => mapY(gw, ya, yb, vb.topH, residualT);
  const xH = (h: number) => xHour(h, vb.L, plotW);
  const xRow = (r: SimulatorDispatchRow) => xH(berlinHour(r.ts).hour);
  const x23 = xH(23);
  const x24 = xH(24);
  const hatchId = `d${date.replace(/-/g, "")}${wide ? "w" : "n"}`;
  const pmax = is21 ? 320 : 600;
  const pmin = 0;
  const yP = (pv: number) => priceT + ((pmax - pv) / (pmax - pmin)) * vb.priceH;
  const priceTicks = is21 ? [0, 200] : [0, 300];
  const yTicks = wide ? [20, 30, 40, 50, 60, 70] : [20, 40, 60, 70];
  const stepW = (plotW / 24) * 0.25 + 0.3;
  const poly = (rows: SimulatorDispatchRow[], getter: (r: SimulatorDispatchRow) => number) =>
    rows.map((r) => `${xRow(r)},${yR(getter(r))}`).join(" ");
  const aria = is21
    ? `Restlast und Fahrpläne am 21.10., Europe/Berlin, 15 Minuten. Neue Tagesspitze ${formatGw(metrics.marketPeakGw)} um ${metrics.marketPeakLabel}, beobachtet ${formatGw(metrics.observedPeakGw)} um ${metrics.observedLabel}.`
    : `Restlast und Fahrpläne am 29.10., Europe/Berlin, 15 Minuten. Preismaximum ${formatDec(metrics.maxPrice, 0)} Euro je Megawattstunde um ${metrics.maxPriceLabel}, Restlastspitze ${formatGw(metrics.observedPeakGw)} um ${metrics.observedLabel}, Markt noch ${formatGw(metrics.marketDischargeAtObservedGw)} übrig.`;
  const xs = market.map((r) => xRow(r));
  const pick = (clientX: number, target: HTMLDivElement) =>
    nearestIndexFromClientXs(clientX, target.getBoundingClientRect(), vb.w, xs);

  return (
    <SvgChartShell
      pointCount={market.length}
      pickIndex={pick}
      ariaLabel={aria}
      testId={`simulator-g3-${is21 ? "21" : "29"}-tooltip`}
      tooltip={(i) => {
        if (i == null) {
          return { timeLabel: null, rows: null };
        }
        const m = market[i];
        const n = netz[i];
        const k = komp[i];
        if (!m || !n || !k) {
          return { timeLabel: null, rows: null };
        }
        return { timeLabel: beispieltagTooltipTime(m), rows: beispieltagTooltipRows(m, n, k) };
      }}
    >
      {(activeIndex) => (
    <svg
      viewBox={`0 0 ${vb.w} ${VH}`}
      className={styles.svg}
      role="img"
      aria-label={aria}
      data-testid={`simulator-g3-${is21 ? "21" : "29"}`}
    >
      <HatchDefs id={hatchId} color={colors.muted} />
      <rect x={vb.L} y={residualT} width={plotW} height={vb.topH} fill={colors.flaeche} />
      <rect x={vb.L} y={priceT} width={plotW} height={vb.priceH} fill={colors.flaeche} />
      <rect
        x={x23}
        y={residualT}
        width={x24 - x23}
        height={vb.topH}
        fill={`url(#hatch-soc-${hatchId})`}
      />
      <rect
        x={x23}
        y={priceT}
        width={x24 - x23}
        height={vb.priceH}
        fill={`url(#hatch-soc-${hatchId})`}
      />
      {yTicks.map((t) => (
        <g key={`ry${t}`}>
          <line x1={vb.L} x2={vb.L + plotW} y1={yR(t)} y2={yR(t)} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={vb.L - 6} y={yR(t) + 4} anchor="end" fill={colors.muted}>
            {formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={yR(baselineGw)}
        y2={yR(baselineGw)}
        stroke={colors.muted}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      {is21 ? (
        <SvgText x={vb.L + plotW - 2} y={yR(baselineGw) - 6} fill={colors.muted} anchor="end">
          {wide ? `Monatsspitze ${formatDec(baselineGw)}` : formatDec(baselineGw)}
        </SvgText>
      ) : wide ? (
        <SvgText x={vb.L + 6} y={yR(baselineGw) - 6} fill={colors.muted}>
          Monatsspitze {formatDec(baselineGw)}
        </SvgText>
      ) : (
        <SvgText x={vb.L + 6} y={yR(baselineGw) - 6} fill={colors.muted}>
          {formatDec(baselineGw)}
        </SvgText>
      )}
      {market.slice(0, -1).map((r, i) => {
        const next = market[i + 1]!;
        const resid = r.residualMw / 1000;
        const prime = r.residualPrimeMw / 1000;
        const x = xRow(r);
        if (prime > resid + 0.02) {
          return (
            <rect
              key={`ch${i}`}
              x={x}
              y={yR(prime)}
              width={stepW}
              height={yR(resid) - yR(prime)}
              fill={colors.rustTint}
            />
          );
        }
        if (resid > prime + 0.02) {
          return (
            <rect
              key={`dc${i}`}
              x={x}
              y={yR(resid)}
              width={stepW}
              height={yR(prime) - yR(resid)}
              fill={colors.inkTint}
            />
          );
        }
        return null;
      })}
      <polyline
        points={poly(market, (r) => r.residualMw / 1000)}
        fill="none"
        stroke={colors.muted}
        strokeWidth={1.5}
      />
      <polyline
        points={poly(netz, (r) => r.residualPrimeMw / 1000)}
        fill="none"
        stroke={colors.ink}
        strokeWidth={2}
      />
      <polyline
        points={poly(komp, (r) => r.residualPrimeMw / 1000)}
        fill="none"
        stroke={colors.ink}
        strokeWidth={1.75}
        strokeDasharray="6 4"
      />
      <polyline
        points={poly(market, (r) => r.residualPrimeMw / 1000)}
        fill="none"
        stroke={colors.rust}
        strokeWidth={2.25}
      />
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={residualT + vb.topH}
        y2={residualT + vb.topH}
        stroke={colors.ink}
        strokeWidth={1.25}
      />
      <line x1={vb.L} y1={residualT} x2={vb.L} y2={residualT + vb.topH} stroke={colors.ink} strokeWidth={1.25} />
      {[0, 6, 12, 18, 24].map((h) => (
        <line
          key={`tick${h}`}
          x1={xH(h)}
          x2={xH(h)}
          y1={residualT + vb.topH}
          y2={residualT + vb.topH + 4}
          stroke={colors.ink}
          strokeWidth={1}
        />
      ))}
      <SvgText x={vb.L} y={16} fill={colors.ink} weight={500}>
        {title}
      </SvgText>
      {wide ? (
        <SvgText x={vb.L + plotW} y={16} fill={colors.muted} anchor="end">
          {subtitle}
        </SvgText>
      ) : null}

      {is21 ? (
        <Day21Labels metrics={metrics} xH={xH} yR={yR} vb={vb} plotW={plotW} colors={colors} wide={wide} x23={x23} />
      ) : (
        <Day29Labels metrics={metrics} xH={xH} yR={yR} colors={colors} wide={wide} />
      )}

      <SvgText x={x23 - 6} y={priceT + vb.priceH - 6} fill={colors.muted} anchor="end">
        SoC-Rückkehr · Modellartefakt
      </SvgText>

      {priceTicks.map((t) => (
        <g key={`pt${t}`}>
          <line x1={vb.L} x2={vb.L + plotW} y1={yP(t)} y2={yP(t)} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={vb.L - 6} y={yP(t) + 4} anchor="end" fill={colors.muted}>
            {formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      <polyline
        points={market.map((r) => `${xRow(r)},${yP(r.priceEurMwh)}`).join(" ")}
        fill="none"
        stroke={colors.ink}
        strokeWidth={1.5}
      />
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={priceT + vb.priceH}
        y2={priceT + vb.priceH}
        stroke={colors.ink}
        strokeWidth={1.25}
      />
      <line x1={vb.L} y1={priceT} x2={vb.L} y2={priceT + vb.priceH} stroke={colors.ink} strokeWidth={1.25} />
      <SvgText x={vb.L} y={priceT - 2} fill={colors.muted}>
        €/MWh
      </SvgText>
      {[0, 6, 12, 18, 24].map((h) => {
        const anc: "start" | "middle" | "end" = h === 0 ? "start" : h === 24 ? "end" : "middle";
        return (
          <SvgText key={`h${h}`} x={xH(h)} y={priceT + vb.priceH + 18} anchor={anc} fill={colors.muted}>
            {String(h).padStart(2, "0")}
          </SvgText>
        );
      })}
      {is21 ? null : (
        <g>
          <circle
            cx={xH(metrics.maxPriceHour)}
            cy={yP(metrics.maxPrice)}
            r={3.5}
            fill={colors.ink}
            stroke={colors.flaeche}
            strokeWidth={1}
          />
          <SvgText
            x={xH(metrics.maxPriceHour) - 8}
            y={yP(metrics.maxPrice) + 18}
            anchor="end"
            fill={colors.ink}
            weight={500}
          >
            {wide
              ? `${formatDec(metrics.maxPrice, 0)}\u00A0€/MWh  ·  ${metrics.maxPriceLabel}`
              : `${formatDec(metrics.maxPrice, 0)}\u00A0€  ·  ${metrics.maxPriceLabel}`}
          </SvgText>
        </g>
      )}
      {activeIndex != null ? (
        <line
          x1={xs[activeIndex]}
          x2={xs[activeIndex]}
          y1={residualT}
          y2={priceT + vb.priceH}
          className="v4-chart-crosshair"
        />
      ) : null}
    </svg>
      )}
    </SvgChartShell>
  );
}

function Day21Labels({
  metrics,
  xH,
  yR,
  vb,
  plotW,
  colors,
  wide,
  x23,
}: {
  metrics: ExampleDayMetrics;
  xH: (h: number) => number;
  yR: (gw: number) => number;
  vb: { L: number };
  plotW: number;
  colors: SimulatorPalette;
  wide: boolean;
  x23: number;
}) {
  const x14 = xH(metrics.marketPeakHour);
  const y556 = yR(metrics.marketPeakGw);
  const x1830 = xH(metrics.observedHour);
  const y543 = yR(metrics.observedPeakGw);
  const y516 = yR(metrics.netzPeakGw);
  const lab = `neue Spitze ${formatGw(metrics.marketPeakGw)}`;
  const lab2 = `lädt ${formatGw(metrics.marketChargeAtPeakGw)}  ·  ${metrics.marketPeakLabel}`;
  const tw = 168;
  return (
    <g>
      <Knockout x={x14 - 8 - tw} y={y556 - 40} width={tw + 4} height={38} fill={colors.flaeche} opacity={0.9} />
      <SvgText x={x14 - 8} y={y556 - 24} anchor="end" fill={colors.ink} weight={500}>
        {lab}
      </SvgText>
      <SvgText x={x14 - 8} y={y556 - 6} anchor="end" fill={colors.ink}>
        {lab2}
      </SvgText>
      <Knockout x={x1830 - 4 - 172} y={y543 + 48} width={176} height={20} fill={colors.flaeche} opacity={1} />
      <SvgText x={x1830 - 4} y={y543 + 64} anchor="end" fill={colors.muted}>
        beobachtet {formatDec(metrics.observedPeakGw)} · {metrics.observedLabel}
      </SvgText>
      {wide ? (
        <SvgText x={x23 - 8} y={y516 + 80} anchor="end" fill={colors.ink}>
          Netzdienlich {formatDec(metrics.netzPeakGw)}
        </SvgText>
      ) : (
        <SvgText x={vb.L + plotW - 2} y={y516 + 80} anchor="end" fill={colors.ink}>
          Netzdienlich {formatDec(metrics.netzPeakGw)}
        </SvgText>
      )}
    </g>
  );
}

function Day29Labels({
  metrics,
  xH,
  yR,
  colors,
  wide,
}: {
  metrics: ExampleDayMetrics;
  xH: (h: number) => number;
  yR: (gw: number) => number;
  colors: SimulatorPalette;
  wide: boolean;
}) {
  const y644 = yR(metrics.observedPeakGw);
  const y608 = yR(metrics.netzPeakGw);
  return (
    <g>
      <SvgText x={xH(metrics.observedHour) - 6} y={y644 + 44} anchor="end" fill={colors.ink} weight={500}>
        Markt: {formatGw(metrics.marketDischargeAtObservedGw)} übrig
      </SvgText>
      {wide ? (
        <SvgText x={xH(10)} y={y608 - 14} fill={colors.ink} weight={500}>
          Netzdienlich {formatDec(metrics.netzPeakGw)} · 16:45–19:00
        </SvgText>
      ) : (
        <SvgText x={xH(5)} y={y608 - 14} fill={colors.ink} weight={500}>
          Netzdienlich {formatDec(metrics.netzPeakGw)}
        </SvgText>
      )}
    </g>
  );
}
