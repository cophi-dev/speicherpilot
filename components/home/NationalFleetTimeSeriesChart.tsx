"use client";

import { useMemo, useState } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import {
  fleetChartPointsForIndices,
  formatPeakEffectLine,
  peakIndexRp,
  polylinePoints,
  REF_RESIDUAL_PEAK_GW,
  scaleLinear,
  type FleetChartPoint,
} from "@/lib/nationalFleetCharts";
import type { NationalFleetRunSeries } from "@/lib/nationalMonthFleetModel";

const PX_PER_QH = 2.4;

function SinglePanel({
  title,
  unit,
  width,
  height,
  children,
  yMin,
  yMax,
}: {
  title: string;
  unit: string;
  width: number;
  height: number;
  children: React.ReactNode;
  yMin: number;
  yMax: number;
}) {
  return (
    <div className="v4-fleet-ts-panel">
      <div className="v4-fleet-ts-panel-head">
        <span className="v4-fleet-ts-panel-title">{title}</span>
        <span className="v4-fleet-ts-panel-unit num">
          {formatQuantity(yMin, "de", 1)}–{formatQuantity(yMax, "de", 1)} {unit}
        </span>
      </div>
      <svg width={width} height={height} className="v4-fleet-ts-svg" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

export function NationalFleetTimeSeriesChart({
  run,
  peakReductionGw,
  peakReductionPct,
  indices,
  compareRun,
  compareLabel = "×1 Restlast mit Speicher (Vergleich)",
  scrollHint,
}: {
  run: NationalFleetRunSeries;
  peakReductionGw: number;
  peakReductionPct: number;
  indices?: number[];
  compareRun?: NationalFleetRunSeries | null;
  compareLabel?: string;
  scrollHint?: string;
}) {
  const points = useMemo(() => fleetChartPointsForIndices(run, indices), [run, indices]);
  const comparePoints = useMemo(() => {
    if (!compareRun) {
      return null;
    }
    return fleetChartPointsForIndices(compareRun, indices);
  }, [compareRun, indices]);

  const peakLocal = useMemo(() => {
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

  const peakI = indices ? peakLocal : peakIndexRp(run);
  const [hover, setHover] = useState<FleetChartPoint | null>(null);

  const width = points.length * PX_PER_QH;
  const panelH = 92;
  const pad = 6;

  const xs = points.map((_, j) => j * PX_PER_QH + PX_PER_QH / 2);

  const rScale = scaleLinear(
    points.flatMap((p) => [p.rGw, p.rpGw]),
    panelH,
    pad,
    Math.min(...points.flatMap((p) => [p.rGw, p.rpGw]), 0),
    Math.max(...points.map((p) => p.rpGw)) * 1.02,
  );
  const powerScale = scaleLinear(
    points.flatMap((p) => [p.cMw, p.dMw]),
    panelH,
    pad,
    0,
    Math.max(...points.flatMap((p) => [p.cMw, p.dMw]), 1) * 1.05,
  );
  const socScale = scaleLinear(
    points.map((p) => p.socGwh),
    panelH,
    pad,
  );

  const tickEvery = points.length <= 120 ? 4 : 96;
  const tickIndices = useMemo(() => {
    const ticks: number[] = [0];
    for (let j = tickEvery; j < points.length; j += tickEvery) {
      ticks.push(j);
    }
    if (ticks[ticks.length - 1] !== points.length - 1) {
      ticks.push(points.length - 1);
    }
    return ticks;
  }, [points.length, tickEvery]);

  const peakRpGw = points[peakI].rpGw;

  const onMove = (ev: React.MouseEvent<HTMLDivElement>) => {
    const scroll = ev.currentTarget;
    const rect = scroll.getBoundingClientRect();
    const x = ev.clientX - rect.left + scroll.scrollLeft;
    const j = Math.min(points.length - 1, Math.max(0, Math.round(x / PX_PER_QH)));
    setHover(points[j]);
  };

  return (
    <figure className="v4-fleet-ts-wrap v4-content">
      <figcaption className="v4-fleet-caption">
        {formatPeakEffectLine(peakRpGw, peakReductionGw, peakReductionPct)}
        {scrollHint ? ` · ${scrollHint}` : null}
      </figcaption>
      <div className="v4-fleet-ts-legend num" aria-hidden="true">
        <span className="v4-fleet-ts-legend-r">Restlast beobachtet</span>
        <span className="v4-fleet-ts-legend-rp">Restlast mit Speicher</span>
        {comparePoints ? <span className="v4-fleet-ts-legend-compare">{compareLabel}</span> : null}
        <span className="v4-fleet-ts-legend-c">Laden</span>
        <span className="v4-fleet-ts-legend-d">Entladen</span>
        <span className="v4-fleet-ts-legend-e">Speicherfüllstand</span>
      </div>
      {hover ? (
        <p className="v4-fleet-ts-tooltip num" role="status">
          {hover.ts}: Restlast {formatQuantity(hover.rGw, "de", 2)} GW · mit Speicher{" "}
          {formatQuantity(hover.rpGw, "de", 2)} GW · Laden {formatQuantity(hover.cMw, "de", 0)} MW · Entladen{" "}
          {formatQuantity(hover.dMw, "de", 0)} MW · SoC {formatQuantity(hover.socGwh, "de", 2)} GWh
        </p>
      ) : (
        <p className="v4-fleet-ts-tooltip num muted">Zeiger über die Kurven bewegen für die Viertelstunde</p>
      )}
      <div
        className="v4-fleet-ts-scroll"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Zeitverlauf Referenzspitze beobachtet ${formatQuantity(REF_RESIDUAL_PEAK_GW, "de", 2)} Gigawatt`}
      >
        <div className="v4-fleet-ts-inner" style={{ width }}>
          <SinglePanel
            title="Restlast"
            unit="GW"
            width={width}
            height={panelH}
            yMin={rScale.min}
            yMax={rScale.max}
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
            <circle
              className="v4-fleet-peak-mark"
              cx={xs[peakI]}
              cy={rScale.y(peakRpGw)}
              r={3.5}
            />
          </SinglePanel>
          <SinglePanel
            title="Speicherleistung"
            unit="MW"
            width={width}
            height={panelH}
            yMin={powerScale.min}
            yMax={powerScale.max}
          >
            <polyline
              className="v4-fleet-line-c"
              fill="none"
              points={polylinePoints(
                xs,
                points.map((p) => powerScale.y(p.cMw)),
              )}
            />
            <polyline
              className="v4-fleet-line-d"
              fill="none"
              points={polylinePoints(
                xs,
                points.map((p) => powerScale.y(p.dMw)),
              )}
            />
          </SinglePanel>
          <SinglePanel
            title="Speicherinhalt (Beginn Viertelstunde)"
            unit="GWh"
            width={width}
            height={panelH}
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
          <div className="v4-fleet-ts-x num" aria-hidden="true">
            {tickIndices.map((j) => (
              <span
                key={j}
                className="v4-fleet-ts-tick"
                style={{ left: xs[j] }}
              >
                {points[j].ts.includes("T") ? points[j].ts.slice(11, 16) : points[j].label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
