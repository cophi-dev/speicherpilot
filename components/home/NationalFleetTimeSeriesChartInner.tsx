"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChartTooltipPanel } from "@/components/charts/ChartTooltipPanel";
import { useSvgChartProbe } from "@/components/charts/useSvgChartProbe";
import { fleetTooltipRows, fleetTooltipTime } from "@/lib/fleetChartTooltip";

import { formatDeGwSpan } from "@/lib/displayUnitFormat";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  fleetChartPointsForIndices,
  dayResidualLoadScale,
  fleetChartTickIndices,
  defaultMonthPeakReference,
  formatPeakCaptionDay,
  formatPeakCaptionMonthContext,
  formatPeakEffectLine,
  formatDayPeakKpiFromSlice,
  type PeakReference,
  peakIndexRp,
  polylinePoints,
  scaleLinear,
  yAxisTicks,
  type FleetChartPoint,
} from "@/lib/nationalFleetCharts";
import { NationalFleetTimeSeriesChartSkeleton } from "@/components/home/NationalFleetTimeSeriesChartSkeleton";
import type { FleetChartSeriesPayload } from "@/lib/nationalFleetSeriesPayload";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import { formatKonzeptWorkbenchCaption } from "@/lib/monatKonzeptA";
import { fleetBandPaths } from "@/lib/fleetTagesvorlagePaths";
import { nearestIndexFromClientInSvg } from "@/lib/chartSvgPointer";

type SeriesPayload = FleetChartSeriesPayload;

type ChartFrame = {
  key: string;
  selected: SeriesPayload;
  compareRp: number[] | null;
  peakReductionGw: number;
  peakReductionPct: number;
  peakReductionDayGw?: number;
  peakObservedDayGw?: number;
};

function useMaxWidth(maxPx: number): boolean {
  const query = `(max-width: ${maxPx}px)`;
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);
  return matches;
}

function toRunLike(selected: SeriesPayload) {
  return {
    timestamp_berlin: selected.timestamp_berlin,
    r_mw: selected.r_mw,
    r_prime_mw: selected.r_prime_mw,
    c_mw: selected.c_mw,
    d_mw: selected.d_mw,
    e_start_mwh: selected.e_start_mwh,
    intervalCount: selected.timestamp_berlin.length,
  };
}

function SinglePanel({
  title,
  unit,
  width,
  height,
  children,
  yMin,
  yMax,
  yTickValues,
  plotGutter = 0,
  padTop = 14,
  padBottom = 6,
  svgRef,
}: {
  title: string;
  unit: string;
  width: number;
  height: number;
  children: React.ReactNode;
  yMin: number;
  yMax: number;
  yTickValues?: number[];
  plotGutter?: number;
  padTop?: number;
  padBottom?: number;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}) {
  const ySpan = yMax - yMin || 1;
  const yAt = (v: number, h: number) => padTop + ((yMax - v) / ySpan) * (h - padTop - padBottom);
  const ticks = yTickValues ?? [];
  const plotW = Math.max(1, width - plotGutter);
  return (
    <div className="v4-fleet-ts-panel">
      <div className="v4-fleet-ts-panel-head">
        <span className="v4-fleet-ts-panel-title">{title}</span>
        <span className="v4-fleet-ts-panel-unit num">
          {unit === "GW"
            ? formatDeGwSpan(yMin, yMax, 1)
            : `${formatQuantity(yMin, "de", 1)}–${formatQuantity(yMax, "de", 1)} ${unit}`}
        </span>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="v4-fleet-ts-svg"
        aria-hidden="true"
        overflow="visible"
      >
        {ticks.length > 0
          ? ticks.map((v) => {
              const y = yAt(v, height);
              const labelY = Math.min(height - 4, Math.max(padTop + 10, y - 2));
              return (
                <g key={v}>
                  <line x1={plotGutter} y1={y} x2={width} y2={y} className="v4-fleet-ts-grid" />
                  <text x={6} y={labelY} className="v4-fleet-ts-ytick v4-fleet-ts-ytick-halo num">
                    {formatQuantity(v, "de", 1)}
                  </text>
                </g>
              );
            })
          : null}
        <g transform={plotGutter > 0 ? `translate(${plotGutter}, 0)` : undefined}>{children}</g>
      </svg>
    </div>
  );
}

export type NationalFleetTimeSeriesChartProps = {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  dateKey?: string;
  peakReductionGw: number;
  peakReductionPct: number;
  peakReductionDayGw?: number;
  peakObservedDayGw?: number;
  dayPeakReference?: PeakReference;
  monthContextNote?: string;
  scrollHint?: string;
  prominentMonth?: boolean;
  konzeptWorkbench?: boolean;
  /** P1-Tagesvorlage: ein Restlast-Panel mit R′, R und Lade-/Entlade-Flächen */
  tagesvorlageDay?: boolean;
  /** Keine Viertelstunde mit Wind+Sonne über Verbrauch (Tag, aus Daten) */
  dayNoWindSolarSurplus?: boolean;
};

export function NationalFleetTimeSeriesChart({
  monthKey,
  factor,
  strategy,
  dateKey,
  peakReductionGw,
  peakReductionPct,
  peakReductionDayGw,
  peakObservedDayGw,
  dayPeakReference,
  monthContextNote,
  scrollHint,
  prominentMonth = false,
  konzeptWorkbench = false,
  tagesvorlageDay = false,
  dayNoWindSolarSurplus = false,
}: NationalFleetTimeSeriesChartProps) {
  const [frame, setFrame] = useState<ChartFrame | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const primaryPlotSvgRef = useRef<SVGSVGElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  const isDay = Boolean(dateKey);
  const monthNarrow = useMaxWidth(767);
  const plotGutterLayout = tagesvorlageDay && isDay ? 50 : 0;

  useEffect(() => {
    const requestKey = `${monthKey}|${factor}|${strategy}|${dateKey ?? ""}`;
    const caption = {
      peakReductionGw,
      peakReductionPct,
      peakReductionDayGw,
      peakObservedDayGw,
    };
    const params = new URLSearchParams({
      monat: monthKey,
      faktor: String(factor),
      fahrweise: strategy,
    });
    if (dateKey) {
      params.set("tag", dateKey);
    }
    let cancelled = false;
    fetch(`/api/national-fleet/series?${params.toString()}`)
      .then((r) => {
        if (!cancelled) {
          setLoadError(null);
        }
        if (!r.ok) {
          throw new Error(String(r.status));
        }
        return r.json();
      })
      .then((body) => {
        if (cancelled) {
          return;
        }
        setFrame({
          key: requestKey,
          selected: body.selected as SeriesPayload,
          compareRp: body.compare?.r_prime_mw ?? null,
          ...caption,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Zeitreihe konnte nicht geladen werden.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey, factor, strategy, dateKey, peakReductionGw, peakReductionPct, peakReductionDayGw, peakObservedDayGw]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const cs = getComputedStyle(el);
      const pl = Number.parseFloat(cs.paddingLeft) || 0;
      const pr = Number.parseFloat(cs.paddingRight) || 0;
      setScrollWidth(Math.max(0, el.clientWidth - pl - pr));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame]);

  const runLike = useMemo(() => (frame ? toRunLike(frame.selected) : null), [frame]);
  const compareRp = frame?.compareRp ?? null;

  const points = useMemo(() => {
    if (!runLike) {
      return [];
    }
    return fleetChartPointsForIndices(runLike);
  }, [runLike]);

  const comparePoints = useMemo(() => {
    if (!runLike || !compareRp || compareRp.length !== runLike.intervalCount) {
      return null;
    }
    return fleetChartPointsForIndices(runLike).map((p, j) => ({
      ...p,
      rpGw: compareRp[j]! / 1000,
    }));
  }, [runLike, compareRp]);

  const peakLocal = useMemo(() => {
    if (points.length === 0) {
      return 0;
    }
    let best = 0;
    let bestVal = points[0]?.rpGw ?? 0;
    for (let j = 1; j < points.length; j += 1) {
      if (points[j].rpGw > bestVal) {
        bestVal = points[j].rpGw;
        best = j;
      }
    }
    return best;
  }, [points]);

  const plotXs = useMemo(() => {
    const n = points.length;
    if (n === 0) {
      return { local: [] as number[], svg: [] as number[] };
    }
    const w = scrollWidth > 0 ? scrollWidth : isDay ? Math.max(320, n * 4) : 320;
    const plotWidth = Math.max(1, w - plotGutterLayout);
    const pxPerQh = plotWidth / n;
    const local = points.map((_, j) => j * pxPerQh + pxPerQh / 2);
    const svg = local.map((x) => x + plotGutterLayout);
    return { local, svg };
  }, [isDay, plotGutterLayout, points, scrollWidth]);
  const seriesXs = plotXs.svg;

  const pickFleetIndex = useCallback(
    (clientX: number, clientY: number, target: HTMLDivElement) => {
      if (seriesXs.length === 0) {
        return 0;
      }
      const svg =
        primaryPlotSvgRef.current ??
        (target.querySelector("svg.v4-fleet-ts-svg") as SVGSVGElement | null);
      return nearestIndexFromClientInSvg(clientX, clientY, svg, seriesXs);
    },
    [seriesXs],
  );
  const { activeIndex, onMouseMove, onMouseLeave, onTouch, onKeyDown } = useSvgChartProbe(
    points.length,
    pickFleetIndex,
  );
  const activePoint = activeIndex != null ? points[activeIndex] ?? null : null;

  const xTicks = useMemo(
    () => fleetChartTickIndices(points, isDay ? "day" : "month"),
    [points, isDay],
  );

  if (loadError) {
    return <p className="v4-fleet-ts-tooltip num v4-fleet-error">{loadError}</p>;
  }

  if (!frame || !runLike || points.length === 0) {
    return (
      <NationalFleetTimeSeriesChartSkeleton
        prominentMonth={prominentMonth && !isDay}
        withCompareLegend={!isDay && factor !== 1}
      />
    );
  }

  const peakI = isDay ? peakLocal : peakIndexRp(runLike);
  const n = points.length;
  const plotGutter = plotGutterLayout;
  const width = scrollWidth > 0 ? scrollWidth : isDay ? Math.max(320, n * 4) : 320;
  const plotWidth = Math.max(1, width - plotGutter);
  const pxPerQh = plotWidth / n;
  const panelH =
    tagesvorlageDay && isDay ? 140 : prominentMonth && !isDay ? (monthNarrow ? 194 : 124) : isDay ? 104 : 92;
  const auxPanelH = prominentMonth && !isDay ? (monthNarrow ? 116 : 88) : panelH;
  const auxScaleH = prominentMonth && !isDay ? 124 : panelH;
  const xs =
    plotXs.local.length === n
      ? plotXs.local
      : points.map((_, j) => j * pxPerQh + pxPerQh / 2);
  const xsForTicks =
    plotXs.svg.length === n
      ? plotXs.svg
      : points.map((_, j) => plotGutter + j * pxPerQh + pxPerQh / 2);
  const pad = isDay && tagesvorlageDay ? 14 : 6;
  const rScale = isDay
    ? dayResidualLoadScale(points, compareRp, panelH, pad)
    : scaleLinear(
        points.flatMap((p) => [p.rGw, p.rpGw]),
        panelH,
        pad,
        Math.min(...points.flatMap((p) => [p.rGw, p.rpGw]), 0),
        Math.max(...points.flatMap((p) => [p.rGw, p.rpGw])) * 1.02,
      );
  const rYTicks = isDay ? yAxisTicks(rScale.min, rScale.max, 4) : undefined;
  const powerGw = points.flatMap((p) => [p.cMw / 1000, p.dMw / 1000]);
  const powerMaxGw = Math.max(...powerGw, 0.001);
  const powerScale = scaleLinear(powerGw, auxScaleH, pad, 0, powerMaxGw * 1.05);
  const socScale = scaleLinear(
    points.map((p) => p.socGwh),
    auxScaleH,
    pad,
  );
  const peakRpGw = points[peakI].rpGw;
  const dayReduction = frame.peakReductionDayGw ?? 0;
  const dayObserved = frame.peakObservedDayGw ?? points[peakI]?.rGw ?? peakRpGw;
  const dayRef =
    dayPeakReference ??
    (dateKey && dayObserved > 0
      ? formatDayPeakKpiFromSlice(peakRpGw, dayObserved, dateKey).reference
      : defaultMonthPeakReference());
  const peakCopyRef = isDay ? dayRef : defaultMonthPeakReference();

  const captionMain = isDay
  ? dayRef.kind === "day" && dateKey
      ? formatPeakEffectLine(peakRpGw, frame.peakReductionGw, frame.peakReductionPct, { reference: peakCopyRef })
      : formatPeakCaptionDay(peakRpGw, dayReduction, dayObserved)
    : konzeptWorkbench
      ? formatKonzeptWorkbenchCaption(peakRpGw, frame.peakReductionGw)
      : formatPeakEffectLine(peakRpGw, frame.peakReductionGw, frame.peakReductionPct, {
          reference: peakCopyRef,
        });

  const captionMonth =
    isDay && monthContextNote
      ? monthContextNote
      : isDay
        ? formatPeakCaptionMonthContext(frame.peakReductionGw, frame.peakReductionPct, {
            reference: defaultMonthPeakReference(),
          })
        : null;

  const showPowerNote = powerMaxGw < 0.01;
  const socSpanGwh =
    points.length > 0
      ? Math.max(...points.map((p) => p.socGwh)) - Math.min(...points.map((p) => p.socGwh))
      : 0;
  const hideAuxPanels = tagesvorlageDay && isDay;
  const showEmptyScenarioNote = isDay && showPowerNote && socSpanGwh < 0.12;
  const showUeberschussEmptyNote =
    isDay && tagesvorlageDay && strategy === "ueberschuss" && dayNoWindSolarSurplus;
  const bands =
    tagesvorlageDay && isDay && factor !== 1
      ? fleetBandPaths(points, xs, rScale.y, rScale.y, pxPerQh / 2)
      : null;

  return (
    <figure
      className={`v4-fleet-ts-wrap v4-content${prominentMonth && !isDay ? " is-month-prominent" : ""}`}
    >
      <figcaption
        className={`v4-fleet-caption${konzeptWorkbench && !isDay ? " sr-only" : ""}${tagesvorlageDay && isDay ? " sr-only" : ""}`}
      >
        <span className="v4-fleet-caption-main">{captionMain}</span>
        {captionMonth ? <span className="v4-fleet-caption-month num"> {captionMonth}</span> : null}
        {scrollHint && !(tagesvorlageDay && isDay) ? (
          <span className="v4-fleet-caption-hint"> · {scrollHint}</span>
        ) : null}
      </figcaption>
      <div className="v4-fleet-ts-legend num" aria-hidden="true">
        {tagesvorlageDay && isDay ? (
          <>
            <span className="v4-fleet-ts-legend-rp">Gefahrene Restlast R′ (GW)</span>
            <span className="v4-fleet-ts-legend-r">Gemessenes R (GW)</span>
            {factor !== 1 ? (
              <>
                <span className="v4-fleet-ts-legend-c">Laden (neue Last)</span>
                <span className="v4-fleet-ts-legend-d">Entladen</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <span className="v4-fleet-ts-legend-r">Restlast beobachtet (GW)</span>
            <span className="v4-fleet-ts-legend-rp">Restlast mit Speicher (GW)</span>
            {comparePoints ? (
              <span className="v4-fleet-ts-legend-compare">×1 mit Speicher (Vergleich, GW)</span>
            ) : null}
            <span className="v4-fleet-ts-legend-c">Laden (GW)</span>
            <span className="v4-fleet-ts-legend-d">Entladen (GW)</span>
            <span className="v4-fleet-ts-legend-e">SoC Beginn Viertelstunde (GWh)</span>
          </>
        )}
      </div>
      {tagesvorlageDay && isDay && scrollHint ? (
        <p className="v4-fleet-tageshorizont num">{scrollHint}</p>
      ) : null}
      {showEmptyScenarioNote ? (
        <p className="v4-fleet-ts-power-note num">
          Keine nennenswerte Lade- oder Entladeleistung und kaum SoC-Bewegung in diesem Szenario — die Restlast oben zeigt
          trotzdem die Modellwirkung. Leistungs- und SoC-Diagramm ausgeblendet.
        </p>
      ) : null}
      <ChartTooltipPanel
        timeLabel={activePoint ? fleetTooltipTime(activePoint) : null}
        rows={
          activePoint
            ? fleetTooltipRows(activePoint, comparePoints?.[activeIndex!]?.rpGw ?? null)
            : null
        }
        testId="fleet-ts-tooltip"
      />
      <div
        ref={chartRef}
        className="v4-fleet-ts-interactive v4-chart-probe"
        tabIndex={0}
        role="application"
        aria-label={
          tagesvorlageDay && isDay
            ? factor === 1
              ? `Gemessene Restlast R am ${dateKey}, Viertelstunden mit Pfeiltasten wählbar`
              : `Gefahrene Restlast R′ mit Ladung und Entladung am ${dateKey}, Viertelstunden mit Pfeiltasten wählbar`
            : isDay
              ? `Tagesverlauf Restlast und Speicher am ${dateKey}, Viertelstunden mit Pfeiltasten wählbar`
              : `Monatsverlauf Restlast und Speicher, Viertelstunden mit Pfeiltasten wählbar`
        }
        onKeyDown={onKeyDown}
      >
      <div
        ref={scrollRef}
        className="v4-fleet-ts-scroll is-fit"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
      >
        <div className="v4-fleet-ts-inner" style={{ width: "100%" }}>
          <SinglePanel
            title={tagesvorlageDay && isDay ? "Restlast R′" : "Restlast"}
            unit="GW"
            width={width}
            height={panelH}
            yMin={rScale.min}
            yMax={rScale.max}
            yTickValues={rYTicks}
            plotGutter={plotGutter}
            padTop={pad}
            padBottom={pad}
            svgRef={primaryPlotSvgRef}
          >
            {tagesvorlageDay && isDay && factor !== 1 && bands ? (
              <>
                {bands.charge ? <path className="v4-fleet-band-charge" d={bands.charge} /> : null}
                {bands.discharge ? <path className="v4-fleet-band-discharge" d={bands.discharge} /> : null}
              </>
            ) : null}
            {tagesvorlageDay && isDay && factor === 1 ? (
              <polyline
                className="v4-fleet-line-r-measured"
                fill="none"
                points={polylinePoints(
                  xs,
                  points.map((p) => rScale.y(p.rGw)),
                )}
              />
            ) : (
              <>
                <polyline
                  className={tagesvorlageDay && isDay ? "v4-fleet-line-r-thin" : "v4-fleet-line-r"}
                  fill="none"
                  points={polylinePoints(
                    xs,
                    points.map((p) => rScale.y(p.rGw)),
                  )}
                />
                {!tagesvorlageDay && comparePoints ? (
                  <polyline
                    className="v4-fleet-line-compare"
                    fill="none"
                    points={polylinePoints(
                      xs,
                      comparePoints.map((p) => rScale.y(p.rpGw)),
                    )}
                  />
                ) : null}
                <polyline
                  className={tagesvorlageDay && isDay ? "v4-fleet-line-rp-main" : "v4-fleet-line-rp"}
                  fill="none"
                  points={polylinePoints(
                    xs,
                    points.map((p) => rScale.y(p.rpGw)),
                  )}
                />
              </>
            )}
            {!(tagesvorlageDay && isDay && factor === 1) ? (
              <circle className="v4-fleet-peak-mark" cx={xs[peakI]} cy={rScale.y(peakRpGw)} r={3.5} />
            ) : null}
            {activeIndex != null ? (
              <line
                x1={xs[activeIndex]}
                x2={xs[activeIndex]}
                y1={0}
                y2={panelH}
                className="v4-chart-crosshair"
              />
            ) : null}
          </SinglePanel>
          {hideAuxPanels ? null : (
          <SinglePanel
            title="Speicherleistung"
            unit="GW"
            width={width}
            height={auxPanelH}
            yMin={powerScale.min}
            yMax={powerScale.max}
          >
            {showPowerNote ? null : (
              <polyline
                className="v4-fleet-line-c"
                fill="none"
                points={polylinePoints(
                  xs,
                  points.map((p) => powerScale.y(p.cMw / 1000)),
                )}
              />
            )}
            {showPowerNote ? null : (
              <polyline
                className="v4-fleet-line-d"
                fill="none"
                points={polylinePoints(
                  xs,
                  points.map((p) => powerScale.y(p.dMw / 1000)),
                )}
              />
            )}
            {activeIndex != null ? (
              <line
                x1={xs[activeIndex]}
                x2={xs[activeIndex]}
                y1={0}
                y2={auxPanelH}
                className="v4-chart-crosshair"
              />
            ) : null}
          </SinglePanel>
          )}
          {hideAuxPanels ? null : (
          <SinglePanel
            title="Speicherinhalt (Beginn Viertelstunde)"
            unit="GWh"
            width={width}
            height={auxPanelH}
            yMin={socScale.min}
            yMax={socScale.max}
          >
            <polyline
              className="v4-fleet-line-soc"
              fill="none"
              points={polylinePoints(
                xs,
                points.map((p) => socScale.y(p.socGwh)),
              )}
            />
            {activeIndex != null ? (
              <line
                x1={xs[activeIndex]}
                x2={xs[activeIndex]}
                y1={0}
                y2={auxPanelH}
                className="v4-chart-crosshair"
              />
            ) : null}
          </SinglePanel>
          )}
          <div className="v4-fleet-ts-x num" style={{ width }} aria-hidden="true">
            {xTicks.map(({ index, label, align }, ti) => (
              <span
                key={`${index}-${label}`}
                className={`v4-fleet-ts-tick${align === "end" ? " is-end" : ""}`}
                style={
                  align === "end"
                    ? undefined
                    : {
                        left: Math.min(Math.max(xsForTicks[index]!, 12), width - (ti === xTicks.length - 2 ? 44 : 24)),
                      }
                }
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      </div>
      {showUeberschussEmptyNote ? (
        <p className="v4-fleet-ts-power-note">
          An diesem Tag lagen Wind und Sonne in keiner Viertelstunde über dem Verbrauch, darum lädt die Fahrweise
          Überschuss nicht.
        </p>
      ) : null}
    </figure>
  );
}
