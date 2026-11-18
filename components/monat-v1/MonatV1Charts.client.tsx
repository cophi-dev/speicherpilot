"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChartTooltipPanel } from "@/components/charts/ChartTooltipPanel";
import { useSvgChartProbe } from "@/components/charts/useSvgChartProbe";
import { nearestIndexFromClientInSvg } from "@/lib/chartSvgPointer";
import styles from "@/components/monat-v1/monat-v1.module.css";
import { fleetPowerGwLabel } from "@/lib/fleetXkConvention";
import { MONAT_REGELR_GRAPH_CAPTION } from "@/lib/monatReglerPflichtzeile";
import { formatDeDurationH, formatDeGwh, formatDeGw } from "@/lib/displayUnitFormat";
import { formatGwAbs, formatGwReduction, MONAT_V1_KERN3 } from "@/lib/monatV1Format";
import { ueberschussPoolBarLabelLayout } from "@/lib/monatUeberschussPoolBarLabel";
import type { MonatV1Model } from "@/lib/monatV1Model";
import { formatBerlinMonthLabel, formatBerlinMonthShort } from "@/lib/monatCalendar";
import { layoutMonatHeroYAxis } from "@/lib/monatHeroYAxisLabels";
import { topYTickBaselineY, yAxisGwUnitPosition } from "@/lib/monatV1HeroLayout";
import { monatFactorAxisY } from "@/lib/monatFactorAxisLayout";
import {
  monatHeroChartBox,
  monatHeroUsesWideLayout,
  monatStundenChartBox,
  monatUeberschussChartBox,
} from "@/lib/monatChartViewBox";
import { formatVisionPoolHeaderGwh } from "@/lib/research/visionJahrFormat";
import { monatPageContentWidth } from "@/lib/monatSvgTypography";
import { MONAT_WIDE_VIEWBOX_W } from "@/lib/monatSvgTypography";

const FACTOR_TICKS = [1, 2, 3, 5, 10] as const;
const FACTOR_PLOT = [1, 2, 5, 10] as const;

function factorX(factor: number, plotW: number, padL: number): number {
  return padL + ((factor - 1) / 9) * plotW;
}

function yGw(gw: number, yMin: number, yMax: number, plotH: number, padT: number): number {
  return padT + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
}

function useChartShellWidth(minWidth = 280) {
  const ref = useRef<HTMLDivElement>(null);
  const [shellWidth, setShellWidth] = useState(() =>
    typeof window !== "undefined"
      ? Math.max(minWidth, Math.round(monatPageContentWidth(window.innerWidth)))
      : minWidth,
  );
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setShellWidth(Math.max(minWidth, Math.round(el.clientWidth)));
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => ro.disconnect();
  }, [minWidth]);
  return { ref, shellWidth, wide: monatHeroUsesWideLayout(shellWidth) };
}


function HeroChartLegend({
  wide,
  kipF,
  marktX10,
  monthShort,
}: {
  wide: boolean;
  kipF: number;
  marktX10: number;
  monthShort: string;
}) {
  return (
    <div className={styles.legend} data-testid="monat-v1-hero-legend">
      <span className={styles.legendItem}>
        <span className={styles.lineRef} /> {monthShort}, beobachtet
      </span>
      <span className={styles.legendItem}>
        <span className={styles.dotFilled} /> Spitze
      </span>
      <span className={styles.legendItem}>
        <span className={styles.dotHollow} /> Überschuss
      </span>
      <span className={styles.legendItem}>
        <span className={styles.lineDashRust} /> Markt · {formatGwAbs(marktX10, 2)} ohne Preisrückwirkung
      </span>
      {wide ? (
        <span className={styles.legendItem}>
          Kipppunkt ≈×{String(kipF).replace(".", ",")}
        </span>
      ) : null}
    </div>
  );
}

function HeroChart({ model }: { model: MonatV1Model }) {
  const { ref, shellWidth, wide } = useChartShellWidth();
  const vb = monatHeroChartBox(shellWidth);
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const { yMinGw, yMaxGw, refPeakGw } = model;

  const spitzePts = useMemo(
    () =>
      FACTOR_PLOT.map((f) => {
        const p = model.hero.points.find((x) => x.factor === f)!;
        return { f, x: factorX(f, plotW, vb.L), y: yGw(p.spitzeGw, yMinGw, yMaxGw, plotH, vb.T), gw: p.spitzeGw };
      }),
    [model.hero.points, plotW, vb.L, plotH, vb.T, yMinGw, yMaxGw],
  );

  const ueberPts = FACTOR_PLOT.map((f) => {
    const p = model.hero.points.find((x) => x.factor === f)!;
    return { f, x: factorX(f, plotW, vb.L), y: yGw(p.ueberschussGw, yMinGw, yMaxGw, plotH, vb.T) };
  });

  const marktKnown = model.hero.points
    .filter((pt) => pt.marktGw != null)
    .map((pt) => ({
      f: pt.factor,
      gw: pt.marktGw as number,
      x: factorX(pt.factor, plotW, vb.L),
    }));
  const kipF = model.hero.kipppunktFactor;
  const kipX = factorX(kipF, plotW, vb.L);
  const marktPts = [...marktKnown, { f: kipF, gw: refPeakGw, x: kipX }]
    .sort((a, b) => a.f - b.f)
    .map((pt) => ({ ...pt, y: yGw(pt.gw, yMinGw, yMaxGw, plotH, vb.T) }));

  const refY = yGw(refPeakGw, yMinGw, yMaxGw, plotH, vb.T);
  const yTicksRaw = wide
    ? model.yTicksGw
    : [40, 60, 80, 100].filter((t) => t >= yMinGw && t <= yMaxGw);
  const yTickLine = (gw: number) => yGw(gw, yMinGw, yMaxGw, plotH, vb.T);
  const yTicksInPlot = yTicksRaw.filter((t) => yTickLine(t) < vb.T + plotH - 40);
  const { ticks: yTicks, refPeakLabelY } = layoutMonatHeroYAxis(yTicksInPlot, yTickLine, refY);
  const yMap = (gw: number) => yGw(gw, yMinGw, yMaxGw, plotH, vb.T);
  const topTickBaseline = topYTickBaselineY(yTicks, yMinGw, yMaxGw, plotH, vb.T, yMap);
  const gwUnit = yAxisGwUnitPosition({ padL: vb.L, plotTop: vb.T, topTickBaselineY: topTickBaseline });
  const hatchPts = [{ x: kipX, y: refY }, ...marktPts.filter((pt) => pt.f > kipF + 0.01)];

  const heroSvgRef = useRef<SVGSVGElement>(null);
  const factorSnaps = useMemo(() => {
    const seen = new Set<number>();
    const list: { factor: number; x: number }[] = [];
    for (const f of [...FACTOR_PLOT, kipF].sort((a, b) => a - b)) {
      if (seen.has(f)) {
        continue;
      }
      seen.add(f);
      list.push({ factor: f, x: factorX(f, plotW, vb.L) });
    }
    return list;
  }, [kipF, plotW, vb.L]);

  const pickHeroSnap = useCallback(
    (clientX: number, clientY: number, target: HTMLDivElement) => {
      const svg = heroSvgRef.current ?? target.querySelector("svg");
      return nearestIndexFromClientInSvg(
        clientX,
        clientY,
        svg instanceof SVGSVGElement ? svg : null,
        factorSnaps.map((s) => s.x),
      );
    },
    [factorSnaps],
  );

  const { activeIndex, onMouseMove, onMouseLeave, onTouch, onKeyDown } = useSvgChartProbe(
    factorSnaps.length,
    pickHeroSnap,
  );
  const activeSnap = activeIndex != null ? factorSnaps[activeIndex] : null;
  const activeFactor = activeSnap?.factor ?? null;
  const tooltipRows = useMemo(() => {
    if (activeFactor == null) {
      return null;
    }
    const p =
      model.hero.points.find((x) => x.factor === activeFactor) ??
      model.hero.points.find((x) => Math.abs(x.factor - activeFactor) < 0.05);
    if (!p) {
      return null;
    }
    const rows = [
      { label: "Spitze", value: `${formatGwAbs(p.spitzeGw, 1)}` },
      { label: "Überschuss", value: `${formatGwAbs(p.ueberschussGw, 1)}` },
    ];
    if (p.marktGw != null) {
      rows.push({ label: "Markt", value: `${formatGwAbs(p.marktGw, 2)}` });
    }
    return rows;
  }, [activeFactor, model.hero.points]);
  const crossX = activeSnap?.x ?? null;
  const plotBottom = vb.T + plotH;
  const factorAxis = monatFactorAxisY(plotBottom, !wide);
  const svgH = wide ? vb.h : Math.min(vb.h, factorAxis.gwLabel + 14);

  return (
    <div
      ref={ref}
      className={`${styles.chartWrap} v4-chart-probe`}
      data-testid="monat-v1-hero"
      tabIndex={0}
      role="application"
      aria-label={`Höchste Restlast im ${formatBerlinMonthLabel(model.monthKey)} je Flottenstufe`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouch}
      onTouchMove={onTouch}
      onKeyDown={onKeyDown}
    >
      <ChartTooltipPanel
        timeLabel={activeFactor != null ? `×${activeFactor}` : null}
        rows={tooltipRows}
        testId="monat-v1-hero-tooltip"
      />
      <HeroChartLegend
        wide={wide}
        kipF={kipF}
        marktX10={model.heroTable.marktX10}
        monthShort={formatBerlinMonthShort(model.monthKey)}
      />
      <svg
        ref={heroSvgRef}
        viewBox={`0 0 ${vb.w} ${svgH}`}
        className={styles.svg}
        role="img"
        aria-labelledby="g1-title g1-desc"
      >
        <title id="g1-title">Höchste Restlast je Flottenstufe und Fahrweise</title>
        <desc id="g1-desc">
          Spitzenorientiert sinkt die Monatsspitze mit wachsender Flotte; Marktorientiert ohne Preisrückwirkung steigt
          ab etwa ×{String(model.hero.kipppunktFactor).replace(".", ",")} über die beobachtete {formatBerlinMonthShort(model.monthKey)}-Spitze und liegt bei ×10 bei {formatGwAbs(model.heroTable.marktX10, 2)}.
        </desc>
        <defs>
          <pattern id="hatch-markt" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#b4532a" strokeWidth="1.25" />
          </pattern>
          <clipPath id="monat-g1-plot-clip">
            <rect x={vb.L} y={vb.T} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        {yTicks.map((tick) => {
          const y = yGw(tick, yMinGw, yMaxGw, plotH, vb.T);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + plotW} y1={y} y2={y} stroke="var(--mv-gridline, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 6} y={y + 4} textAnchor="end" fill="var(--mv-muted, #43474c)" fontSize={wide ? 14 : 12}>
                {tick}
              </text>
            </g>
          );
        })}
        {!yTicks.some((t) => Math.abs(t - refPeakGw) < 0.05) ? (
          <g>
            <line
              x1={vb.L}
              x2={vb.L + plotW}
              y1={refY}
              y2={refY}
              stroke="var(--mv-gridline, #e4e4dc)"
              strokeWidth="1"
              strokeDasharray={wide ? "0" : "3 3"}
            />
            <text x={vb.L - 10} y={refPeakLabelY} textAnchor="end" fill="var(--mv-muted, #43474c)" fontSize="14">
              {refPeakGw.toFixed(1).replace(".", ",")}
            </text>
          </g>
        ) : null}
        <text
          x={gwUnit.x}
          y={gwUnit.y}
          textAnchor={gwUnit.anchor}
          fill="var(--mv-muted, #43474c)"
          fontSize="14"
        >
          GW
        </text>
        {FACTOR_TICKS.map((f) => {
          const x = factorX(f, plotW, vb.L);
          const gw = fleetPowerGwLabel(f, f === 10 ? 0 : 1);
          const showGw = wide || f === 1 || f === 10;
          const tickFs = wide ? 14 : 12;
          return (
            <g key={f}>
              <line x1={x} x2={x} y1={plotBottom} y2={factorAxis.tickEnd} stroke="var(--mv-ink)" />
              <text
                x={x}
                y={factorAxis.multLabel}
                textAnchor="middle"
                fill="var(--mv-ink)"
                fontWeight={400}
                fontSize={tickFs}
              >
                ×{f}
              </text>
              {showGw ? (
                <text
                  x={x}
                  y={factorAxis.gwLabel}
                  textAnchor="middle"
                  fill="var(--mv-muted, #43474c)"
                  fontSize={tickFs}
                >
                  {gw}
                </text>
              ) : null}
            </g>
          );
        })}
        <rect x={vb.L} y={vb.T} width={plotW} height={refY - vb.T} fill="rgba(231, 111, 81, 0.1)" />
        <line x1={vb.L} x2={vb.L + plotW} y1={refY} y2={refY} stroke="var(--mv-ink)" strokeWidth="1.25" />
        <g clipPath="url(#monat-g1-plot-clip)">
          <polyline
            fill="none"
            stroke="var(--mv-ink)"
            strokeWidth="2.5"
            points={spitzePts.map((p) => `${p.x},${p.y}`).join(" ")}
          />
          {spitzePts.map((p) => (
            <circle key={p.f} cx={p.x} cy={p.y} r="4" fill="var(--mv-ink)" />
          ))}
          <polyline
            fill="none"
            stroke="var(--mv-muted, #43474c)"
            strokeWidth="2"
            points={ueberPts.map((p) => `${p.x},${p.y}`).join(" ")}
          />
          {ueberPts.map((p) => (
            <circle key={p.f} cx={p.x} cy={p.y} r="4" fill="var(--mv-flaeche, #fff)" stroke="var(--mv-muted)" strokeWidth="1.75" />
          ))}
          {hatchPts.length >= 2 ? (
            <polygon
              points={`${hatchPts.map((pt) => `${pt.x},${pt.y}`).join(" ")} ${hatchPts[hatchPts.length - 1]!.x},${refY}`}
              fill="url(#hatch-markt)"
              opacity="0.35"
            />
          ) : null}
          <polyline
            fill="none"
            stroke="#e76f51"
            strokeWidth="2.25"
            strokeDasharray="7 5"
            points={marktPts.map((pt) => `${pt.x},${pt.y}`).join(" ")}
          />
        </g>
        {marktPts
          .filter((pt) => pt.f > 1.05)
          .filter((pt) => wide || Math.abs(pt.f - kipF) > 0.05)
          .map((pt) => (
            <circle
              key={`m-${pt.f}`}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="var(--mv-flaeche, #fff)"
              stroke="#e76f51"
              strokeWidth="1.75"
            />
          ))}
        {!wide && marktPts.some((pt) => Math.abs(pt.f - kipF) < 0.05) ? (
          (() => {
            const pt = marktPts.find((p) => Math.abs(p.f - kipF) < 0.05);
            return pt ? (
              <circle
                key="m-kipppunkt"
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="var(--mv-flaeche, #fff)"
                stroke="#e76f51"
                strokeWidth="1.75"
              />
            ) : null;
          })()
        ) : null}
        {crossX != null ? (
          <line x1={crossX} x2={crossX} y1={vb.T} y2={vb.T + plotH} stroke="var(--mv-muted)" strokeWidth="1.25" opacity="0.85" />
        ) : null}
      </svg>
      <p className={`${styles.figcaption} num`}>{MONAT_REGELR_GRAPH_CAPTION}</p>
    </div>
  );
}

function StundenChart({ model }: { model: MonatV1Model }) {
  const { ref, shellWidth, wide } = useChartShellWidth();
  const vb = monatStundenChartBox(shellWidth);
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const yMax = 20;
  const dodge = wide ? 12 : 10;
  const cats = model.duration;
  const yRed = (reductionGw: number) => vb.T + plotH - (reductionGw / yMax) * plotH;
  const stundenGwUnit = yAxisGwUnitPosition({
    padL: vb.L,
    plotTop: vb.T,
    topTickBaselineY: yRed(yMax) + 4,
  });

  const stundenSvgRef = useRef<SVGSVGElement>(null);
  const stundenXs = useMemo(
    () => cats.map((_, i) => vb.L + ((i + 0.5) / Math.max(1, cats.length)) * plotW),
    [cats, plotW, vb.L],
  );
  const pickStundenIndex = useCallback(
    (clientX: number, clientY: number, target: HTMLDivElement) => {
      const svg = stundenSvgRef.current ?? target.querySelector("svg");
      return nearestIndexFromClientInSvg(
        clientX,
        clientY,
        svg instanceof SVGSVGElement ? svg : null,
        stundenXs,
      );
    },
    [stundenXs],
  );
  const { activeIndex, onMouseMove, onMouseLeave, onTouch, onKeyDown } = useSvgChartProbe(
    cats.length,
    pickStundenIndex,
  );
  const activeCat = activeIndex != null ? cats[activeIndex] : null;
  const tooltipRows = useMemo(() => {
    if (!activeCat) {
      return null;
    }
    return [
      { label: formatDeDurationH("1,76"), value: formatGwReduction(activeCat.h176, 2) },
      { label: formatDeDurationH("2"), value: formatGwReduction(activeCat.h2, 2) },
      { label: formatDeDurationH("4"), value: formatGwReduction(activeCat.h4, 2) },
    ];
  }, [activeCat]);
  const crossX = activeIndex != null ? stundenXs[activeIndex] : null;

  return (
    <div
      ref={ref}
      className={`${styles.chartWrap} v4-chart-probe`}
      data-testid="monat-v1-stunden"
      tabIndex={0}
      role="application"
      aria-label="Spitzensenkung je Dauer"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouch}
      onTouchMove={onTouch}
      onKeyDown={onKeyDown}
    >
      <ChartTooltipPanel
        timeLabel={activeCat ? `×${activeCat.factor}` : null}
        rows={tooltipRows}
        testId="monat-v1-stunden-tooltip"
      />
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dotFilled} /> {formatDeDurationH("1,76")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotHollow} /> {formatDeDurationH("2")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} /> {formatDeDurationH("4")}
        </span>
        {model.showDauerVergleich && wide ? (
          <span className={styles.legendItem}>
            <span className={styles.lineDashMuted} /> genauso stark (×5 · {formatDeDurationH("4")} ≈ ×10 ·{" "}
            {formatDeDurationH("1,76")})
          </span>
        ) : null}
      </div>
      <svg
        ref={stundenSvgRef}
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        className={styles.svg}
        role="img"
        aria-labelledby="g3-title g3-desc"
      >
        <title id="g3-title">Spitzensenkung je Dauer und Flottenstufe</title>
        <desc id="g3-desc">
          {MONAT_V1_KERN3}. Längere Speicherdauer senkt die Spitze stärker; bei gleicher Leistung begrenzt Energie die Wirkung.
        </desc>
        {[0, 5, 10, 15, 20].map((tick) => {
          const y = yRed(tick);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + plotW} y1={y} y2={y} stroke="var(--mv-gridline, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 4} y={y + 4} textAnchor="end" fill="var(--mv-muted)">
                {tick === 0 ? "0" : `−${tick}`}
              </text>
            </g>
          );
        })}
        <text x={stundenGwUnit.x} y={stundenGwUnit.y} textAnchor={stundenGwUnit.anchor} fill="var(--mv-muted)">
          GW
        </text>
        {cats.map((c, i) => {
          const x = vb.L + ((i + 0.5) / cats.length) * plotW;
          const pts = [
            { series: "h176" as const, off: -dodge, val: c.h176, fill: "var(--mv-ink)", hollow: false, r: 4 },
            { series: "h2" as const, off: 0, val: c.h2, fill: "none", hollow: true, r: 4 },
            { series: "h4" as const, off: dodge, val: c.h4, fill: "#e76f51", hollow: false, r: 6 },
          ];
          return (
            <g key={c.factor}>
              <line x1={x} x2={x} y1={vb.T} y2={vb.T + plotH} stroke="var(--mv-linie)" strokeWidth="2" />
              <text x={x} y={vb.T + plotH + 16} textAnchor="middle" fill="var(--mv-ink)">
                ×{c.factor}
              </text>
              <text x={x} y={vb.T + plotH + 36} textAnchor="middle" fill="var(--mv-muted)">
                {c.powerGwLabel}
              </text>
              <polyline
                fill="none"
                stroke="var(--mv-linie)"
                strokeWidth="1.25"
                points={pts.map((p) => `${x + p.off},${yRed(p.val)}`).join(" ")}
              />
              {pts.map((p) => {
                const y = yRed(p.val);
                return (
                  <g key={p.off}>
                    {p.hollow ? (
                      <circle cx={x + p.off} cy={y} r={p.r} fill="var(--mv-flaeche, #fff)" stroke="var(--mv-muted)" strokeWidth="1.75" />
                    ) : (
                      <circle cx={x + p.off} cy={y} r={p.r} fill={p.fill} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        {model.showDauerVergleich && wide ? (
          <g>
            {(() => {
              const i5 = cats.findIndex((c) => c.factor === 5);
              const i10 = cats.findIndex((c) => c.factor === 10);
              const x5 = vb.L + ((i5 + 0.5) / cats.length) * plotW + dodge;
              const x10 = vb.L + ((i10 + 0.5) / cats.length) * plotW - dodge;
              const y5 = yRed(cats[i5]!.h4);
              const y10 = yRed(cats[i10]!.h176);
              return (
                <line x1={x5} y1={y5} x2={x10} y2={y10} stroke="var(--mv-muted)" strokeDasharray="4 4" />
              );
            })()}
          </g>
        ) : null}
        {crossX != null ? (
          <line x1={crossX} x2={crossX} y1={vb.T} y2={vb.T + plotH} stroke="var(--mv-muted)" strokeWidth="1.25" opacity="0.85" />
        ) : null}
      </svg>
      <p className={`${styles.figcaption} num`}>{MONAT_REGELR_GRAPH_CAPTION}</p>
    </div>
  );
}

function UeberschussChart({ model }: { model: MonatV1Model }) {
  const { ref, shellWidth, wide } = useChartShellWidth();
  const vb = monatUeberschussChartBox(shellWidth, model.pool.length);
  const rowH = wide ? 56 : 52;
  const barH = 18;
  const startY = 48;
  const poolX = 40;

  const rowCount = model.pool.length;
  const { activeIndex, onMouseMove, onMouseLeave, onTouch, onKeyDown } = useSvgChartProbe(rowCount);
  const activeRow = activeIndex != null ? model.pool[activeIndex] : null;
  const tooltipRows = useMemo(() => {
    if (!activeRow) {
      return null;
    }
    return [
      { label: "Pool", value: activeRow.poolLabel },
      { label: "Senkung", value: formatGwReduction(activeRow.reductionGw, 2) },
    ];
  }, [activeRow]);

  return (
    <div
      ref={ref}
      className={`${styles.chartWrap} v4-chart-probe`}
      data-testid="monat-v1-ueberschuss"
      tabIndex={0}
      role="application"
      aria-label="Überschuss-Pool und Spitzensenkung"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouch}
      onTouchMove={onTouch}
      onKeyDown={onKeyDown}
    >
      <ChartTooltipPanel
        timeLabel={activeRow ? `×${activeRow.factor}` : null}
        rows={tooltipRows}
        testId="monat-v1-ueberschuss-tooltip"
      />
      <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-labelledby="g4-title g4-desc">
        <title id="g4-title">Überschuss-Pool und Spitzensenkung</title>
        <desc id="g4-desc">
          Die Überschuss-Strategie füllt den Monats-Pool, senkt die Spitze aber weniger als spitzenorientiertes Fahren.
        </desc>
        <text x={poolX} y={28} fill="var(--mv-ink)">
          {formatVisionPoolHeaderGwh(model.surplusPoolGwh)}
        </text>
        <text x={poolX + vb.poolW + 40} y={28} fill="var(--mv-muted)">
          sinkt um
        </text>
        {model.pool.map((row, i) => {
          const y = startY + i * rowH;
          const fillW = (row.poolSharePct / 100) * vb.poolW;
          const active = activeIndex === i;
          return (
            <g key={row.factor} opacity={activeIndex == null || active ? 1 : 0.45}>
              <text
                x={poolX + vb.poolW / 2}
                y={y - 4}
                textAnchor="middle"
                fill="var(--mv-ink)"
                fontSize="12"
              >
                ×{row.factor}
              </text>
              <rect x={poolX} y={y} width={vb.poolW} height={barH} fill="var(--mv-linie)" />
              <rect x={poolX} y={y} width={fillW} height={barH} fill="var(--mv-ink)" />
              {(() => {
                const label = ueberschussPoolBarLabelLayout(fillW, poolX);
                return (
                  <text
                    x={label.x}
                    y={y + barH - 4}
                    textAnchor={label.textAnchor}
                    fill={label.onDarkFill ? "var(--mv-bg, #f6f6f3)" : "var(--mv-ink)"}
                    fontSize="12"
                  >
                    {row.poolLabel}
                  </text>
                );
              })()}
              <text x={poolX + vb.poolW + 16} y={y + barH - 2} fill="var(--mv-ink)" fontSize="12">
                {formatGwReduction(row.reductionGw, 2)}
              </text>
            </g>
          );
        })}
        <text x={poolX} y={startY + model.pool.length * rowH + 24} fill="var(--mv-ink)" fontWeight="500">
          Bei ×10, zum Vergleich
        </text>
        {[
          { label: "Überschuss", gw: model.compareX10.ueberschussGw, color: "var(--mv-muted)" },
          { label: "dieselbe Flotte, spitzenorientiert", gw: model.compareX10.spitzeGw, color: "var(--mv-ink)" },
        ].map((row, i) => {
          const y = startY + model.pool.length * rowH + 44 + i * (rowH - 8);
          const maxGw = 16;
          const w = (row.gw / maxGw) * vb.poolW;
          return (
            <g key={row.label}>
              <text x={poolX + vb.poolW / 2} y={y - 4} textAnchor="middle" fill="var(--mv-muted)" fontSize="12">
                {wide ? row.label : row.label === "Überschuss" ? "Überschuss" : "Spitze, orientiert"}
              </text>
              <rect x={poolX} y={y} width={vb.poolW} height={barH} fill="var(--mv-linie)" />
              <rect x={poolX} y={y} width={w} height={barH} fill={row.color} />
              <text x={poolX + vb.poolW + 16} y={y + barH - 2} fill="var(--mv-ink)" fontSize="12">
                {formatGwReduction(row.gw, 2)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={`${styles.figcaption} num`}>{MONAT_REGELR_GRAPH_CAPTION}</p>
    </div>
  );
}

export function MonatV1Charts({ model }: { model: MonatV1Model }) {
  return (
    <>
      <section className={styles.section} id="graph-1" aria-labelledby="monat-v1-a1">
        <h2 id="monat-v1-a1" className={styles.h1}>
          Dieselbe Flotte senkt
          <br />
          die{"\u00A0"}Spitze
          <br />
          oder hebt sie.
        </h2>
        <p className={styles.kern}>ab ×{model.hero.kipppunktFactor.toFixed(1).replace(".", ",")}</p>
        <p className={styles.lead}>
          Ab etwa der {model.hero.kipppunktFactor.toFixed(1).replace(".", ",")}-fachen Flotte erzeugt Laden nach Preis
          eine neue Monatsspitze (×10: {formatDeGw(model.heroTable.marktX10, 1)} statt{" "}
          {formatDeGw(model.refPeakGw, 1)} gemessen). Gegen die Spitze gefahren sinkt sie auf{" "}
          {formatDeGw(model.heroTable.spitzeX10, 1)}.
        </p>
        <HeroChart model={model} />
        <p className={styles.simulatorTry}>
          <Link href="/kompromiss" className="v4-text-link">
            Kompromiss selbst ausprobieren
          </Link>
        </p>
      </section>
      <section className={styles.section} aria-labelledby="monat-v1-a3">
        <h2 id="monat-v1-a3" className={styles.h2}>
          Es fehlen Stunden, nicht Gigawatt.
        </h2>
        <p className={styles.kern}>{formatGwReduction(model.duration.find((d) => d.factor === 10)?.h176 ?? 0, 1)}</p>
        <p className={styles.lead}>{MONAT_V1_KERN3}.</p>
        <StundenChart model={model} />
      </section>
      <section className={styles.section} aria-labelledby="monat-v1-a4">
        <h2 id="monat-v1-a4" className={styles.h2}>
          {model.surplusPoolGwh < 0.05 ? "Kein Wind-Solar-Überschuss im Monat" : "Überschuss allein trägt nicht."}
        </h2>
        <p className={styles.kern}>
          {model.surplusPoolGwh < 0.05
            ? `Im ${formatBerlinMonthLabel(model.monthKey)} gab es im Modell keinen Überschuss aus Wind+Solar über Last.`
            : `${formatDeGwh(model.surplusPoolGwh, 1)} Überschuss im ${formatBerlinMonthLabel(model.monthKey)}`}
        </p>
        <p className={styles.lead}>
          {model.surplusPoolGwh < 0.05 ? (
            <>
              Spitzenorientiert senkt ×10 die Restlast um {formatDeGw(model.compareX10.spitzeGw, 1)}; die
              Überschuss-Fahrweise lädt 0 GWh. Markt orientiert sich an Preisen — ohne Überschuss bleibt der
              Unterschied zur Spitzen-Fahrweise klein.
            </>
          ) : (
            <>
              So viel Wind- und Sonnenstrom lag im {formatBerlinMonthLabel(model.monthKey)} über dem Verbrauch. ×10 nimmt
              fast alles auf, senkt die Spitze damit aber nur um {formatDeGw(model.compareX10.ueberschussGw, 1)}. Gegen
              die Spitze gefahren sind es {formatDeGw(model.compareX10.spitzeGw, 1)}.
            </>
          )}
        </p>
        {model.surplusPoolGwh >= 0.05 ? <UeberschussChart model={model} /> : null}
      </section>
    </>
  );
}
