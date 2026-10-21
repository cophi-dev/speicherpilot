"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useLanguage } from "@/components/language-context";
import {
  clockRadius,
  clockRuns,
  formatClockHours,
  type ClockSample,
  type DayClockView,
} from "@/lib/dayClock";
import { formatQuantity } from "@/lib/formatQuantity";

function polar(cx: number, cy: number, radius: number, hour: number) {
  const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function pairPath(
  from: ClockSample,
  to: ClockSample,
  cx: number,
  cy: number,
  maxGw: number,
  hole: number,
  outer: number,
  innerGw: (sample: ClockSample) => number,
  outerGw: (sample: ClockSample) => number
) {
  const a = polar(cx, cy, clockRadius(outerGw(from), maxGw, hole, outer), from.hour);
  const b = polar(cx, cy, clockRadius(outerGw(to), maxGw, hole, outer), to.hour);
  const c = polar(cx, cy, clockRadius(innerGw(to), maxGw, hole, outer), to.hour);
  const d = polar(cx, cy, clockRadius(innerGw(from), maxGw, hole, outer), from.hour);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)} L ${c.x.toFixed(2)} ${c.y.toFixed(2)} L ${d.x.toFixed(2)} ${d.y.toFixed(2)} Z`;
}

function strokePath(samples: ClockSample[], cx: number, cy: number, radiusAt: (sample: ClockSample) => number, hourOf: (sample: ClockSample) => number) {
  return samples
    .map((sample, index) => {
      const point = polar(cx, cy, radiusAt(sample), hourOf(sample));
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function DayClock({ clock }: { clock: DayClockView }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const titleId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const size = Math.max(280, Math.round(width || 320));
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 36;
  const hole = outer * 0.34;
  const maxGw = clock.maxGw > 0 ? clock.maxGw : 1;
  const radiusAt = (gw: number) => clockRadius(gw, maxGw, hole, outer);
  const runs = clockRuns(clock.samples);
  const closing =
    clock.closeMidnight && clock.samples.length > 1
      ? { ...clock.samples[0], hour: 24 }
      : null;

  const bands: Array<{ d: string; kind: "wind" | "gap" | "surplus" }> = [];
  const windLines: string[] = [];
  const loadLines: string[] = [];

  function pushPair(from: ClockSample, to: ClockSample) {
    if (from.loadGw > from.windSolarGw) {
      bands.push({
        kind: "gap",
        d: pairPath(
          from,
          to,
          cx,
          cy,
          maxGw,
          hole,
          outer,
          (sample) => sample.windSolarGw,
          (sample) => Math.max(sample.windSolarGw, sample.loadGw)
        ),
      });
    }
    if (from.windSolarGw > from.loadGw) {
      bands.push({
        kind: "surplus",
        d: pairPath(
          from,
          to,
          cx,
          cy,
          maxGw,
          hole,
          outer,
          (sample) => sample.loadGw,
          (sample) => Math.max(sample.loadGw, sample.windSolarGw)
        ),
      });
    }
  }

  for (const run of runs) {
    for (let index = 0; index < run.length - 1; index += 1) {
      pushPair(run[index], run[index + 1]);
    }
    const last = run[run.length - 1];
    const closesHere = closing && last.hour === 23.75;
    if (last && !closesHere) {
      pushPair(last, { ...last, hour: last.hour + 0.25 });
    }
    if (run.length > 0) {
      windLines.push(strokePath(run, cx, cy, (sample) => radiusAt(sample.windSolarGw), (sample) => sample.hour));
      loadLines.push(strokePath(run, cx, cy, (sample) => radiusAt(sample.loadGw), (sample) => sample.hour));
    }
  }
  if (closing) {
    const last = clock.samples.find((sample) => sample.hour === 23.75) ?? clock.samples[clock.samples.length - 1];
    pushPair(last, closing);
    const bridge = [last, closing];
    windLines.push(strokePath(bridge, cx, cy, (sample) => radiusAt(sample.windSolarGw), (sample) => sample.hour));
    loadLines.push(strokePath(bridge, cx, cy, (sample) => radiusAt(sample.loadGw), (sample) => sample.hour));
  }

  const loadPeak = clock.samples.reduce<ClockSample | null>(
    (best, sample) => (best === null || sample.loadGw > best.loadGw ? sample : best),
    null
  );
  const windPeak = clock.samples.reduce<ClockSample | null>(
    (best, sample) => (best === null || sample.windSolarGw > best.windSolarGw ? sample : best),
    null
  );

  const hoursLabel = formatClockHours(clock.surplusHours, language);
  const headline = language === "de" ? clock.headline.de : clock.headline.en;
  const windowLabel = clock.surplusRun
    ? `${hourText(clock.surplusRun.fromHour)}–${hourText(clock.surplusRun.toHour)}`
    : null;

  return (
    <section aria-labelledby={titleId} className="mt-12 border-t border-border pt-12">
      <p className="num text-[12px] tracking-[0.16em] text-muted-foreground uppercase">
        {tx("Deutschland", "Germany")} · {language === "de" ? clock.dateLabel.de : clock.dateLabel.en} · 24 h
      </p>
      <h2 id={titleId} className="mt-3 max-w-[18ch] text-[32px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[48px]">
        {headline}
      </h2>
      <div className="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.72fr)] lg:gap-14">
        <div ref={frameRef} className="mx-auto w-full max-w-[560px]">
          {width > 0 ? (
            <svg
              role="img"
              aria-labelledby={titleId}
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="h-auto w-full"
            >
              <title>{headline}</title>
              {Array.from({ length: 24 }, (_, hour) => {
                const inner = polar(cx, cy, hour % 3 === 0 ? hole : outer - 8, hour);
                const rim = polar(cx, cy, outer, hour);
                return (
                  <line
                    key={hour}
                    x1={inner.x}
                    y1={inner.y}
                    x2={rim.x}
                    y2={rim.y}
                    className={hour % 3 === 0 ? "stroke-border-strong" : "stroke-gridline"}
                    strokeWidth={1}
                  />
                );
              })}
              {clock.ringGw.map((gw) => (
                <circle
                  key={gw}
                  cx={cx}
                  cy={cy}
                  r={radiusAt(gw)}
                  fill="none"
                  className="stroke-border"
                  strokeWidth={1}
                />
              ))}
              {bands.map((band, index) => (
                <path
                  key={`${band.kind}-${index}`}
                  d={band.d}
                  className={band.kind === "surplus" ? "clock-in" : undefined}
                  fill={
                    band.kind === "surplus"
                      ? "hsl(var(--c-bess) / 0.9)"
                      : band.kind === "gap"
                        ? "hsl(var(--foreground) / 0.1)"
                        : "hsl(var(--foreground) / 0.045)"
                  }
                />
              ))}
              {windLines.map((d, index) => (
                <path key={`wind-${index}`} d={d} fill="none" className="stroke-foreground" strokeWidth={1.6} />
              ))}
              {loadLines.map((d, index) => (
                <path key={`load-${index}`} d={d} fill="none" className="stroke-foreground" strokeWidth={2.4} />
              ))}
              {clock.surplusRun ? (
                <SurplusArc
                  fromHour={clock.surplusRun.fromHour}
                  toHour={clock.surplusRun.toHour}
                  radius={outer - 1}
                  cx={cx}
                  cy={cy}
                />
              ) : null}
              {clock.ringGw.map((gw, index) => {
                const point = polar(cx, cy, Math.max(hole + 18, radiusAt(gw) - 12), 1.35 + index * 3.15);
                return (
                  <text key={`ring-${gw}`} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" className="num fill-muted-foreground" fontSize={12}>
                    {gw} GW
                  </text>
                );
              })}
              {Array.from({ length: 8 }, (_, index) => {
                const hour = index * 3;
                const point = polar(cx, cy, outer + 16, hour);
                return (
                  <text key={`hour-${hour}`} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" className="num fill-muted-foreground" fontSize={12}>
                    {String(hour).padStart(2, "0")}
                  </text>
                );
              })}
              {loadPeak ? (
                <DirectLabel
                  cx={cx}
                  cy={cy}
                  hour={nudgeHour(loadPeak.hour)}
                  radius={clearRadius(radiusAt(loadPeak.loadGw), 78, hole, outer)}
                  text={tx("Verbrauch", "Demand")}
                />
              ) : null}
              {windPeak ? (
                <DirectLabel
                  cx={cx}
                  cy={cy}
                  hour={separatedHour(nudgeHour(windPeak.hour), loadPeak ? nudgeHour(loadPeak.hour) : null)}
                  radius={clearRadius(radiusAt(windPeak.windSolarGw), 112, hole, outer)}
                  text={tx("Wind + Sonne", "Wind + solar")}
                />
              ) : null}
              <circle cx={cx} cy={cy} r={hole - 2} className="fill-background" />
              <text x={cx} y={cy - 6} textAnchor="middle" className={`num ${clock.surplusHours > 0 ? "fill-primary" : "fill-foreground"}`} fontSize={Math.max(28, Math.min(52, hole * 0.62))}>
                {hoursLabel} h
              </text>
              {hole >= 56 ? (
                <text x={cx} y={cy + hole * 0.42} textAnchor="middle" className="fill-muted-foreground" fontSize={13}>
                  {clock.surplusHours > 0 ? tx("Überschuss", "Surplus") : tx("kein Überschuss", "no surplus")}
                </text>
              ) : null}
            </svg>
          ) : (
            <div className="aspect-square w-full" />
          )}
        </div>
        <div>
          <p className="num text-[12px] tracking-[0.14em] text-muted-foreground uppercase">{tx("Überschuss heute", "Surplus today")}</p>
          <p className="num mt-2 text-[52px] leading-none tracking-[-0.04em] md:text-[64px]">
            {formatQuantity(clock.surplusGwh, language, 1)}
            <span className="ml-2 text-[18px] text-muted-foreground">GWh</span>
          </p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {windowLabel
              ? tx(`Längstes Fenster ${windowLabel} Uhr`, `Longest window ${windowLabel}`)
              : tx("heute keiner", "none today")}
          </p>
          <p className="num mt-8 text-[12px] tracking-[0.14em] text-muted-foreground uppercase">{tx("Große Speicher", "Large storage")}</p>
          <p className="num mt-2 text-[40px] leading-none tracking-[-0.03em]">
            {clock.fleetEnergyGwh === null ? "—" : formatQuantity(clock.fleetEnergyGwh, language, 1)}
            <span className="ml-2 text-[16px] text-muted-foreground">GWh</span>
          </p>
          <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed">
            {clock.fleetShare !== null
              ? tx(
                  `Sie fassen ${formatQuantity(clock.fleetShare * 100, language, clock.fleetShare >= 0.1 ? 0 : 1)} % dieses Überschusses, als Größe daneben, nicht als gespeicherte Menge.`,
                  `They hold ${formatQuantity(clock.fleetShare * 100, language, clock.fleetShare >= 0.1 ? 0 : 1)}% of this surplus, as a size beside it, not as energy stored.`
                )
              : clock.fleetLabel
                ? tx(`Stand ${clock.fleetLabel.de}. Heute liegt kein Überschuss daneben.`, `As of ${clock.fleetLabel.en}. There is no surplus beside it today.`)
                : tx("Die Bestandszahl fehlt für diesen Abruf.", "The fleet figure is missing for this fetch.")}
          </p>
          <p className="mt-6 max-w-[40ch] text-[15px] leading-relaxed text-foreground">
            {clock.surplusHours > 0
              ? tx(
                  "Die äußere Linie ist der Verbrauch. Liegt Wind plus Sonne darüber, ist die Fläche dazwischen Überschuss.",
                  "The outer line is demand. Where wind plus solar sits outside it, the area between them is surplus."
                )
              : tx(
                  "Die kräftige Linie ist der Verbrauch, die dünne ist Wind plus Sonne. Heute bleibt der Verbrauch außen.",
                  "The strong line is demand, the thin line is wind plus solar. Today demand stays on the outside."
                )}
          </p>
          <p className="num mt-6 max-w-[46ch] text-[12px] leading-relaxed text-muted-foreground">
            <a className="underline underline-offset-[3px]" href={clock.energyChartsUrl}>
              Energy-Charts
            </a>
            {tx(
              `, Fraunhofer ISE, öffentliche Nettostromerzeugung Deutschland, ${clock.dateLabel.de}, Viertelstunde, CC BY 4.0.`,
              `, Fraunhofer ISE, public net generation for Germany, ${clock.dateLabel.en}, quarter-hours, CC BY 4.0.`
            )}{" "}
            {clock.fleetLabel ? (
              <>
                <a className="underline underline-offset-[3px]" href={clock.batteryChartsUrl}>
                  Battery Charts
                </a>
                {tx(`, Stand ${clock.fleetLabel.de}.`, `, as of ${clock.fleetLabel.en}.`)}
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}

function clearRadius(line: number, textWidth: number, hole: number, outer: number) {
  const minR = hole + textWidth / 2 + 8;
  const inside = line - 18;
  if (inside >= minR && inside < outer - 4) {
    return inside;
  }
  const outside = line + 20;
  if (outside >= minR && outside <= outer - 4) {
    return outside;
  }
  return Math.min(outer - 4, Math.max(minR, line));
}

function separatedHour(hour: number, other: number | null) {
  if (other === null) {
    return hour;
  }
  const delta = Math.abs(hour - other);
  const gap = Math.min(delta, 24 - delta);
  if (gap >= 3) {
    return hour;
  }
  return (other + 5.5) % 24;
}

function nudgeHour(hour: number) {
  const nearest = Math.round(hour / 3) * 3;
  if (Math.abs(hour - nearest) < 0.65) {
    return hour + 1.15;
  }
  return hour;
}

function hourText(hour: number) {
  const whole = Math.floor(hour);
  const minute = Math.round((hour - whole) * 60) % 60;
  return `${String(whole % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function DirectLabel({ cx, cy, hour, radius, text }: { cx: number; cy: number; hour: number; radius: number; text: string }) {
  const point = polar(cx, cy, radius, hour);
  return (
    <text x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" fontSize={12}>
      {text}
    </text>
  );
}

function SurplusArc({ fromHour, toHour, radius, cx, cy }: { fromHour: number; toHour: number; radius: number; cx: number; cy: number }) {
  const start = polar(cx, cy, radius, fromHour);
  const end = polar(cx, cy, radius, toHour >= 24 ? 24 : toHour);
  const span = toHour - fromHour;
  const large = span > 12 ? 1 : 0;
  return (
    <path
      d={`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
      fill="none"
      stroke="hsl(var(--c-bess))"
      strokeWidth={4}
      className="clock-in"
    />
  );
}
