"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "@/components/home/monat-konzept.module.css";
import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { formatQuantity } from "@/lib/formatQuantity";
import type { ArbeitWirkungModel, ArbeitWirkungPoint, FleetSizeRow } from "@/lib/monatKonzeptA";
import {
  arbeitWirkungHref,
  formatGwhTick,
  formatKonzeptPeakInstant,
  formatKonzeptWorkbenchCaption,
} from "@/lib/monatKonzeptA";
import {
  CHART_PAD_L,
  CHART_PAD_R,
  CHART_PAD_T,
  CHART_VIEW_H,
  logX,
  plotHeight,
  plotWidth,
  pointsForStrategy,
  yWirkung,
} from "@/lib/arbeitWirkungChartGeometry";
import {
  arbeitWirkungLabelSpecs,
  buildArbeitWirkungLabels,
  buildChartObstacles,
  labelTextBox,
  placeLabels,
  type PlacedLabel,
} from "@/lib/arbeitWirkungLabelPlacement";
import type { DauerlinieModel } from "@/lib/monatKonzeptC";
import { dauerlinieSeriesSamples, morphX } from "@/lib/monatKonzeptC";
import {
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

const STRATEGIES: NationalFleetStrategyUi[] = ["spitze", "ueberschuss", "markt"];
const Y_MIN = -35;
const Y_MAX = 16;

function useChartViewWidth(shellRef: React.RefObject<HTMLDivElement | null>): number {
  const [viewW, setViewW] = useState(0);
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 200) setViewW(w);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return viewW > 0 ? viewW : 920;
}

function labelStyleClass(id: string, styles: Record<string, string>): string {
  if (id.includes("pool")) return styles.labelPool;
  if (id.includes("spitze")) return styles.labelSpitze;
  if (id.includes("ueberschuss")) return styles.labelUeberschuss;
  if (id.includes("markt") && !id.includes("callout")) return styles.labelMarkt;
  if (id.includes("ref")) return styles.labelRef;
  if (id.includes("callout")) return styles.labelCallout;
  return styles.labelDefault;
}

function PlacedSvgLabel({ placed, styles }: { placed: PlacedLabel; styles: Record<string, string> }) {
  const { lineHeights } = labelTextBox(placed.lines);
  const x0 =
    placed.textAnchor === "middle"
      ? placed.x + placed.box.w / 2
      : placed.textAnchor === "end"
        ? placed.x + placed.box.w
        : placed.x;
  const y0 = placed.y + placed.lines[0]!.fontSize;
  return (
    <text
      data-testid={placed.id}
      data-placement-label={placed.id}
      x={x0}
      y={y0}
      textAnchor={placed.textAnchor}
      className={`num ${labelStyleClass(placed.id, styles)}`}
    >
      {placed.lines.map((line, i) => (
        <tspan
          key={i}
          x={x0}
          dy={i === 0 ? 0 : lineHeights[i - 1]!}
          fontSize={line.fontSize}
          fontWeight={line.bold ? 700 : 500}
          className={placed.id === "arbeit-markt-callout" && i === 0 ? styles.calloutGwLine : undefined}
        >
          {line.text}
        </tspan>
      ))}
    </text>
  );
}

function weekdayDeFromTs(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const wd = d.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export function MonatArbeitWirkungChart({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  fleetSizes,
  marktX10Detail,
  onPointSelect,
}: {
  model: ArbeitWirkungModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  fleetSizes: FleetSizeRow[];
  marktX10Detail?: { residualGw: number; chargeGw: number; priceEurMwh: number } | null;
  onPointSelect?: () => void;
}) {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewW = useChartViewWidth(shellRef);
  const plotW = plotWidth(viewW);
  const plotH = plotHeight();
  const yZero = yWirkung(0);
  const poolX = logX(model.surplusPoolGwh, viewW);
  const marktX10 = model.marktX10;

  const decorateCallout = useCallback(
    (placed: PlacedLabel[]) => {
      if (!marktX10 || !marktX10Detail) return placed;
      return placed.map((p) =>
        p.id === "arbeit-markt-callout"
          ? {
              ...p,
              lines: p.lines.map((line, i) =>
                i === 1
                  ? {
                      ...line,
                      text: `neue Monatsspitze · ${weekdayDeFromTs(marktX10.peakTs) ?? ""} ${formatKonzeptPeakInstant(marktX10.peakTs) ?? ""}`,
                    }
                  : line,
              ),
            }
          : p,
      );
    },
    [marktX10, marktX10Detail],
  );

  const [placedLabels, setPlacedLabels] = useState<PlacedLabel[]>(() =>
    decorateCallout(buildArbeitWirkungLabels(model, viewW, marktX10Detail ?? null)),
  );

  useLayoutEffect(() => {
    const specs = arbeitWirkungLabelSpecs(model, viewW, marktX10Detail ?? null);
    const baseObstacles = buildChartObstacles(model, viewW, ["spitze", "ueberschuss", "markt"]);
    const initial = decorateCallout(placeLabels(specs, baseObstacles, viewW));
    setPlacedLabels(initial);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const measured: { kind: "box"; box: { x: number; y: number; w: number; h: number } }[] = [];
        svg.querySelectorAll("[data-placement-label]").forEach((el) => {
          const b = (el as SVGGraphicsElement).getBBox();
          measured.push({ kind: "box", box: { x: b.x - 6, y: b.y - 4, w: b.width + 12, h: b.height + 8 } });
        });
        const refined = decorateCallout(placeLabels(specs, [...baseObstacles, ...measured], viewW));
        setPlacedLabels(refined);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [model, viewW, marktX10Detail, decorateCallout]);

  const navigate = useCallback(
    (factor: NationalFleetFactor, strategy: NationalFleetStrategyUi) => {
      onPointSelect?.();
      router.push(arbeitWirkungHref(monthKey, factor, strategy), { scroll: false });
    },
    [monthKey, onPointSelect, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const strategies = STRATEGIES;
      const idxS = strategies.indexOf(activeStrategy);
      const idxF = NATIONAL_FLEET_FACTORS.indexOf(activeFactor);
      if (e.key === "ArrowRight" && idxF < NATIONAL_FLEET_FACTORS.length - 1) {
        e.preventDefault();
        navigate(NATIONAL_FLEET_FACTORS[idxF + 1], activeStrategy);
      } else if (e.key === "ArrowLeft" && idxF > 0) {
        e.preventDefault();
        navigate(NATIONAL_FLEET_FACTORS[idxF - 1], activeStrategy);
      } else if (e.key === "ArrowDown" && idxS < strategies.length - 1) {
        e.preventDefault();
        navigate(activeFactor, strategies[idxS + 1]);
      } else if (e.key === "ArrowUp" && idxS > 0) {
        e.preventDefault();
        navigate(activeFactor, strategies[idxS - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeFactor, activeStrategy, navigate]);

  const renderPoint = (p: ArbeitWirkungPoint, hollow: boolean) => {
    const cx = logX(p.chargeGwh, viewW);
    const cy = yWirkung(p.wirkungGw);
    const active = p.factor === activeFactor && p.strategy === activeStrategy;
    return (
      <g key={`${p.strategy}-${p.factor}`} data-chart-point={`${p.strategy}-${p.factor}`}>
        <a
          href={arbeitWirkungHref(monthKey, p.factor, p.strategy)}
          className={`${styles.pointDot} ${styles[p.strategy]}${hollow ? ` ${styles.hollow}` : ""}${active ? ` ${styles.isActive}` : ""}`}
          aria-label={`${NATIONAL_FLEET_STRATEGY_UI[p.strategy].shortDe}, ×${p.factor}`}
          aria-current={active ? "true" : undefined}
          onClick={(e) => {
            e.preventDefault();
            navigate(p.factor, p.strategy);
          }}
        >
          <circle cx={cx} cy={cy} r={hollow ? 5.5 : 7} />
        </a>
      </g>
    );
  };

  return (
    <section className={`v4-chapter ${styles.sectionA}`} aria-labelledby="monat-arbeit-wirkung-title">
      <h2 id="monat-arbeit-wirkung-title" className="v4-chapter-h2">
        Arbeit gegen Wirkung
      </h2>
      <figure className={styles.figure}>
        <div className={styles.aLayout}>
          <div
            ref={shellRef}
            className={`${styles.chartShell} ${styles.chartShellHero} ${styles.desktopChart}`}
            data-testid="arbeit-chart-shell"
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${viewW} ${CHART_VIEW_H}`}
              width="100%"
              height={CHART_VIEW_H}
              className={styles.svg}
              role="img"
              aria-labelledby="arbeit-wirkung-aria-title"
              data-testid="arbeit-wirkung-svg"
            >
              <title id="arbeit-wirkung-aria-title">Arbeit gegen Wirkung — drei Ziele × Faktoren</title>
              <rect
                data-testid="arbeit-plot-frame"
                x={CHART_PAD_L}
                y={CHART_PAD_T}
                width={plotW}
                height={plotH}
                fill="none"
                stroke="transparent"
              />
              <rect x={CHART_PAD_L} y={CHART_PAD_T} width={plotW} height={yZero - CHART_PAD_T} className={styles.negativeFill} />
              {[10, 100, 1000, 10000].map((tick) => (
                <g key={tick}>
                  <line
                    x1={logX(tick, viewW)}
                    x2={logX(tick, viewW)}
                    y1={CHART_PAD_T}
                    y2={CHART_PAD_T + plotH}
                    className={styles.gridLine}
                  />
                  <text
                    x={logX(tick, viewW)}
                    y={CHART_VIEW_H - 30}
                    className={styles.xTick}
                    textAnchor="middle"
                    data-chart-tick={`x-${tick}`}
                  >
                    {formatGwhTick(tick)}
                  </text>
                </g>
              ))}
              <text
                x={CHART_PAD_L + plotW / 2}
                y={CHART_VIEW_H - 10}
                className={styles.axisTitle}
                textAnchor="middle"
                data-chart-tick="x-title"
              >
                Netzseitige Ladung im Monat, GWh (logarithmisch)
              </text>
              {[-30, -20, -10, 0, 5, 10, 15].map((tick) => (
                <g key={tick}>
                  <line
                    x1={CHART_PAD_L}
                    x2={viewW - CHART_PAD_R}
                    y1={yWirkung(tick)}
                    y2={yWirkung(tick)}
                    className={styles.gridLine}
                  />
                  <text
                    x={CHART_PAD_L - 12}
                    y={yWirkung(tick) + 4}
                    className={styles.yTick}
                    textAnchor="end"
                    data-chart-tick={`y-${tick}`}
                  >
                    {tick > 0 ? `+${tick}` : tick}
                  </text>
                </g>
              ))}
              <text
                x={20}
                y={CHART_PAD_T - 16}
                className={styles.yAxisTitle}
                textAnchor="start"
                data-chart-y-title="top"
              >
                Spitze sinkt um … GW
              </text>
              <text
                x={20}
                y={CHART_PAD_T + plotH + 28}
                className={styles.yAxisTitle}
                textAnchor="start"
                data-chart-y-title="bottom"
              >
                Spitze steigt
              </text>
              {STRATEGIES.map((strategy) => {
                const pts = pointsForStrategy(model, strategy);
                const d = pts
                  .map((p, i) => `${i === 0 ? "M" : "L"}${logX(p.chargeGwh, viewW)},${yWirkung(p.wirkungGw)}`)
                  .join(" ");
                return (
                  <path
                    key={strategy}
                    d={d}
                    className={`${styles.pathLine} ${styles[strategy]}`}
                    data-chart-path={strategy}
                  />
                );
              })}
              <line x1={CHART_PAD_L} y1={yZero} x2={viewW - CHART_PAD_R} y2={yZero} className={styles.zeroLine} />
              <line x1={poolX} y1={CHART_PAD_T} x2={poolX} y2={CHART_PAD_T + plotH} className={styles.poolLine} />
              <g className={styles.labelLayer}>
                {placedLabels.map((placed) => (
                  <PlacedSvgLabel key={placed.id} placed={placed} styles={styles} />
                ))}
              </g>
              {STRATEGIES.flatMap((strategy) =>
                pointsForStrategy(model, strategy).map((p) => renderPoint(p, p.factor === 1)),
              )}
            </svg>
          </div>
          <aside className={styles.fleetAside} aria-label="Flottengröße">
            <p className={styles.fleetAsideTitle}>Flottengröße</p>
            <table className={styles.fleetTable}>
              <tbody>
                {fleetSizes.map((row) => (
                  <tr key={row.factor}>
                    <td>×{row.factor}</td>
                    <td>
                      {formatQuantity(row.powerGw, "de", 2)} GW / {formatQuantity(row.energyGwh, "de", 0)} GWh
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.fleetHint}>
              Punkt wählen öffnet die Monatskurve.
              <br />
              ← → Faktor · ↑ ↓ Ziel
            </p>
          </aside>
        </div>
        <MobileArbeitPaths
          model={model}
          monthKey={monthKey}
          activeFactor={activeFactor}
          activeStrategy={activeStrategy}
          onSelect={navigate}
        />
        <p className={`${styles.chartFootnote} num`} data-testid="arbeit-chart-footnote">
          Jeder Punkt = ein vorberechneter Lauf (Ziel × Flottenfaktor). Oben: Spitze sinkt um so viele GW wie die
          Referenzspitze ohne Speicher minus der höchsten Restlast mit Speicher. Modell: Round-Trip 85&nbsp;%, SoC
          10–90&nbsp;%, Day-Ahead Price Taker, perfekte Voraussicht — ohne Preisrückwirkung bei ×5/×10. Quelle
          Energy-Charts / SMARD CC BY 4.0.
        </p>
        <table className="sr-only">
          <caption>Arbeit gegen Wirkung</caption>
          <thead>
            <tr>
              <th>Ziel</th>
              <th>Faktor</th>
              <th>Ladung GWh</th>
              <th>Wirkung GW</th>
            </tr>
          </thead>
          <tbody>
            {model.points.map((p) => (
              <tr key={`${p.strategy}-${p.factor}`}>
                <td>{NATIONAL_FLEET_STRATEGY_UI[p.strategy].shortDe}</td>
                <td>×{p.factor}</td>
                <td>{formatQuantity(p.chargeGwh, "de", 2)}</td>
                <td>{formatQuantity(p.wirkungGw, "de", 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}

function MobileArbeitPaths({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  onSelect,
}: {
  model: ArbeitWirkungModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  onSelect: (f: NationalFleetFactor, s: NationalFleetStrategyUi) => void;
}) {
  const plotW = 372;
  const valueRow = 22;
  const plotH = 64;
  const padL = 36;
  const padR = 16;
  const padT = valueRow + 6;
  const factorRowY = padT + plotH + 12;
  const gwhRowY = padT + plotH + 26;
  const totalH = gwhRowY + 8;
  const innerRight = plotW - padR - 12;

  const yMin = Y_MIN;
  const yMax = Y_MAX;
  const y = (gw: number) => padT + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
  const x = (i: number) => padL + (i / 3) * (innerRight - padL);

  return (
    <div className={styles.mobilePaths} data-testid="arbeit-mobile-paths">
      {STRATEGIES.map((strategy) => {
        const pts = pointsForStrategy(model, strategy);
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.wirkungGw)}`).join(" ");
        const y0 = y(0);
        return (
          <div key={strategy}>
            <p className={styles.mobilePathTitle}>
              {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe} <span className={styles.mobileGwUnit}>GW Δ</span>
            </p>
            <div className={styles.mobilePlotFrame}>
            <svg viewBox={`0 0 ${plotW} ${totalH}`} className={styles.mobilePathChart}>
              <line x1={padL} x2={innerRight} y1={y0} y2={y0} stroke="var(--v4-muted)" strokeWidth={1} />
              <path d={d} fill="none" strokeWidth={2} className={`${styles.pathLine} ${styles[strategy]}`} data-mobile-path={strategy} />
              {pts.map((p, i) => {
                const active = p.factor === activeFactor && p.strategy === activeStrategy;
                const cx = x(i);
                const cy = y(p.wirkungGw);
                const valueLabelY =
                  p.wirkungGw < 0.5
                    ? Math.min(cy + 15, factorRowY - 8)
                    : Math.max(padT + 12, cy - 12);
                return (
                  <g key={p.factor}>
                    <text x={cx} y={factorRowY} className={styles.xTick} textAnchor="middle" data-mobile-factor>
                      ×{p.factor}
                    </text>
                    <text x={cx} y={gwhRowY} className={styles.xTick} textAnchor="middle" fontSize={10} data-mobile-gwh>
                      {formatQuantity(p.chargeGwh, "de", p.chargeGwh >= 100 ? 0 : 1)} GWh
                    </text>
                    <text
                      x={cx}
                      y={valueLabelY}
                      className={styles.yTick}
                      textAnchor="middle"
                      fontWeight={600}
                      data-mobile-value
                    >
                      {formatQuantity(p.wirkungGw, "de", 2)}
                    </text>
                    <a
                      href={arbeitWirkungHref(monthKey, p.factor, strategy)}
                      aria-label={`${NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}, ×${p.factor}, ${formatQuantity(p.wirkungGw, "de", 2)} GW`}
                      aria-current={active ? "true" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelect(p.factor, strategy);
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        className={`${styles.pointDot} ${styles[strategy]}${active ? ` ${styles.isActive}` : ""}`}
                      />
                    </a>
                  </g>
                );
              })}
            </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function useMorphScroll(fixedMorph: number | null) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [scrollMorph, setScrollMorph] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (fixedMorph != null && Number.isFinite(fixedMorph)) {
      return;
    }
    if (reducedMotion) {
      return;
    }
    const onScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.25 - rect.top) / Math.max(1, rect.height - vh * 0.35);
      setScrollMorph(Math.min(1, Math.max(0, progress)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [fixedMorph, reducedMotion]);

  const morphT =
    fixedMorph != null && Number.isFinite(fixedMorph)
      ? Math.min(1, Math.max(0, fixedMorph))
      : scrollMorph;

  return { trackRef, morphT };
}

export function MonatDauerlinieChart({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  fleetAvailable,
}: {
  model: DauerlinieModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  fleetAvailable: boolean;
}) {
  const searchParams = useSearchParams();
  const morphParam = searchParams.get("morph");
  const fixedMorph = morphParam != null && morphParam !== "" ? Number(morphParam) : null;
  const { trackRef, morphT } = useMorphScroll(fixedMorph);

  const scene = useMemo(() => {
    const n = model.intervalCount;
    const PAD_L_C = 92;
    const PAD_R_C = 28;
    const PAD_T_C = 48;
    const PAD_B_C = 52;
    const plotW = 980;
    const plotH = 300;
    const yMin = Math.min(model.observedMinGw, model.withStorageMinGw ?? model.observedMinGw) - 5;
    const yMax = Math.max(model.observedMaxGw, model.withStorageMaxGw ?? model.observedMaxGw) + 8;
    const yPix = (gw: number) => PAD_T_C + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
    const xPix = (xNorm: number) => PAD_L_C + (xNorm / Math.max(1, n - 1)) * plotW;

    const obsSamples = dauerlinieSeriesSamples(model, morphT, "observed");
    const storSamples = fleetAvailable ? dauerlinieSeriesSamples(model, morphT, "storage") : [];

    const toPath = (samples: { x: number; y: number }[]) =>
      samples
        .map((p, i) => `${i === 0 ? "M" : "L"}${xPix(p.x).toFixed(1)},${yPix(p.y).toFixed(1)}`)
        .join("");

    let dTint = "";
    if (fleetAvailable && morphT > 0.55) {
      const step = Math.max(1, Math.ceil(n / 400));
      const byObs = new Map(model.points.map((p) => [p.sortRankObserved, p]));
      const bySt = new Map(
        model.points.filter((p) => p.sortRankStorage != null).map((p) => [p.sortRankStorage!, p]),
      );
      const top: string[] = [];
      const bot: string[] = [];
      for (let rank = 0; rank < n; rank += step) {
        const po = byObs.get(rank);
        const ps = bySt.get(rank);
        if (!po || !ps || ps.withStorageGw == null) continue;
        const x = xPix(morphX(rank, rank, morphT, n));
        const yO = po.observedGw;
        const yS = ps.withStorageGw;
        if (Math.max(yO, yS) <= 60) continue;
        top.push(`${x.toFixed(1)},${yPix(Math.max(yO, yS)).toFixed(1)}`);
        bot.push(`${x.toFixed(1)},${yPix(Math.min(yO, yS)).toFixed(1)}`);
      }
      if (top.length > 2) {
        dTint = `M${top.join(" L")} L${[...bot].reverse().join(" L")} Z`;
      }
    }

    const y60 = yPix(60);
    const storColor =
      activeStrategy === "spitze" ? "#e86a3a" : activeStrategy === "markt" ? "#f5b731" : "#0b9f84";

    return {
      viewW: plotW + PAD_L_C + PAD_R_C,
      viewH: plotH + PAD_T_C + PAD_B_C,
      PAD_L_C,
      plotW,
      plotH,
      PAD_T_C,
      dObs: toPath(obsSamples),
      dStor: storSamples.length ? toPath(storSamples) : "",
      dTint,
      y60,
      yPix,
      storColor,
      peakLabel: model.withStorageMaxGw ?? model.observedMaxGw,
      valleyObs: model.observedMinGw,
      valleyStor: model.withStorageMinGw,
    };
  }, [activeStrategy, fleetAvailable, model, morphT]);

  return (
    <section className={`v4-chapter ${styles.sectionC}`} aria-labelledby="monat-dauerlinie-title">
      <h2 id="monat-dauerlinie-title" className="v4-chapter-h2">
        Der Monat sortiert sich
      </h2>
      <p className="v4-subline">
        {fleetAvailable
          ? `Der Oktober nach Höhe sortiert — gewählt: ${NATIONAL_FLEET_STRATEGY_UI[activeStrategy].shortDe} ×${activeFactor}.`
          : "Beobachtete Restlast — ohne Modelllauf für diesen Monat."}
      </p>
      <figure className={styles.figure}>
        <div ref={trackRef} className={styles.morphScrollTrack}>
          <div className={styles.morphSticky}>
            <div className={`${styles.chartShell} ${styles.chartShellC}`}>
              <svg viewBox={`0 0 ${scene.viewW} ${scene.viewH}`} className={styles.svg} role="img">
                <text x={24} y={scene.PAD_T_C - 12} className={styles.yAxisTitle} textAnchor="start">
                  Restlast, GW
                </text>
                <text
                  x={scene.PAD_L_C + scene.plotW / 2}
                  y={scene.viewH - 10}
                  className={styles.axisTitle}
                  textAnchor="middle"
                >
                  Stunden im Monat, nach Restlast sortiert ({formatQuantity(model.intervalCount, "de", 0)} Viertelstunden)
                </text>
                <line
                  x1={scene.PAD_L_C}
                  x2={scene.PAD_L_C + scene.plotW}
                  y1={scene.y60}
                  y2={scene.y60}
                  className={styles.ref60Line}
                />
                <text x={scene.PAD_L_C + 4} y={scene.y60 - 5} className={styles.dauerLabelMuted} fontSize={11}>
                  60 GW
                </text>
                {scene.dTint ? <path d={scene.dTint} className={styles.shaveFill} /> : null}
                <path
                  d={scene.dObs}
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.35}
                  opacity={0.95}
                />
                {scene.dStor ? (
                  <path d={scene.dStor} fill="none" stroke={scene.storColor} strokeWidth={2.6} />
                ) : null}
                {fleetAvailable && morphT > 0.65 ? (
                  <>
                    <text x={scene.PAD_L_C + 8} y={scene.yPix(scene.peakLabel) - 8} className={styles.dauerLabel}>
                      {formatQuantity(scene.peakLabel, "de", 2)} GW
                    </text>
                    {activeStrategy === "spitze" && scene.valleyStor != null ? (
                      <text
                        x={scene.PAD_L_C + scene.plotW - 6}
                        y={scene.yPix(scene.valleyStor) + 16}
                        className={styles.dauerLabelMuted}
                        textAnchor="end"
                      >
                        Tal {formatQuantity(scene.valleyStor, "de", 1)} statt {formatQuantity(scene.valleyObs, "de", 1)}
                      </text>
                    ) : activeStrategy === "markt" && scene.valleyStor != null ? (
                      <text
                        x={scene.PAD_L_C + scene.plotW - 6}
                        y={scene.yPix(scene.valleyStor) + 16}
                        className={styles.dauerLabelMuted}
                        textAnchor="end"
                      >
                        Tal {formatQuantity(scene.valleyStor, "de", 1)} statt {formatQuantity(scene.valleyObs, "de", 1)}
                      </text>
                    ) : null}
                    {activeStrategy === "spitze" ? (
                      <text x={scene.PAD_L_C + scene.plotW * 0.35} y={scene.PAD_T_C + 24} className={styles.dauerLabelMuted}>
                        {formatQuantity(model.observedMaxGw, "de", 2)} → {formatQuantity(scene.peakLabel, "de", 2)} GW
                      </text>
                    ) : null}
                  </>
                ) : null}
              </svg>
            </div>
          </div>
        </div>
        <p className={`${styles.morphNote} num`}>
          {morphT < 0.12
            ? "Chronologisch — weiter scrollen sortiert nach Restlast"
            : morphT < 0.88
              ? "Sortieren …"
              : "Sortierte Dauerlinie (höchste Restlast links)"}
        </p>
        <p className={`${styles.chartFootnote} num`}>
          Weiß: beobachtet (Last − Wind − Sonne). Farbig: gewählter Lauf. Links die höchsten Viertelstunden, rechts die
          niedrigsten.
        </p>
      </figure>
    </section>
  );
}

export function MonatKonzeptWerkbank({
  monthKey,
  factor,
  strategy,
  peakReductionGw,
  peakReductionPct,
  peakAfterGw,
  plateauNote,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  peakReductionGw: number;
  peakReductionPct: number;
  peakAfterGw: number;
  plateauNote?: string | null;
}) {
  return (
    <div className={`v4-content ${styles.workbench}`}>
      <p className={`v4-footnote num`} style={{ margin: "0 0 8px", fontSize: 13 }}>
        {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe} · ×{factor} ·{" "}
        <Link href={arbeitWirkungHref(monthKey, factor, strategy)} className="v4-footnote-link">
          Laufparameter
        </Link>{" "}
        — {formatKonzeptWorkbenchCaption(peakAfterGw, peakReductionGw)}
        {plateauNote ? ` (${plateauNote})` : ""}
      </p>
      <NationalFleetTimeSeriesChart
        monthKey={monthKey}
        factor={factor}
        strategy={strategy}
        peakReductionGw={peakReductionGw}
        peakReductionPct={peakReductionPct}
        prominentMonth
        konzeptWorkbench
      />
    </div>
  );
}
