"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { HeuteAnnotation, HeuteImNetz, HeutePoint } from "@/lib/heuteImNetz";

const QUARTER_H = 0.25;

export function HeuteHero({ heute }: { heute: HeuteImNetz }) {
  const { language } = useLanguage();
  const router = useRouter();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const figure =
    heute.figureValue === null ? null : formatQuantity(heute.figureValue, language, heute.figureDigits);
  const unit = heute.figureUnit ? (language === "de" ? heute.figureUnit.de : heute.figureUnit.en) : null;
  const headline = language === "de" ? heute.headline.de : heute.headline.en;

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <section className="border-b border-border" aria-labelledby="heute-title">
      <div className="border-b border-border bg-background/80">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-2.5 md:px-8">
          <p className="num inline-flex items-center gap-2 text-[12px] tracking-[0.14em] text-primary uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
            Live
          </p>
          {heute.ticker.map((item) => (
            <p key={item.id} className="num text-[12px] text-muted-foreground">
              <span className="tracking-[0.08em] uppercase">{language === "de" ? item.label.de : item.label.en}</span>
              <span className="ml-1.5 text-foreground">{item.value}</span>
            </p>
          ))}
        </div>
      </div>

      <div>
        <div className="heute-layout mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-14">
          <div className="heute-copy">
            <p className="num text-[12px] tracking-[0.14em] text-muted-foreground uppercase">
              {tx("Heute im Netz", "Today on the grid")}
              <span className="text-muted-foreground"> · battery storage & grid connection planner</span>
            </p>
            <h1 id="heute-title" className="mt-4 text-foreground">
              {figure ? (
                <>
                  <span className="num block text-[84px] leading-none tracking-[-0.04em] md:text-[112px]">{figure}</span>
                  <span className="mt-3 block max-w-[16ch] text-[28px] leading-[1.15] font-medium tracking-[-0.03em] md:text-[36px]">
                    {unit ? <span className="text-muted-foreground">{unit} </span> : null}
                    {headline}
                  </span>
                </>
              ) : (
                <span className="block text-[36px] leading-[1.05] font-medium tracking-[-0.03em] md:text-[56px]">{headline}</span>
              )}
            </h1>
          </div>

          <div className="heute-chart min-w-0 bg-background">
            <HeuteChart heute={heute} language={language} />
            <ol className="mt-3 flex flex-col gap-2 sm:hidden">
              {heute.annotations.map((item) => (
                <li key={item.n} className="flex items-baseline gap-3 text-sm">
                  <span className="num inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                    {item.n}
                  </span>
                  <span>{language === "de" ? item.label.de : item.label.en}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="heute-cta flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/site?view=projekt"
              className="inline-flex h-12 items-center rounded-md bg-primary px-5 text-[15px] font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {tx("Eigenen Standort rechnen →", "Size your own site →")}
            </Link>
            <Link href="/site?view=netz" className="text-sm font-medium underline underline-offset-[3px]">
              {tx("Anschluss prüfen", "Check a connection")}
            </Link>
            <Link href="/live" className="text-sm text-muted-foreground underline underline-offset-[3px]">
              {tx("Alle Zahlen", "All figures")}
            </Link>
          </div>

          <dl className="heute-stats grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5">
            <div>
              <dt className="num text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{tx("Überschuss heute", "Surplus today")}</dt>
              <dd className="num mt-1 text-[28px] leading-none tracking-[-0.03em]">
                {formatQuantity(heute.surplusGwh, language, heute.surplusGwh >= 10 ? 0 : 1)}
                <span className="ml-1 text-[14px] text-muted-foreground">GWh</span>
              </dd>
              <dd className="num mt-1 text-[12px] text-muted-foreground">
                {heute.windowLabel ?? (heute.surplusGwh > 0 ? tx("über den Tag", "across the day") : tx("heute keiner", "none today"))}
              </dd>
            </div>
            <div>
              <dt className="num text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{tx("Große Speicher", "Large storage")}</dt>
              <dd className="num mt-1 text-[28px] leading-none tracking-[-0.03em]">
                {heute.fleetEnergyGwh === null ? "—" : formatQuantity(heute.fleetEnergyGwh, language, 1)}
                <span className="ml-1 text-[14px] text-muted-foreground">GWh</span>
              </dd>
              {heute.fleetShare !== null ? (
                <dd className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, heute.fleetShare * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
                    {tx(
                      `fassen ${formatQuantity(heute.fleetShare * 100, language, 0)} % dieses Überschusses, als Größe daneben, nicht als gespeicherte Menge.`,
                      `hold ${formatQuantity(heute.fleetShare * 100, language, 0)}% of this surplus as a size beside it, not as energy stored.`
                    )}
                  </p>
                </dd>
              ) : (
                <dd className="mt-1 text-[12px] text-muted-foreground">
                  {heute.fleetLabel
                    ? tx(`Stand ${heute.fleetLabel.de}`, `As of ${heute.fleetLabel.en}`)
                    : tx("Bestand gerade nicht lesbar", "Stock not readable just now")}
                </dd>
              )}
            </div>
          </dl>

          <div className="heute-note max-w-[46ch]">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {language === "de" ? heute.detail.de : heute.detail.en}{" "}
              {heute.empty ? null : <GlossaryTip id="residuallast" language={language} />}
            </p>
            <p className="num mt-3 text-[12px] leading-relaxed text-muted-foreground">
              {language === "de" ? heute.source.de : heute.source.en}{" "}
              {heute.fleetHref ? (
                <a className="underline underline-offset-[3px]" href={heute.fleetHref}>
                  Battery Charts
                </a>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeuteChart({ heute, language }: { heute: HeuteImNetz; language: "de" | "en" }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const labelId = useId();
  const described = heute.annotations
    .map((item) => `${item.n}. ${language === "de" ? item.label.de : item.label.en}`)
    .join(" ");
  const caption = language === "de" ? heute.detail.de : heute.detail.en;

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(280, Math.round(node.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = width < 640 ? 300 : 480;
  const summary = `${caption} ${described}`.trim();

  return (
    <div ref={box} className="h-[300px] sm:h-[480px]">
      <svg
        role="img"
        aria-labelledby={labelId}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block text-foreground"
      >
        <title id={labelId}>{summary}</title>
        {heute.empty ? (
          <text x={24} y={height / 2} className="fill-muted-foreground" fontSize="14">
            {language === "de" ? "Noch keine Viertelstunde." : "No quarter-hour yet."}
          </text>
        ) : (
          <ChartGeometry heute={heute} width={width} height={height} language={language} />
        )}
      </svg>
    </div>
  );
}

function ChartGeometry({
  heute,
  width,
  height,
  language,
}: {
  heute: HeuteImNetz;
  width: number;
  height: number;
  language: "de" | "en";
}) {
  const compact = width < 640;
  const pad = { l: compact ? 40 : 56, r: 16, t: compact ? 28 : 36, b: 32 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const { min, max, ticks } = heute.axis;
  const xOf = (hour: number) => pad.l + (hour / 24) * plotW;
  const yOf = (gw: number) => {
    const span = max - min || 1;
    return pad.t + (1 - (gw - min) / span) * plotH;
  };
  const futureX = xOf(Math.min(24, Math.max(0, heute.nowHour)));
  const line = stepPath(heute.points, xOf, yOf);
  const hours = [0, 6, 12, 18, 24];

  return (
    <g>
      <rect x={futureX} y={pad.t} width={Math.max(0, pad.l + plotW - futureX)} height={plotH} className="fill-secondary/60" />
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={yOf(tick)}
            y2={yOf(tick)}
            className={tick === 0 ? "stroke-border-strong" : "stroke-gridline"}
            strokeWidth={tick === 0 ? 1.25 : 1}
          />
          <text x={pad.l - 8} y={yOf(tick) + 4} textAnchor="end" className="fill-muted-foreground" fontSize="12" fontFamily="var(--font-plex-mono), monospace">
            {tick === ticks[ticks.length - 1] ? `${formatQuantity(tick, language, 0)} GW` : formatQuantity(tick, language, 0)}
          </text>
        </g>
      ))}
      {hours.map((hour) => (
        <text key={hour} x={xOf(hour)} y={height - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="12" fontFamily="var(--font-plex-mono), monospace">
          {String(hour).padStart(2, "0")}
        </text>
      ))}
      {heute.points.map((point) =>
        point.surplus ? (
          <rect
            key={`${point.hour}-surplus`}
            x={xOf(point.hour)}
            y={yOf(point.residualGw)}
            width={Math.max(1, xOf(point.hour + QUARTER_H) - xOf(point.hour))}
            height={Math.max(0, yOf(0) - yOf(point.residualGw))}
            style={{ fill: "hsl(var(--c-bess) / 0.55)" }}
          />
        ) : null
      )}
      <path d={line} fill="none" className="stroke-load" strokeWidth={2.25} strokeLinejoin="miter" />
      <text x={pad.l} y={18} className="fill-foreground" fontSize="13">
        {language === "de" ? "Residuallast" : "Residual load"}
      </text>
      <line x1={futureX} x2={futureX} y1={pad.t} y2={pad.t + plotH} className="jetzt-in stroke-foreground" strokeWidth={1} />
      <g className="jetzt-in">
        <rect x={Math.min(futureX + 6, width - pad.r - 52)} y={pad.t + 6} width={46} height={18} rx={2} className="fill-foreground" />
        <text
          x={Math.min(futureX + 29, width - pad.r - 29)}
          y={pad.t + 18}
          textAnchor="middle"
          className="fill-background"
          fontSize="10"
          fontFamily="var(--font-plex-mono), monospace"
        >
          {language === "de" ? "JETZT" : "NOW"}
        </text>
      </g>
      {heute.annotations.map((item, index) => (
        <Annotation
          key={item.n}
          item={item}
          index={index}
          x={xOf(item.atHour)}
          y={yOf(item.residualGw)}
          compact={compact}
          plotLeft={pad.l}
          plotRight={width - pad.r}
          plotTop={pad.t}
          language={language}
        />
      ))}
    </g>
  );
}

function Annotation({
  item,
  index,
  x,
  y,
  compact,
  plotLeft,
  plotRight,
  plotTop,
  language,
}: {
  item: HeuteAnnotation;
  index: number;
  x: number;
  y: number;
  compact: boolean;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  language: "de" | "en";
}) {
  const above = index !== 1;
  const labelY = above ? Math.max(plotTop + 28, y - 26) : y + 32;
  const anchorEnd = x > (plotLeft + plotRight) / 2;
  const labelX = anchorEnd ? Math.min(plotRight, x + 16) : Math.max(plotLeft + 8, x - 16);
  const text = language === "de" ? item.label.de : item.label.en;
  return (
    <g>
      {!compact ? <line x1={x} y1={y} x2={anchorEnd ? labelX : labelX} y2={labelY - 8} className="stroke-border-strong" strokeWidth={1} /> : null}
      <circle cx={x} cy={y} r={10} className="fill-foreground" />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" className="fill-background" fontSize="11" fontFamily="var(--font-plex-mono), monospace">
        {item.n}
      </text>
      {compact ? null : (
        <text
          x={labelX}
          y={labelY}
          textAnchor={anchorEnd ? "end" : "start"}
          className="fill-foreground"
          fontSize="13"
        >
          {text}
        </text>
      )}
    </g>
  );
}

function stepPath(points: HeutePoint[], xOf: (hour: number) => number, yOf: (gw: number) => number): string {
  let path = "";
  points.forEach((point, index) => {
    const previous = points[index - 1];
    const adjacent = previous !== undefined && Math.abs(point.hour - previous.hour - QUARTER_H) < 0.02;
    const x0 = xOf(point.hour);
    const x1 = xOf(point.hour + QUARTER_H);
    const y = yOf(point.residualGw);
    path += adjacent ? `L ${x0.toFixed(1)} ${y.toFixed(1)} H ${x1.toFixed(1)} ` : `M ${x0.toFixed(1)} ${y.toFixed(1)} H ${x1.toFixed(1)} `;
  });
  return path;
}
