"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import {
  fleetChartPointsForIndices,
  dayResidualLoadScale,
  fleetChartTickIndices,
  formatPeakCaptionDay,
  formatPeakCaptionMonthContext,
  formatPeakEffectLine,
  peakIndexRp,
  polylinePoints,
  scaleLinear,
  yAxisTicks,
  type FleetChartPoint,
} from "@/lib/nationalFleetCharts";
import { NationalFleetTimeSeriesChartSkeleton } from "@/components/home/NationalFleetTimeSeriesChartSkeleton";
import type { FleetChartSeriesPayload } from "@/lib/nationalFleetSeriesPayload";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

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
}: {
  title: string;
  unit: string;
  width: number;
  height: number;
  children: React.ReactNode;
  yMin: number;
  yMax: number;
  yTickValues?: number[];
}) {
  const ySpan = yMax - yMin || 1;
  const yAt = (v: number, h: number, pad: number) => pad + ((yMax - v) / ySpan) * (h - 2 * pad);
  const ticks = yTickValues ?? [];
  return (
    <div className="v4-fleet-ts-panel">
      <div className="v4-fleet-ts-panel-head">
        <span className="v4-fleet-ts-panel-title">{title}</span>
        <span className="v4-fleet-ts-panel-unit num">
          {formatQuantity(yMin, "de", 1)}–{formatQuantity(yMax, "de", 1)} {unit}
        </span>
      </div>
      <svg width={width} height={height} className="v4-fleet-ts-svg" aria-hidden="true">
        {ticks.length > 0
          ? ticks.map((v) => {
              const y = yAt(v, height, 6);
              return (
                <g key={v}>
                  <line x1={0} y1={y} x2={width} y2={y} className="v4-fleet-ts-grid" />
                  <text x={4} y={y - 2} className="v4-fleet-ts-ytick num">
                    {formatQuantity(v, "de", 1)}
                  </text>
                </g>
              );
            })
          : null}
        {children}
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
  monthContextNote?: string;
  scrollHint?: string;
  prominentMonth?: boolean;
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
  monthContextNote,
  scrollHint,
  prominentMonth = false,
}: NationalFleetTimeSeriesChartProps) {
  const [frame, setFrame] = useState<ChartFrame | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hover, setHover] = useState<FleetChartPoint | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  const isDay = Boolean(dateKey);

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
    setLoadError(null);
    fetch(`/api/national-fleet/series?${params.toString()}`)
      .then((r) => {
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
    const measure = () => setScrollWidth(el.clientWidth);
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
  const width = scrollWidth > 0 ? scrollWidth : Math.max(320, n * 4);
  const pxPerQh = width / n;
  const panelH = prominentMonth && !isDay ? 124 : isDay ? 104 : 92;
  const auxPanelH = prominentMonth && !isDay ? 88 : panelH;
  const pad = 6;
  const xs = points.map((_, j) => j * pxPerQh + pxPerQh / 2);
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
  const powerScale = scaleLinear(powerGw, panelH, pad, 0, powerMaxGw * 1.05);
  const socScale = scaleLinear(
    points.map((p) => p.socGwh),
    panelH,
    pad,
  );
  const peakRpGw = points[peakI].rpGw;
  const dayReduction = frame.peakReductionDayGw ?? 0;
  const dayObserved = frame.peakObservedDayGw ?? points[peakI]?.rGw ?? peakRpGw;

  const captionMain = isDay
    ? formatPeakCaptionDay(peakRpGw, dayReduction, dayObserved)
    : formatPeakEffectLine(peakRpGw, frame.peakReductionGw, frame.peakReductionPct);

  const captionMonth =
    isDay && monthContextNote
      ? monthContextNote
      : isDay
        ? formatPeakCaptionMonthContext(frame.peakReductionGw, frame.peakReductionPct)
        : null;

  const indexFromClientX = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left + target.scrollLeft;
    return Math.min(points.length - 1, Math.max(0, Math.round(x / pxPerQh)));
  };

  const onMove = (ev: React.MouseEvent<HTMLDivElement>) => {
    setHover(points[indexFromClientX(ev.clientX, ev.currentTarget)]);
    setFocusIndex(null);
  };

  const onTouch = (ev: React.TouchEvent<HTMLDivElement>) => {
    const touch = ev.touches[0];
    if (!touch) {
      return;
    }
    setHover(points[indexFromClientX(touch.clientX, ev.currentTarget)]);
    setFocusIndex(null);
  };

  const activePoint =
    focusIndex != null && points[focusIndex] ? points[focusIndex] : hover;

  const onChartKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (points.length === 0) {
      return;
    }
    const cur = focusIndex ?? (hover ? points.indexOf(hover) : Math.floor(points.length / 2));
  const move = (next: number) => {
      const j = Math.min(points.length - 1, Math.max(0, next));
      setFocusIndex(j);
      setHover(null);
    };
    if (ev.key === "ArrowRight") {
      ev.preventDefault();
      move(cur + 1);
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      move(cur - 1);
    } else if (ev.key === "Home") {
      ev.preventDefault();
      move(0);
    } else if (ev.key === "End") {
      ev.preventDefault();
      move(points.length - 1);
    }
  };

  const showPowerNote = powerMaxGw < 0.01;
  const socSpanGwh =
    points.length > 0
      ? Math.max(...points.map((p) => p.socGwh)) - Math.min(...points.map((p) => p.socGwh))
      : 0;
  const hideAuxPanels = isDay && showPowerNote && socSpanGwh < 0.12;

  return (
    <figure
      className={`v4-fleet-ts-wrap v4-content${prominentMonth && !isDay ? " is-month-prominent" : ""}`}
    >
      <figcaption className="v4-fleet-caption">
        <span className="v4-fleet-caption-main">{captionMain}</span>
        {captionMonth ? <span className="v4-fleet-caption-month num"> {captionMonth}</span> : null}
        {scrollHint ? <span className="v4-fleet-caption-hint"> · {scrollHint}</span> : null}
      </figcaption>
      <div className="v4-fleet-ts-legend num" aria-hidden="true">
        <span className="v4-fleet-ts-legend-r">Restlast beobachtet (GW)</span>
        <span className="v4-fleet-ts-legend-rp">Restlast mit Speicher (GW)</span>
        {comparePoints ? (
          <span className="v4-fleet-ts-legend-compare">×1 mit Speicher (Vergleich, GW)</span>
        ) : null}
        <span className="v4-fleet-ts-legend-c">Laden (GW)</span>
        <span className="v4-fleet-ts-legend-d">Entladen (GW)</span>
        <span className="v4-fleet-ts-legend-e">SoC Beginn Viertelstunde (GWh)</span>
      </div>
      {hideAuxPanels ? (
        <p className="v4-fleet-ts-power-note num">
          Keine nennenswerte Lade- oder Entladeleistung und kaum SoC-Bewegung in diesem Szenario — die Restlast oben zeigt
          trotzdem die Modellwirkung. Leistungs- und SoC-Diagramm ausgeblendet.
        </p>
      ) : null}
      {activePoint ? (
        <p className="v4-fleet-ts-tooltip num" role="status" data-testid="fleet-ts-tooltip">
          {activePoint.ts}: Restlast {formatQuantity(activePoint.rGw, "de", 2)} GW · mit Speicher{" "}
          {formatQuantity(activePoint.rpGw, "de", 2)} GW · Laden {formatQuantity(activePoint.cMw / 1000, "de", 2)} GW ·
          Entladen {formatQuantity(activePoint.dMw / 1000, "de", 2)} GW · SoC{" "}
          {formatQuantity(activePoint.socGwh, "de", 2)} GWh (Beginn)
        </p>
      ) : (
        <p className="v4-fleet-ts-tooltip num muted">
          Tippen oder Zeiger über die Kurven · Pfeiltasten auf dem Chart für die Viertelstunde
        </p>
      )}
      <div
        ref={chartRef}
        className="v4-fleet-ts-interactive"
        tabIndex={0}
        role="application"
        aria-label={
          isDay
            ? `Tagesverlauf Restlast und Speicher am ${dateKey}, Viertelstunden mit Pfeiltasten wählbar`
            : `Monatsverlauf Restlast und Speicher, Viertelstunden mit Pfeiltasten wählbar`
        }
        onKeyDown={onChartKeyDown}
      >
      <div
        ref={scrollRef}
        className="v4-fleet-ts-scroll is-fit"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
      >
        <div className="v4-fleet-ts-inner" style={{ width: "100%" }}>
          <SinglePanel
            title="Restlast"
            unit="GW"
            width={width}
            height={panelH}
            yMin={rScale.min}
            yMax={rScale.max}
            yTickValues={rYTicks}
          >
            <polyline
              className="v4-fleet-line-r"
              fill="none"
              points={polylinePoints(
                xs,
                points.map((p) => rScale.y(p.rGw)),
              )}
            />
            {comparePoints ? (
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
              className="v4-fleet-line-rp"
              fill="none"
              points={polylinePoints(
                xs,
                points.map((p) => rScale.y(p.rpGw)),
              )}
            />
            <circle className="v4-fleet-peak-mark" cx={xs[peakI]} cy={rScale.y(peakRpGw)} r={3.5} />
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
                        left: Math.min(Math.max(xs[index], 12), width - (ti === xTicks.length - 2 ? 44 : 24)),
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
    </figure>
  );
}
