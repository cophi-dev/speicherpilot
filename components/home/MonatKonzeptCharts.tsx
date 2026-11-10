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
import {
  buildDauerlinieScene,
  DAUER_MOBILE_CHART_H,
  DAUER_SORTED_HOURS,
  DAUER_X_TICKS_H,
  DAUER_Y_TICKS,
  konzeptCDauerHeadline,
} from "@/lib/dauerlinieChartLayout";
import { formatMobileChargeLabel } from "@/lib/formatMobileCharge";
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

function useShellContentWidth(shellRef: React.RefObject<HTMLDivElement | null>): number {
  const [viewW, setViewW] = useState(358);
  useLayoutEffect(() => {
    const measure = () => {
      const el = shellRef.current;
      const w = el
        ? Math.round(el.getBoundingClientRect().width)
        : Math.round(typeof window !== "undefined" ? window.innerWidth : 358);
      if (w > 80) setViewW(w);
    };
    measure();
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return viewW;
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

function PlacedSvgLabel({
  placed,
  styles,
  viewW,
}: {
  placed: PlacedLabel;
  styles: Record<string, string>;
  viewW: number;
}) {
  const { lineHeights } = labelTextBox(placed.lines);
  const isRef = placed.id === "arbeit-ref-label";
  const textAnchor: PlacedLabel["textAnchor"] = isRef ? "end" : placed.textAnchor;
  const x0 = isRef
    ? viewW - CHART_PAD_R - 4
    : placed.textAnchor === "middle"
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
      textAnchor={textAnchor}
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
        svg.querySelectorAll("[data-placement-label], [data-chart-factor]").forEach((el) => {
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
    const isFirst = p.strategy === "spitze" && p.factor === 1;
    const factorBesidePoint = p.strategy === "markt" && p.factor === 10;
    const factorX = factorBesidePoint ? cx - 10 : cx;
    const factorY = factorBesidePoint ? cy + 4 : cy - 12;
    const factorAnchor = factorBesidePoint ? "end" : "middle";
    return (
      <g key={`${p.strategy}-${p.factor}`} data-chart-point={`${p.strategy}-${p.factor}`}>
        <text
          x={factorX}
          y={factorY}
          className={styles.factorPointLabel}
          textAnchor={factorAnchor}
          data-chart-factor={`${p.strategy}-${p.factor}`}
        >
          ×{p.factor}
        </text>
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
          {isFirst ? (
            <title>Punkt wählen öffnet die Monatskurve. ← → Faktor · ↑ ↓ Ziel</title>
          ) : null}
          <circle cx={cx} cy={cy} r={hollow ? 5.5 : 7} />
        </a>
      </g>
    );
  };

  return (
    <section className={`v4-chapter ${styles.sectionA}`} aria-labelledby="monat-arbeit-wirkung-title">
      <p id="monat-arbeit-wirkung-title" className={styles.konzeptEyebrow}>
        Arbeit gegen Wirkung
      </p>
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
                  <PlacedSvgLabel key={placed.id} placed={placed} styles={styles} viewW={viewW} />
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
          </aside>
        </div>
        <MobileArbeitPaths
          model={model}
          monthKey={monthKey}
          activeFactor={activeFactor}
          activeStrategy={activeStrategy}
          onSelect={navigate}
        />
        <p className={`${styles.chartCaption} num`} data-testid="arbeit-chart-caption">
          Jeder Punkt = vorberechneter Lauf (Ziel × Flottenfaktor).
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
  const valueY = 15;
  const plotH = 64;
  const padL = 36;
  const padR = 16;
  const padT = 28;
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
                const isLast = i === 3;
                const gwhX = isLast ? innerRight : cx;
                const gwhAnchor = isLast ? "end" : "middle";
                return (
                  <g key={p.factor}>
                    <text
                      x={cx}
                      y={valueY}
                      className={styles.mobileValue}
                      textAnchor="middle"
                      fontWeight={600}
                      fontSize={12}
                      data-mobile-value
                    >
                      {formatQuantity(p.wirkungGw, "de", 2)}
                    </text>
                    <text x={cx} y={factorRowY} className={styles.xTick} textAnchor="middle" data-mobile-factor>
                      ×{p.factor}
                    </text>
                    <text
                      x={gwhX}
                      y={gwhRowY}
                      className={styles.xTick}
                      textAnchor={gwhAnchor}
                      fontSize={10}
                      data-mobile-gwh
                    >
                      {formatMobileChargeLabel(p.chargeGwh)}
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
  const morphTargetRef = useRef(reducedMotion ? 1 : 0);
  const [morphT, setMorphT] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (fixedMorph != null && Number.isFinite(fixedMorph)) {
      return;
    }
    if (reducedMotion) return;
    let raf = 0;
    const stepMs = 600;
    const tick = () => {
      setMorphT((cur) => {
        const target = morphTargetRef.current;
        const delta = target - cur;
        if (Math.abs(delta) < 0.008) return target;
        return cur + Math.sign(delta) * Math.min(Math.abs(delta), 16.67 / stepMs);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.25 - rect.top) / Math.max(1, rect.height - vh * 0.35);
      morphTargetRef.current = progress < 0.45 ? 0 : 1;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [fixedMorph, reducedMotion]);

  const displayMorph =
    fixedMorph != null && Number.isFinite(fixedMorph) ? Math.min(1, Math.max(0, fixedMorph)) : morphT;

  return { trackRef, morphT: displayMorph, sorted: displayMorph >= 0.92 };
}

function DauerlinieSvg({
  scene,
  fleetAvailable,
  sorted,
  layoutMode,
}: {
  scene: ReturnType<typeof buildDauerlinieScene>;
  fleetAvailable: boolean;
  sorted: boolean;
  layoutMode: "desktop" | "mobile";
}) {
  const plotBottom = scene.padT + scene.plotH;
  const xTickY = layoutMode === "mobile" ? plotBottom + 5 : scene.viewH - 28;
  const xTitleY = layoutMode === "mobile" ? plotBottom + 17 : scene.viewH - 8;
  const valleyEndX = scene.xPixFromHours(DAUER_SORTED_HOURS);

  const mobilePixelBox = layoutMode === "mobile";

  return (
    <svg
      viewBox={`0 0 ${scene.viewW} ${scene.viewH}`}
      width={mobilePixelBox ? scene.viewW : "100%"}
      height={scene.viewH}
      preserveAspectRatio={mobilePixelBox ? "xMinYMin meet" : undefined}
      className={`${styles.svg}${mobilePixelBox ? ` ${styles.svgCMobile}` : ""}`}
      role="img"
      data-testid="dauerlinie-svg"
      data-dauer-layout={layoutMode}
    >
      <rect
        data-testid="dauer-plot-frame"
        x={scene.padL}
        y={scene.padT}
        width={scene.plotW}
        height={scene.plotH}
        fill="none"
        stroke="transparent"
      />
      <text x={scene.padL} y={scene.padT - 14} className={styles.yAxisTitle} textAnchor="start" fontSize={12}>
        Restlast, GW
      </text>
      {DAUER_Y_TICKS.map((tick) => (
        <g key={tick}>
          <line
            x1={scene.padL}
            x2={scene.padL + scene.plotW}
            y1={scene.yPix(tick)}
            y2={scene.yPix(tick)}
            className={styles.gridLine}
          />
          <text
            x={scene.padL - 8}
            y={tick === -60 ? scene.yPix(tick) - 6 : scene.yPix(tick) + 4}
            className={styles.yTick}
            textAnchor="end"
            fontSize={12}
            data-chart-tick={`y-${tick}`}
          >
            {tick > 0 ? `+${tick}` : tick}
          </text>
        </g>
      ))}
      {DAUER_X_TICKS_H.map((h) => {
        const isZero = h === 0;
        const xPos = isZero ? scene.padL + 6 : scene.xPixFromHours(h);
        return (
        <g key={h}>
          <line
            x1={scene.xPixFromHours(h)}
            x2={scene.xPixFromHours(h)}
            y1={scene.padT}
            y2={scene.padT + scene.plotH}
            className={styles.gridLine}
          />
          <text
            x={xPos}
            y={xTickY}
            className={styles.xTick}
            textAnchor={isZero ? "start" : "middle"}
            fontSize={12}
            data-chart-tick={`x-${h}`}
          >
            {formatQuantity(h, "de", 0)} h
          </text>
        </g>
        );
      })}
      <text
        x={scene.padL + scene.plotW / 2}
        y={xTitleY}
        className={styles.axisTitle}
        textAnchor="middle"
        fontSize={12}
        data-chart-tick="x-title"
      >
        Stunden im Monat, nach Restlast sortiert ({DAUER_SORTED_HOURS} h)
      </text>
      <line
        x1={scene.padL}
        x2={scene.padL + scene.plotW}
        y1={scene.y60}
        y2={scene.y60}
        className={styles.ref60Line}
      />
      {scene.dTint ? <path d={scene.dTint} className={styles.shaveFill} /> : null}
      <path d={scene.dObs} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.35} opacity={0.95} />
      {scene.dStor ? <path d={scene.dStor} fill="none" stroke={scene.storColor} strokeWidth={2.6} /> : null}
      {fleetAvailable && sorted ? (
        <>
          <text
            x={scene.padL + 4}
            y={scene.padT + 42}
            className={styles.dauerHeroGw}
            textAnchor="start"
            data-testid="dauer-hero-gw"
          >
            {formatQuantity(scene.peakLabel, "de", 2)} GW
          </text>
          {scene.valleyStor != null ? (
            <text
              x={Math.max(scene.padL + 4, valleyEndX - 168)}
              y={scene.yPix(scene.valleyStor) - 8}
              className={styles.dauerLabelMuted}
              textAnchor="start"
              fontSize={12}
              data-testid="dauer-tal-label"
            >
              Tal {formatQuantity(scene.valleyStor, "de", 1)} statt {formatQuantity(scene.valleyObs, "de", 1)}
            </text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

export function MonatDauerlinieChart({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  fleetAvailable,
  peakAfterGw,
  wirkungGw,
}: {
  model: DauerlinieModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  fleetAvailable: boolean;
  peakAfterGw: number;
  wirkungGw: number;
}) {
  const searchParams = useSearchParams();
  const morphParam = searchParams.get("morph");
  const fixedMorph = morphParam != null && morphParam !== "" ? Number(morphParam) : null;
  const { trackRef, morphT, sorted } = useMorphScroll(fixedMorph);
  const shellRef = useRef<HTMLDivElement>(null);
  const shellW = useShellContentWidth(shellRef);
  const mobileLayout = shellW < 640;
  const layoutW = mobileLayout ? shellW : Math.max(shellW, 680);
  const storColor =
    activeStrategy === "spitze" ? "#e86a3a" : activeStrategy === "markt" ? "#f5b731" : "#0b9f84";

  const scene = useMemo(
    () =>
      buildDauerlinieScene(model, morphT, mobileLayout ? "mobile" : "desktop", layoutW, fleetAvailable, storColor),
    [model, morphT, mobileLayout, layoutW, fleetAvailable, storColor],
  );

  const aussage = konzeptCDauerHeadline(
    monthKey,
    NATIONAL_FLEET_STRATEGY_UI[activeStrategy].shortDe,
    activeFactor,
    peakAfterGw,
    wirkungGw,
  );

  return (
    <section className={`v4-chapter ${styles.sectionC}`} aria-labelledby="monat-dauerlinie-title">
      <p id="monat-dauerlinie-title" className={styles.konzeptEyebrow}>
        Der Monat sortiert sich
      </p>
      <h3 className={styles.konzeptAussageH2}>{aussage}</h3>
      <figure className={styles.figure}>
        <div
          ref={trackRef}
          className={`${styles.morphScrollTrack}${sorted ? ` ${styles.morphScrollTrackCompact}` : ""}${mobileLayout ? ` ${styles.morphScrollTrackMobile}` : ""}`}
        >
          <div className={mobileLayout ? undefined : styles.morphSticky}>
            <div
              ref={shellRef}
              className={`${styles.chartShell} ${styles.chartShellC}${mobileLayout ? ` ${styles.chartShellCMobile}` : ""}`}
            >
              <DauerlinieSvg
                scene={scene}
                fleetAvailable={fleetAvailable}
                sorted={sorted}
                layoutMode={mobileLayout ? "mobile" : "desktop"}
              />
            </div>
          </div>
        </div>
        <p className={`${styles.chartCaption} num`} data-testid="dauer-chart-caption">
          {sorted
            ? "Höchste Restlast links, tiefste rechts — weiße Linie beobachtet, farbige Linie gewählter Lauf."
            : "Weiter scrollen sortiert die Viertelstunden nach Restlast."}
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
