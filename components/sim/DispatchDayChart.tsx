"use client";

import { useEffect, useId, useRef, useState } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import { clampChartAnnotationInPlot, layoutChartLabels } from "@/lib/chartLabelLayout";
import { buildDispatchDayChartXAxisMarks } from "@/lib/dispatchChartXAxis";
import type { AppLanguage } from "@/components/language-context";

export type ChartSample = {
  hour: number;
  timestampIso?: string;
  slotIndex?: number;
  slotCount?: number;
  timeLabel?: string;
  ohne: number;
  mit: number;
  charge: number;
  discharge: number;
  /** 0–1 of nameplate. */
  soc: number;
};

export type ChartAnnotation = {
  hour: number;
  slotIndex?: number;
  value: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  dx?: number;
  dy?: number;
  mdx?: number;
  mdy?: number;
  strong?: boolean;
};

export type DispatchDayChartProps = {
  samples: ChartSample[];
  unit: string;
  y0: number;
  y1: number;
  yTicks: number[];
  hatch: "graphite" | "limit";
  limit?: number | null;
  limitLabel?: string;
  tipLoad: string;
  ariaLabel: string;
  tag: string;
  annotations: ChartAnnotation[];
  chargedNote: string;
  intro: boolean;
  language: AppLanguage;
  /** Pull labels inside the plot and apart from each other. */
  fitLabels?: boolean;
  /** Colour each step of the uncontrolled line. Null keeps the default stroke. */
  segmentColor?: (value: number) => string;
  markerHour?: number | null;
};

const BAND = 32;
const GAP = 16;
const XT = 24;
const PT = 20;

export function niceChartScale(values: number[]) {
  let min = 0;
  let max = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const span = max - min;
  const y0 = min - span * 0.08;
  const y1 = max + span * 0.16;
  return { y0, y1, yTicks: niceTicks(y0, y1) };
}

function niceTicks(y0: number, y1: number) {
  const span = Math.max(y1 - y0, 1e-9);
  const rough = span / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / pow;
  const step = (fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1) * pow;
  const ticks: number[] = [];
  const start = Math.ceil((y0 + span * 0.02) / step) * step;
  const end = y1 - span * 0.02;
  for (let value = start; value <= end + step * 0.01; value += step) {
    const rounded = Math.abs(value) < step / 1000 ? 0 : Math.round(value / step) * step;
    if (rounded > y0 && rounded < y1 && !ticks.includes(rounded)) {
      ticks.push(rounded);
    }
  }
  if (y0 < 0 && y1 > 0 && !ticks.includes(0)) {
    ticks.push(0);
  }
  return ticks.sort((a, b) => a - b);
}

function slotHours(samples: ChartSample[], index: number) {
  if (usesSlotIndex(samples)) {
    return 1 / (samples[index]?.slotCount ?? samples.length);
  }
  const next = samples[index + 1];
  if (!next) {
    return 0.25;
  }
  const delta = next.hour - samples[index].hour;
  return delta > 0 && delta < 2 ? delta : 0.25;
}

function usesSlotIndex(samples: ChartSample[]): boolean {
  return samples.length > 0 && samples.every((sample) => sample.slotIndex !== undefined && sample.slotCount !== undefined);
}

function xLeft(samples: ChartSample[], index: number, padLeft: number, plotW: number): number {
  const sample = samples[index];
  if (!sample) {
    return padLeft;
  }
  if (usesSlotIndex(samples)) {
    const count = sample.slotCount ?? samples.length;
    return padLeft + ((sample.slotIndex ?? index) / count) * plotW;
  }
  return padLeft + (sample.hour / 24) * plotW;
}

function xRight(samples: ChartSample[], index: number, padLeft: number, plotW: number): number {
  if (usesSlotIndex(samples)) {
    const sample = samples[index];
    const count = sample?.slotCount ?? samples.length;
    return padLeft + (((sample?.slotIndex ?? index) + 1) / count) * plotW;
  }
  return padLeft + ((samples[index].hour + slotHours(samples, index)) / 24) * plotW;
}

function sampleKey(sample: ChartSample, index: number): string {
  return sample.timestampIso ?? `slot-${index}`;
}

function annotationX(samples: ChartSample[], note: ChartAnnotation, padLeft: number, plotW: number): number {
  if (note.slotIndex !== undefined && usesSlotIndex(samples)) {
    return xLeft(samples, note.slotIndex, padLeft, plotW);
  }
  if (usesSlotIndex(samples)) {
    let index = 0;
    for (let cursor = 0; cursor < samples.length; cursor += 1) {
      if (samples[cursor].hour <= note.hour) {
        index = cursor;
      }
    }
    return xLeft(samples, index, padLeft, plotW);
  }
  return padLeft + (note.hour / 24) * plotW;
}

function clockLabel(hour: number) {
  const total = Math.round(hour * 60);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function tickDigits(value: number) {
  if (value === 0 || Number.isInteger(value)) {
    return 0;
  }
  return Math.abs(value) >= 10 ? 0 : 1;
}

export function DispatchDayChart({
  samples,
  unit,
  y0,
  y1,
  yTicks,
  hatch,
  limit = null,
  limitLabel,
  tipLoad,
  ariaLabel,
  tag,
  annotations,
  chargedNote,
  intro,
  language,
  fitLabels = false,
  segmentColor,
  markerHour = null,
}: DispatchDayChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const rawId = useId().replace(/:/g, "");
  const span = y1 - y0 || 1;

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const mobile = width > 0 && width < 600;
  const plotH = mobile ? 260 : 320;
  const padLeft = mobile ? 34 : 44;
  const padRight = mobile ? 8 : 10;
  const plotW = Math.max(width - padLeft - padRight, 1);
  const height = PT + plotH + GAP + BAND + XT;
  const bandTop = PT + plotH + GAP;
  const yAt = (value: number) => PT + ((y1 - value) / span) * plotH;
  const xAtSample = (index: number) => xLeft(samples, index, padLeft, plotW);
  const xAtSampleEnd = (index: number) => xRight(samples, index, padLeft, plotW);

  function indexAt(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || samples.length === 0) {
      return 0;
    }
    const frac = (clientX - rect.left - padLeft) / plotW;
    if (usesSlotIndex(samples)) {
      return Math.min(samples.length - 1, Math.max(0, Math.floor(frac * samples.length)));
    }
    const hour = frac * 24;
    let index = 0;
    for (let cursor = 0; cursor < samples.length; cursor += 1) {
      if (samples[cursor].hour <= hour) {
        index = cursor;
      }
    }
    return index;
  }

  let hatchPath = "";
  let chargeArea = "";
  samples.forEach((sample, index) => {
    const left = xAtSample(index);
    const right = xAtSampleEnd(index);
    const barW = Math.max(right - left, 1);
    if (hatch === "graphite" && sample.discharge > 0.001 && sample.ohne > sample.mit) {
      hatchPath += `M${left},${yAt(sample.ohne)}h${barW}V${yAt(sample.mit)}h${-barW}Z`;
    }
    if (hatch === "limit" && limit != null && sample.ohne > limit) {
      hatchPath += `M${left},${yAt(sample.ohne)}h${barW}V${yAt(limit)}h${-barW}Z`;
    }
    if (sample.charge > 0.001 && sample.mit > sample.ohne) {
      chargeArea += `M${left},${yAt(sample.mit)}h${barW}V${yAt(sample.ohne)}h${-barW}Z`;
    }
  });

  const chargeSlots = samples.flatMap((sample, index) => (sample.charge > 0.001 ? [index] : []));
  const dischargeSlots = samples.flatMap((sample, index) => (sample.discharge > 0.001 ? [index] : []));
  let socHold = "";
  let socCharge = "";
  let socLine = samples.length > 0 ? `M${xAtSample(0)},${bandTop + BAND - samples[0].soc * BAND}` : "";
  samples.forEach((sample, index) => {
    const left = xAtSample(index);
    const right = xAtSampleEnd(index);
    const top = bandTop + BAND - Math.max(0, Math.min(1, sample.soc)) * BAND;
    const cell = `M${left},${top}H${right}V${bandTop + BAND}H${left}Z`;
    if (sample.charge > 0.001) {
      socCharge += cell;
    } else {
      socHold += cell;
    }
    socLine += `V${top}H${right}`;
  });

  const step = (key: "ohne" | "mit") => {
    if (samples.length === 0) {
      return "";
    }
    let path = `M${xAtSample(0)},${yAt(samples[0][key])}`;
    samples.forEach((sample, index) => {
      path += `H${xAtSampleEnd(index)}`;
      const next = samples[index + 1];
      if (next) {
        path += `V${yAt(next[key])}`;
      }
    });
    return path;
  };

  const hovered = hover == null ? null : samples[hover];
  const tipLeft = hovered ? (xAtSample(hover ?? 0) + xAtSampleEnd(hover ?? 0)) / 2 : 0;
  const plotLeftInset = padLeft + 2;
  const plotRightInset = width - padRight - 2;
  const placedLabels = !fitLabels || mobile
    ? []
    : layoutChartLabels(
        annotations.map((note) => ({
          text: note.text,
          x: annotationX(samples, note, padLeft, plotW) + (note.dx ?? 0),
          y: yAt(note.value) + (note.dy ?? 0),
          anchor: note.anchor ?? "start",
          prefers: (note.dy ?? 0) < 0 ? ("up" as const) : ("down" as const),
        })),
        { minX: plotLeftInset, maxX: plotRightInset, minY: 14, maxY: bandTop - 4 }
      );
  const xTicks = buildDispatchDayChartXAxisMarks(samples, {
    plotW,
    padLeft,
    padRight,
    chartWidth: width,
    mobile,
  });

  return (
    <div className={`sim-chart${intro ? " intro" : ""}`} ref={wrapRef}>
      <div className="sim-svgwrap">
        {width > 0 && samples.length > 0 ? (
          <svg height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
            <defs>
              <pattern id={`h-${rawId}`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" strokeWidth="1" className={hatch === "limit" ? "hatch-limit" : "hatch-graphite"} />
              </pattern>
              <clipPath id={`c-${rawId}`}>
                <rect className="clipr" x={padLeft} y="0" width={plotW} height={height} />
              </clipPath>
            </defs>
            {yTicks.map((tick) => (
              <g key={tick}>
                {limit != null && Math.abs(tick - limit) < span * 0.01 ? null : (
                  <line x1={padLeft} x2={width - padRight} y1={yAt(tick)} y2={yAt(tick)} className={tick === 0 ? "zl" : "gl"} />
                )}
                <text x={padLeft - 6} y={yAt(tick) + 4} textAnchor="end" className="tk">
                  {formatQuantity(tick, language, tickDigits(tick))}
                </text>
              </g>
            ))}
            <text x={padLeft - 6} y={PT - 8} textAnchor="end" className="tk">
              {unit}
            </text>
            <text x={width - padRight} y={PT - 8} textAnchor="end" className="tk">
              {tag}
            </text>
            <g className={intro ? "fade" : undefined}>
              <path d={hatchPath} fill={`url(#h-${rawId})`} />
              <path d={chargeArea} className="a-ch" />
            </g>
            {chargeSlots.map((index, order) => {
              const sample = samples[index];
              const left = xAtSample(index) + 0.5;
              const barW = Math.max(xAtSampleEnd(index) - xAtSample(index) - 1, 1);
              return (
                <rect
                  key={`c-${sampleKey(sample, index)}`}
                  className="bar b-ch"
                  x={left}
                  y={yAt(0)}
                  width={barW}
                  height={Math.max(yAt(-sample.charge) - yAt(0), 0)}
                  style={intro ? { animationDelay: `${600 + 15 * order}ms` } : undefined}
                />
              );
            })}
            {dischargeSlots.map((index, order) => {
              const sample = samples[index];
              const left = xAtSample(index) + 0.5;
              const barW = Math.max(xAtSampleEnd(index) - xAtSample(index) - 1, 1);
              return (
                <rect
                  key={`d-${sampleKey(sample, index)}`}
                  className="bar b-dis"
                  x={left}
                  y={yAt(sample.discharge)}
                  width={barW}
                  height={Math.max(yAt(0) - yAt(sample.discharge), 0)}
                  style={intro ? { animationDelay: `${900 + 15 * order}ms` } : undefined}
                />
              );
            })}
            {segmentColor
              ? samples.map((sample, index) => {
                  const y = yAt(sample.ohne);
                  return (
                    <line
                      key={`seg-${sampleKey(sample, index)}`}
                      x1={xAtSample(index)}
                      x2={xAtSampleEnd(index)}
                      y1={y}
                      y2={y}
                      stroke={segmentColor(sample.ohne)}
                      strokeWidth="2.5"
                      clipPath={`url(#c-${rawId})`}
                    />
                  );
                })
              : <path d={step("ohne")} className="l-ohne" clipPath={`url(#c-${rawId})`} />}
            {markerHour != null ? (
              <line className="l-spoke" x1={padLeft + (markerHour / 24) * plotW} x2={padLeft + (markerHour / 24) * plotW} y1={PT} y2={PT + plotH} />
            ) : null}
            {limit != null ? (
              <>
                <line x1={padLeft} x2={width - padRight} y1={yAt(limit)} y2={yAt(limit)} className="l-lim" />
                {limitLabel ? (
                  <text x={padLeft + 6} y={yAt(limit) - 6} className="an r lb">
                    {limitLabel}
                  </text>
                ) : null}
              </>
            ) : null}
            <path d={step("mit")} className="l-mit" pathLength={1} />
            {mobile
              ? annotations.map((note, index) => {
                  const mx = Math.min(
                    Math.max(annotationX(samples, note, padLeft, plotW) + (note.mdx ?? 0), padLeft + 8),
                    width - padRight - 8
                  );
                  const my = yAt(note.value) + (note.mdy ?? 0);
                  return (
                    <g key={`m-${index}`} className={intro ? "mk fade2" : "mk"}>
                      <circle cx={mx} cy={my} r="8" />
                      <text x={mx} y={my + 3.5} textAnchor="middle">
                        {index + 1}
                      </text>
                    </g>
                  );
                })
              : fitLabels
                ? placedLabels.map((placed, index) => {
                    const note = annotations[index];
                    const clamped = clampChartAnnotationInPlot(
                      placed.x,
                      placed.y,
                      placed.anchor,
                      note?.text ?? "",
                      plotLeftInset,
                      plotRightInset
                    );
                    return (
                      <text
                        key={`a-${index}`}
                        x={clamped.x}
                        y={clamped.y}
                        textAnchor={clamped.anchor}
                        className={`an lb paper${note?.strong ? " s" : ""}${intro ? " fade2" : ""}`}
                      >
                        {note?.text}
                      </text>
                    );
                  })
                : annotations.map((note, index) => {
                    const baseX = annotationX(samples, note, padLeft, plotW);
                    const placedX = baseX + (note.dx ?? 0);
                    const clamped = clampChartAnnotationInPlot(
                      placedX,
                      yAt(note.value) + (note.dy ?? 0),
                      note.anchor ?? "start",
                      note.text,
                      plotLeftInset,
                      plotRightInset
                    );
                    return (
                      <text
                        key={`a-${index}`}
                        x={clamped.x}
                        y={clamped.y}
                        textAnchor={clamped.anchor}
                        className={`an lb paper${note.strong ? " s" : ""}${intro ? " fade2" : ""}`}
                      >
                        {note.text}
                      </text>
                    );
                  })}
            <rect x={padLeft} y={bandTop} width={plotW} height={BAND} className="band-bg" />
            <path d={socHold} className="soc-a" shapeRendering="crispEdges" />
            <path d={socCharge} className="soc-a c" shapeRendering="crispEdges" />
            <path d={socLine} className="soc-l" />
            <text x={padLeft + 6} y={bandTop + 12} className="lb soc-name">
              {language === "de" ? "Ladezustand" : "State of charge"}
            </text>
            <text x={padLeft - 6} y={bandTop + 10} textAnchor="end" className="tk soc-tick">
              100
            </text>
            <text x={padLeft - 6} y={bandTop + BAND} textAnchor="end" className="tk soc-tick">
              0 %
            </text>
            {usesSlotIndex(samples)
              ? xTicks.map((mark) => {
                  const x = xAtSample(mark.index ?? 0);
                  return (
                    <g key={`tick-${mark.index}-${mark.label}`}>
                      <line x1={x} x2={x} y1={bandTop + BAND} y2={bandTop + BAND + 4} className="zl" />
                      <text x={x} y={height - 4} textAnchor={mark.anchor} className="tk">
                        {mark.label}
                      </text>
                    </g>
                  );
                })
              : xTicks.map((mark) => {
                  const hour = mark.hour ?? 0;
                  const x = padLeft + (hour / 24) * plotW;
                  return (
                    <g key={`hour-${hour}`}>
                      <line x1={x} x2={x} y1={bandTop + BAND} y2={bandTop + BAND + 4} className="zl" />
                      <text x={x} y={height - 4} textAnchor={mark.anchor} className="tk">
                        {mark.label}
                      </text>
                    </g>
                  );
                })}
            {hovered ? (
              <line className="xh" x1={tipLeft} x2={tipLeft} y1={PT} y2={bandTop + BAND} />
            ) : null}
            <rect
              className="hit"
              x={padLeft}
              y={PT}
              width={plotW}
              height={bandTop + BAND - PT}
              fill="transparent"
              onMouseMove={(event) => setHover(indexAt(event.clientX))}
              onMouseLeave={() => setHover(null)}
              onTouchStart={(event) => {
                const touch = event.touches[0];
                if (touch) {
                  setHover(indexAt(touch.clientX));
                }
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (touch) {
                  setHover(indexAt(touch.clientX));
                }
              }}
            />
          </svg>
        ) : null}
        {hovered ? (
          <div className="sim-tt" style={{ left: tipLeft > width * 0.62 ? tipLeft - 248 : tipLeft + 12, top: PT + 8 }}>
            <b>
              {hovered.timeLabel ?? clockLabel(hovered.hour)}–
              {samples[(hover ?? 0) + 1]?.timeLabel ?? clockLabel(hovered.hour + slotHours(samples, hover ?? 0))}
            </b>
            <span>
              <i>{tipLoad}</i>
              {formatQuantity(hovered.ohne, language, 1)} {unit}
            </span>
            <span>
              <i>{language === "de" ? "Speicher" : "Storage"}</i>
              {storageText(hovered, language, unit)}
            </span>
            <span>
              <i>{language === "de" ? "Ladezustand" : "State of charge"}</i>
              {formatQuantity(hovered.soc * 100, language, 0)} %
            </span>
            <p>{chargedNote}</p>
          </div>
        ) : null}
      </div>
      {mobile ? (
        <ol className="sim-notes">
          {annotations.map((note, index) => (
            <li key={`${note.text}-${index}`} className={note.strong ? "s" : undefined}>
              <b>{index + 1}</b>
              <span>{note.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function storageText(sample: ChartSample, language: AppLanguage, unit: string) {
  const net = sample.discharge - sample.charge;
  if (Math.abs(net) < 0.05) {
    return `0 ${unit}`;
  }
  const sign = net > 0 ? "+" : "−";
  return `${sign}${formatQuantity(Math.abs(net), language, 1)} ${unit}`;
}

export function SimLegend({
  items,
}: {
  items: Array<{ swatch: "ohne" | "mit" | "limit" | "charge" | "discharge" | "hatch" | "hatch-limit"; label: string }>;
}) {
  return (
    <ul className="sim-legend">
      {items.map((item) => (
        <li key={item.label}>
          <i className={`swatch ${item.swatch}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
