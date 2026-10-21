"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ConnectionLight } from "@/components/connection/ConnectionLight";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { connectionLight } from "@/lib/connectionLight";
import { formatQuantity } from "@/lib/formatQuantity";
import { supermarketTeachingDay, type PeakQuarter, type PeakShavingExplain } from "@/lib/peakShavingExplain";
import { sitePath } from "@/lib/perspective";

function clockLabel(hour: number) {
  const whole = Math.floor(hour);
  const minute = Math.round((hour - whole) * 60) % 60;
  return `${String(whole).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function axisFor(peakKw: number) {
  if (peakKw <= 120) {
    return { max: 135, ticks: [0, 30, 60, 90, 120] };
  }
  const step = peakKw <= 400 ? 50 : 100;
  const top = Math.ceil(peakKw / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= top; tick += step) {
    ticks.push(tick);
  }
  return { max: top + step * 0.25, ticks };
}

export function ConnectionStory() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const story = useMemo(() => supermarketTeachingDay(), []);
  const [step, setStep] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const stepsRef = useRef<Array<HTMLLIElement | null>>([]);
  const titleId = useId();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const ratios = new Map<number, number>();
    const nodes = stepsRef.current.filter((node): node is HTMLLIElement => node !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLLIElement).dataset.step);
          ratios.set(index, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best = 0;
        let bestRatio = -1;
        for (const [index, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = index;
            bestRatio = ratio;
          }
        }
        if (bestRatio > 0) {
          setStep(best);
        }
      },
      // On a phone the sticky chart covers the top of the viewport, so the active band sits in the text card.
      { rootMargin: narrow ? "-62% 0px -12% 0px" : "-38% 0px -42% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, [narrow]);

  const shownPeak = step >= 2 ? story.peakAfterKw : story.peakBeforeKw;
  const light = connectionLight(shownPeak, story.limitKw);
  const deltaKw = Math.max(0, story.peakBeforeKw - story.peakAfterKw);
  const steps = storySteps(story, deltaKw, language);

  return (
    <section id="peak-shaving" aria-labelledby={titleId} className="border-b border-border py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <p className="num text-[12px] tracking-[0.16em] text-muted-foreground uppercase">{tx("Beispiel · Supermarkt", "Example · supermarket")}</p>
        <h2 id={titleId} className="mt-4 flex flex-wrap items-center gap-3 text-[36px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[56px]">
          {tx("Was ist Peak Shaving?", "What is peak shaving?")}
          <GlossaryTip id="peak-shaving" language={language} />
        </h2>
        <p className="mt-4 max-w-[40ch] text-lg leading-snug">
          {tx(
            "Ein Wintertag, eine rote Linie, ein Speicher. Der Chart bleibt stehen. Mit jedem Schritt kommt eine Ebene dazu.",
            "One winter day, one red line, one battery. The chart stays put. Each step adds a layer."
          )}
        </p>

        <div className="connection-story mt-10">
          <div className="connection-story-pin">
            <div className="connection-story-stage">
              <div className="flex gap-1" aria-hidden="true">
                {steps.map((item, index) => (
                  <span key={item.n} className={`h-1 flex-1 ${index <= step ? "bg-foreground" : "bg-border"}`} />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="num text-[12px] tracking-[0.14em] text-muted-foreground uppercase">{tx("Ein Tag am Netzanschluss", "One day at the connection")}</p>
                <p className="num border border-warning px-2 py-1 text-[12px] font-medium tracking-[0.08em] text-warning uppercase">
                  {tx("Beispieldaten", "Example data")}
                </p>
              </div>
              <div className="connection-story-chart flex h-[240px] min-h-[240px] overflow-hidden rounded-md border border-border bg-card lg:h-auto lg:min-h-0 lg:flex-1 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
                <StoryChart story={story} step={step} language={language} stacked={narrow} />
              </div>
              <ConnectionLight light={light} language={language} neutral={step === 0} />
            </div>
          </div>
          <ol>
            {steps.map((item, index) => {
              const active = step === index;
              const last = index === steps.length - 1;
              return (
                <li
                  key={item.n}
                  ref={(node) => {
                    stepsRef.current[index] = node;
                  }}
                  data-step={index}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-h-[40vh] flex-col justify-center border-t border-border bg-card p-6 text-foreground lg:min-h-[60vh] lg:border-0 lg:bg-transparent lg:p-0 ${
                    active ? "lg:text-foreground lg:opacity-100" : "lg:text-muted-foreground lg:opacity-50 lg:focus-within:opacity-100"
                  }`}
                >
                  <p className="num text-[12px] tracking-[0.14em] text-muted-foreground">{item.n}</p>
                  <h3 className="mt-3 max-w-[18ch] text-[22px] leading-snug font-medium tracking-[-0.02em]">{item.title}</h3>
                  <p className="mt-4 max-w-[36ch] text-[16px] leading-[1.6]">{item.body}</p>
                  {item.figure ? (
                    <p className="num mt-6 text-[48px] leading-none tracking-[-0.04em] md:text-[64px]">
                      {item.figure}
                      <span className="ml-2 text-[16px] tracking-normal text-muted-foreground">{item.figureUnit}</span>
                    </p>
                  ) : null}
                  {item.note ? <p className="mt-3 max-w-[36ch] text-sm text-muted-foreground">{item.note}</p> : null}
                  {last ? (
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Link
                        href={sitePath("projekt", "supermarkt")}
                        className="inline-flex h-12 w-fit items-center rounded-md bg-primary px-5 text-[15px] font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {tx("Eigenen Markt rechnen →", "Calculate your own store →")}
                      </Link>
                      <button
                        type="button"
                        className="inline-flex h-12 w-fit items-center rounded-md px-5 text-[15px] font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() => stepsRef.current[0]?.scrollIntoView({ block: "center" })}
                      >
                        {tx("Zurück", "Back")}
                      </button>
                    </div>
                  ) : (
                    <p className="num mt-6 text-[12px] text-muted-foreground lg:hidden">{tx("weiter scrollen ↓", "keep scrolling ↓")}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <p className="num mt-8 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
          {tx(
            `Modell: Speicher startet voll, 90 % Wirkungsgrad, lädt ab ${clockLabel(story.rechargeFromHour)} mit höchstens ${formatQuantity(story.rechargeCapKw, language, 0)} kW nach. Ausschnitt ${clockLabel(story.zoomFromHour)}–${clockLabel(story.zoomToHour)}. Fiktives Profil, nicht gemessen.`,
            `Model: battery starts full, 90% round-trip efficiency, recharges from ${clockLabel(story.rechargeFromHour)} at ${formatQuantity(story.rechargeCapKw, language, 0)} kW at most. Window ${clockLabel(story.zoomFromHour)}–${clockLabel(story.zoomToHour)}. Fictional profile, not measured.`
          )}{" "}
          <Link href="/methodik#peak-erklaert" className="underline underline-offset-[3px]">
            {tx("So ist das gerechnet", "How this is calculated")}
          </Link>
        </p>
      </div>
    </section>
  );
}

function storySteps(story: PeakShavingExplain, deltaKw: number, language: "de" | "en") {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const peak = formatQuantity(story.peakBeforeKw, language, 0);
  const after = formatQuantity(story.peakAfterKw, language, 0);
  const limit = formatQuantity(story.limitKw, language, 0);
  const delta = formatQuantity(deltaKw, language, deltaKw >= 10 ? 0 : 1);
  const euro = story.demandChargeSavingEurPerYear === null ? null : formatQuantity(story.demandChargeSavingEurPerYear, language, 0);
  const soc = formatQuantity(story.socMinPct, language, 0);
  const shaved = formatQuantity(story.shavedKwh, language, 1);
  const when = clockLabel(story.peakHour);
  const holds = story.holdsLimit;

  return [
    {
      n: "01",
      title: tx("Der Abend zieht eine Spitze", "The evening draws a peak"),
      body: tx(
        `Gegen ${when} Uhr braucht der Supermarkt ${peak} kW. Die schwarze Linie ist dieser Bedarf, Viertelstunde für Viertelstunde.`,
        `Around ${when} the supermarket needs ${peak} kW. The black line is that demand, quarter-hour by quarter-hour.`
      ),
      figure: null,
      figureUnit: null,
      note: null,
    },
    {
      n: "02",
      title: tx("Die rote Linie ist der Anschluss", "The red line is the connection"),
      body: tx(
        `Der Anschluss lässt ${limit} kW zu. Was darüber liegt, ist rot. Die Spitze passt nicht durch.`,
        `The connection allows ${limit} kW. Everything above it is red. The peak does not fit.`
      ),
      figure: null,
      figureUnit: null,
      note: null,
    },
    {
      n: "03",
      title: tx("Der Speicher nimmt die Spitze weg", "The battery takes the peak away"),
      body: holds
        ? tx(
            `40 kW und 40 kWh. Er gibt ${shaved} kWh ab. Die fette Linie ist der Bezug aus dem Netz, grau bleibt die alte Last.`,
            `40 kW and 40 kWh. It delivers ${shaved} kWh. The bold line is grid import. Grey is the old load.`
          )
        : tx(
            `40 kW und 40 kWh. Er gibt ab, was er kann. Der Bezug bleibt bei ${after} kW.`,
            `40 kW and 40 kWh. It delivers what it can. Import stays at ${after} kW.`
          ),
      figure: null,
      figureUnit: null,
      note: null,
    },
    {
      n: "04",
      title: tx("Danach ist er nicht leer", "Afterwards it is not empty"),
      body: tx(
        `Er startet voll. In der Spitze fällt der Ladestand auf ${soc} %. Ab ${clockLabel(story.rechargeFromHour)} lädt er mit höchstens ${formatQuantity(story.rechargeCapKw, language, 0)} kW nach, nur solange unter der Linie Luft ist.`,
        `It starts full. During the peak the charge falls to ${soc}%. From ${clockLabel(story.rechargeFromHour)} it recharges at ${formatQuantity(story.rechargeCapKw, language, 0)} kW at most, and only while there is room under the line.`
      ),
      figure: null,
      figureUnit: null,
      note: null,
    },
    {
      n: "05",
      title: tx("Die teure Spitze wird kleiner", "The expensive peak gets smaller"),
      body: holds
        ? tx(
            `Die Spitze sinkt um ${delta} kW. Der Anschluss hält, aber knapp: der Bezug liegt auf der roten Linie.`,
            `The peak falls by ${delta} kW. The connection holds, narrowly: import sits on the red line.`
          )
        : tx(
            `Die Spitze sinkt um ${delta} kW. Der Anschluss passt noch nicht. Übrig bleibt ein Bezug von ${after} kW.`,
            `The peak falls by ${delta} kW. The connection still does not fit. Import left over is ${after} kW.`
          ),
      figure: euro,
      figureUnit: "€/a",
      note: tx(
        "Modellschätzung. Leistungspreis in diesem Beispiel: 120 € je kW und Jahr. Kein Tarif und kein Angebot.",
        "Model estimate. Demand charge in this example: €120 per kW and year. Not a tariff and not a quote."
      ),
    },
  ];
}

function StoryChart({
  story,
  step,
  language,
  stacked,
}: {
  story: PeakShavingExplain;
  step: number;
  language: "de" | "en";
  stacked: boolean;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const frameRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const titleId = useId();

  useEffect(() => {
    const node = frameRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const axis = axisFor(story.peakBeforeKw);
  const showSoc = step >= 3;
  const pad = { l: 56, r: stacked ? 12 : 84, t: stacked ? 20 : 16 };
  const width = Math.max(0, box.width);
  const height = Math.max(0, box.height);
  const axisLabelH = 22;
  const socH = showSoc ? 64 : 0;
  const socGap = showSoc ? 22 : 0;
  const plotBottom = height - axisLabelH - socH - socGap;
  const plotH = Math.max(40, plotBottom - pad.t);
  const plotW = Math.max(40, width - pad.l - pad.r);
  const from = story.zoomFromHour;
  const to = story.zoomToHour;
  const visible = story.quarters.filter((quarter) => quarter.hour >= from && quarter.hour < to);

  const x = (hour: number) => pad.l + ((hour - from) / Math.max(0.25, to - from)) * plotW;
  const y = (kw: number) => pad.t + (1 - kw / axis.max) * plotH;
  const socTop = plotBottom + socGap;
  const socY = (pct: number) => socTop + (1 - pct / 100) * Math.max(32, socH - 8);

  const loadPath = stepPath(visible, to, (quarter) => quarter.loadKw, x, y);
  const netPath = stepPath(visible, to, (quarter) => quarter.netKw, x, y);
  const exceedance = bandPath(visible, to, x, y, (quarter) => quarter.loadKw > story.limitKw, () => story.limitKw, (quarter) => quarter.loadKw);
  const shaved = bandPath(visible, to, x, y, (quarter) => quarter.batteryKw > 0, (quarter) => quarter.netKw, (quarter) => quarter.loadKw);
  const overLeft = bandPath(visible, to, x, y, (quarter) => quarter.netKw > story.limitKw + 0.05, () => story.limitKw, (quarter) => quarter.netKw);

  const peak = visible.reduce<PeakQuarter | null>((best, quarter) => (best === null || quarter.loadKw > best.loadKw ? quarter : best), null);
  const socMin = visible.reduce<PeakQuarter | null>((best, quarter) => (best === null || quarter.socKwh < best.socKwh ? quarter : best), null);
  const afternoon = visible.find((quarter) => quarter.hour === 14) ?? visible[0];

  const summary =
    step === 0
      ? tx(`Lastgang, Spitze ${formatQuantity(story.peakBeforeKw, language, 0)} kW.`, `Load curve, peak ${formatQuantity(story.peakBeforeKw, language, 0)} kW.`)
      : step === 1
        ? tx(`Anschluss ${formatQuantity(story.limitKw, language, 0)} kW, die Spitze liegt darüber.`, `Connection ${formatQuantity(story.limitKw, language, 0)} kW, the peak sits above it.`)
        : step === 2
          ? tx(`Mit Speicher liegt der Bezug bei ${formatQuantity(story.peakAfterKw, language, 0)} kW.`, `With storage, import sits at ${formatQuantity(story.peakAfterKw, language, 0)} kW.`)
          : step === 3
            ? tx(`Ladestand, tiefster Stand ${formatQuantity(story.socMinPct, language, 0)} %.`, `State of charge, lowest point ${formatQuantity(story.socMinPct, language, 0)}%.`)
            : tx(`Leistungspreis-Ersparnis, Modellschätzung.`, `Demand-charge saving, model estimate.`);

  return (
    <div ref={frameRef} className="min-h-0 flex-1">
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
      {width > 0 && height > 0 ? (
        <svg role="img" aria-labelledby={titleId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <title id={titleId}>{summary}</title>
          {axis.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.l}
                x2={pad.l + plotW}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? "stroke-border-strong" : "stroke-gridline"}
                strokeWidth={1}
              />
              <text x={pad.l - 8} y={y(tick) + 4} textAnchor="end" className="num fill-muted-foreground" fontSize={12}>
                {tick === axis.ticks[axis.ticks.length - 1] ? `${formatQuantity(tick, language, 0)} kW` : formatQuantity(tick, language, 0)}
              </text>
            </g>
          ))}
          {[12, 14, 16, 18, 20, 22].filter((hour) => hour >= from && hour <= to).map((hour) => {
            const first = hour <= from + 0.01;
            const last = hour >= to - 0.01;
            const anchor = stacked && first ? "start" : stacked && last ? "end" : "middle";
            const labelX = stacked && first ? pad.l : stacked && last ? pad.l + plotW : x(hour);
            return (
              <text key={hour} x={labelX} y={height - 6} textAnchor={anchor} className="num fill-muted-foreground" fontSize={12}>
                {clockLabel(hour)}
              </text>
            );
          })}
          <g className="story-layer" style={{ opacity: step >= 1 ? 1 : 0 }}>
            <path d={exceedance} fill="hsl(var(--c-limit) / 0.18)" />
            <line
              x1={pad.l}
              x2={pad.l + plotW}
              y1={y(story.limitKw)}
              y2={y(story.limitKw)}
              stroke="hsl(var(--c-limit))"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            {stacked ? (
              <text x={pad.l + 8} y={y(story.limitKw) - 8} textAnchor="start" className="num fill-limit" fontSize={12}>
                {formatQuantity(story.limitKw, language, 0)} kW
              </text>
            ) : (
              <>
                <text x={pad.l + plotW + 8} y={y(story.limitKw) - 2} className="num fill-limit" fontSize={12}>
                  {formatQuantity(story.limitKw, language, 0)} kW
                </text>
                <text x={pad.l + plotW + 8} y={y(story.limitKw) + 14} className="fill-limit" fontSize={12}>
                  {tx("Anschluss", "Connection")}
                </text>
              </>
            )}
          </g>
          <g className="story-layer" style={{ opacity: step >= 2 ? 1 : 0 }}>
            <path d={shaved} fill="hsl(var(--c-bess) / 0.85)" />
            <path d={overLeft} fill="hsl(var(--c-limit) / 0.18)" />
            <path d={netPath} fill="none" className="stroke-foreground" strokeWidth={2.75} />
          </g>
          <path
            d={loadPath}
            fill="none"
            strokeWidth={step >= 2 ? 1.5 : 2.25}
            className="story-layer"
            style={{ stroke: step >= 2 ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
          />
          {afternoon ? (
            <text x={x(afternoon.hour)} y={y(afternoon.loadKw) - 12} className="fill-foreground" fontSize={13}>
              {tx("Last", "Load")}
            </text>
          ) : null}
          {peak ? (
            <text x={x(peak.hour) + 8} y={y(peak.loadKw) - 10} className="num fill-foreground" fontSize={13}>
              {formatQuantity(peak.loadKw, language, 0)} kW
            </text>
          ) : null}
          {step >= 2 && peak ? (
            <text
              x={x(peak.hour)}
              y={y(peak.netKw) + 8 + 13}
              textAnchor="middle"
              className="story-halo fill-foreground"
              fontSize={13}
            >
              {tx("Netzbezug", "Grid import")}
            </text>
          ) : null}
          {showSoc ? (
            <g className="story-layer">
              <text x={pad.l} y={socTop - 8} className="num fill-primary" fontSize={11}>
                {tx("LADESTAND", "CHARGE")}
              </text>
              <line x1={pad.l} x2={pad.l + plotW} y1={socY(0)} y2={socY(0)} className="stroke-gridline" />
              <line x1={pad.l} x2={pad.l + plotW} y1={socY(100)} y2={socY(100)} className="stroke-gridline" />
              <text x={pad.l - 8} y={socY(100) + 4} textAnchor="end" className="num fill-muted-foreground" fontSize={12}>
                100 %
              </text>
              <text x={pad.l - 8} y={socY(0) + 4} textAnchor="end" className="num fill-muted-foreground" fontSize={12}>
                0
              </text>
              <path d={socArea(visible, to, x, socY, story.energyKwh)} fill="hsl(var(--c-bess) / 0.35)" />
              <path d={socLine(visible, to, x, socY, story.energyKwh)} fill="none" stroke="hsl(var(--c-bess))" strokeWidth={2} />
              {socMin ? (
                <text x={x(socMin.hour) + 6} y={socY((socMin.socKwh / story.energyKwh) * 100) - 8} className="num fill-foreground" fontSize={12}>
                  {formatQuantity((socMin.socKwh / story.energyKwh) * 100, language, 0)} %
                </text>
              ) : null}
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}

function stepPath(
  quarters: PeakQuarter[],
  zoomTo: number,
  value: (quarter: PeakQuarter) => number,
  x: (hour: number) => number,
  y: (kw: number) => number
) {
  if (quarters.length === 0) {
    return "";
  }
  let path = `M ${x(quarters[0].hour).toFixed(2)} ${y(value(quarters[0])).toFixed(2)}`;
  for (let index = 0; index < quarters.length; index += 1) {
    const nextHour = index + 1 < quarters.length ? quarters[index + 1].hour : zoomTo;
    path += ` H ${x(nextHour).toFixed(2)}`;
    if (index + 1 < quarters.length) {
      path += ` V ${y(value(quarters[index + 1])).toFixed(2)}`;
    }
  }
  return path;
}

function bandPath(
  quarters: PeakQuarter[],
  zoomTo: number,
  x: (hour: number) => number,
  y: (kw: number) => number,
  when: (quarter: PeakQuarter) => boolean,
  low: (quarter: PeakQuarter) => number,
  high: (quarter: PeakQuarter) => number
) {
  let path = "";
  for (let index = 0; index < quarters.length; index += 1) {
    const quarter = quarters[index];
    if (!when(quarter)) {
      continue;
    }
    const nextHour = index + 1 < quarters.length ? quarters[index + 1].hour : zoomTo;
    const y0 = y(low(quarter));
    const y1 = y(high(quarter));
    path += `M ${x(quarter.hour).toFixed(2)} ${y0.toFixed(2)} H ${x(nextHour).toFixed(2)} V ${y1.toFixed(2)} H ${x(quarter.hour).toFixed(2)} Z `;
  }
  return path;
}

function socLine(quarters: PeakQuarter[], zoomTo: number, x: (hour: number) => number, y: (pct: number) => number, energyKwh: number) {
  return stepPath(quarters, zoomTo, (quarter) => (energyKwh > 0 ? (quarter.socKwh / energyKwh) * 100 : 0), x, y);
}

function socArea(quarters: PeakQuarter[], zoomTo: number, x: (hour: number) => number, y: (pct: number) => number, energyKwh: number) {
  const line = socLine(quarters, zoomTo, x, y, energyKwh);
  if (!line || quarters.length === 0) {
    return "";
  }
  const end = x(zoomTo);
  const start = x(quarters[0].hour);
  return `${line} L ${end.toFixed(2)} ${y(0).toFixed(2)} L ${start.toFixed(2)} ${y(0).toFixed(2)} Z`;
}
