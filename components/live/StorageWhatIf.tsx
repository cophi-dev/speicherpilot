"use client";

/**
 * Residual-load what-if chart (moreStorage). The national surplus/export simulation lives in
 * {@link SurplusDaySimulation} on `/live`.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { GlossaryTip } from "@/components/GlossaryTip";
import { Slider } from "@/components/ui/slider";
import { formatQuantity } from "@/lib/formatQuantity";
import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import { buildMoreStorage, MORE_STORAGE_ROUND_TRIP, type MoreStoragePoint, type MoreStorageReport, type MoreStorageStep } from "@/lib/moreStorage";
import { parseStorageFactor, STORAGE_FACTORS, storageDayCatalog, type StorageDayPick, type StorageFactor } from "@/lib/storageDays";
import type { ResidualDay } from "@/lib/windSolarResidual";

const PICKS: Array<{ id: StorageDayPick; de: string; en: string }> = [
  { id: "today", de: "Heute", en: "Today" },
  { id: "yesterday", de: "Gestern", en: "Yesterday" },
  { id: "sunniest", de: "Sonnigster", en: "Sunniest" },
  { id: "windiest", de: "Windigster", en: "Windiest" },
];

function shortDate(dateBerlin: string): string {
  const [, month, day] = dateBerlin.split("-");
  return `${day}.${month}.`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function useAnimatedAreas(points: MoreStoragePoint[]) {
  const [shown, setShown] = useState(points);
  const shownRef = useRef(points);
  useEffect(() => {
    const from = shownRef.current;
    const to = points;
    if (from === to) {
      return;
    }
    if (from.length !== to.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = to;
      setShown(to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 200);
      const next = to.map((point, index) => ({
        ...point,
        chargeMw: from[index].chargeMw + (point.chargeMw - from[index].chargeMw) * t,
        dischargeMw: from[index].dischargeMw + (point.dischargeMw - from[index].dischargeMw) * t,
      }));
      shownRef.current = next;
      setShown(next);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [points]);
  return shown;
}

export function StorageWhatIf({
  fleet,
  days,
  todayKey,
  initialDate,
  initialFallback,
  language,
}: {
  fleet: LargeBatteryFleet | null;
  days: ResidualDay[];
  todayKey: string;
  initialDate: string | null;
  initialFallback: boolean;
  language: "de" | "en";
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const catalog = useMemo(() => storageDayCatalog(days, todayKey), [days, todayKey]);
  const factor = parseStorageFactor(searchParams.get("x"));
  const requested = searchParams.get("tag");
  const date = days.some((day) => day.dateBerlin === requested) ? requested : initialDate;
  const day = days.find((entry) => entry.dateBerlin === date) ?? null;
  const fallback = Boolean(initialFallback && day && day.dateBerlin === initialDate && day.dateBerlin !== todayKey && !requested);
  const report = useMemo(
    () =>
      buildMoreStorage({
        fleet,
        day,
        fallback,
        berlinTodayKey: todayKey,
        showWithoutSurplus: true,
      }),
    [fleet, day, fallback, todayKey]
  );
  const step = report.steps.find((entry) => entry.factor === factor) ?? report.steps[0] ?? null;

  function select(next: { factor?: StorageFactor; date?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    const x = next.factor ?? factor;
    const tag = next.date === undefined ? date : next.date;
    if (x === 1) {
      params.delete("x");
    } else {
      params.set("x", String(x));
    }
    if (tag) {
      params.set("tag", tag);
    } else {
      params.delete("tag");
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { scroll: false });
  }

  if (!report.available || !step) {
    return (
      <article className="rounded-md border border-border bg-card p-4 md:p-5">
        <h2 className="text-xl font-medium">{tx("Was wäre mit mehr Speicher?", "What if there were more storage?")}</h2>
        <p className="mt-3 max-w-[68ch] text-sm text-muted-foreground">
          {report.reason === "no-fleet"
            ? tx(
                "Die Reihe der großen Batteriespeicher ist gerade nicht erreichbar. Ohne den Bestand steht hier keine Schätzung.",
                "The large-battery series is not reachable just now. Without the fleet there is no estimate here."
              )
            : tx(
                "In den letzten Wochen liegt kein Tag vor, an dem Wind plus Sonne über der Last lag. Ohne Überschuss steht hier keine Grafik.",
                "The last few weeks have no day when wind plus solar exceeded load. Without surplus there is no chart here."
              )}
        </p>
      </article>
    );
  }

  const index = Math.max(0, STORAGE_FACTORS.indexOf(factor));

  return (
    <article className="rounded-md border border-border bg-card" aria-labelledby="more-storage-title">
      <div className="px-4 pt-4 md:px-6 md:pt-5">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Deutschland", "Germany")}</p>
        <h2 id="more-storage-title" className="mt-1 max-w-[20ch] text-[28px] leading-tight font-medium md:text-[36px]">
          {tx("Was wäre mit mehr Speicher?", "What if there were more storage?")}
        </h2>
        <p id="more-storage-residual" className="mt-3 max-w-[68ch] text-sm">
          {language === "de" ? (
            <>
              Die Kurve ist die Residuallast <GlossaryTip id="residuallast" language={language} />: was andere Kraftwerke und Import liefern müssen, wenn Wind und Sonne von der Last abgezogen sind.
            </>
          ) : (
            <>
              The curve is residual load <GlossaryTip id="residuallast" language={language} />: what other plants and imports have to supply once wind and solar are taken off the load.
            </>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={tx("Tag", "Day")}>
          {PICKS.map((pick) => {
            const pickDate = catalog[pick.id];
            const pressed = pickDate !== null && pickDate === date;
            return (
              <button
                key={pick.id}
                type="button"
                aria-pressed={pressed}
                disabled={!pickDate}
                onClick={() => select({ date: pickDate })}
                className={`inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 ${pressed ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}
              >
                <span>{language === "de" ? pick.de : pick.en}</span>
                {pickDate ? <span className="num text-[12px] opacity-80">{shortDate(pickDate)}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 px-4 md:px-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)] lg:items-start">
        <StorageChart report={report} step={step} language={language} showNow={date === todayKey} />
        <div>
          <p className="num text-[40px] leading-none text-primary">{language === "de" ? step.shareLabel.de : step.shareLabel.en}</p>
          <p className="mt-1 text-sm">{language === "de" ? step.shareCaption.de : step.shareCaption.en}</p>
          <p className="num mt-4 text-[32px] leading-none">{language === "de" ? step.peakLabel.de : step.peakLabel.en}</p>
          <p className="num mt-1 text-[12px] text-muted-foreground">{language === "de" ? step.fleetLabel.de : step.fleetLabel.en}</p>
          {step.estimateNote ? (
            <p className="mt-3 border border-warning/40 bg-warning/10 px-2 py-1 text-[13px] font-medium text-foreground">
              {language === "de" ? step.estimateNote.de : step.estimateNote.en}
            </p>
          ) : null}
          <label className="mt-5 block">
            <span className="num text-[12px] text-muted-foreground">{tx("Speicherbestand", "Storage fleet")}</span>
            <Slider
              min={0}
              max={STORAGE_FACTORS.length - 1}
              step={1}
              value={[index]}
              onValueChange={(value) => {
                const raw = Array.isArray(value) ? value[0] : Number(value);
                const next = STORAGE_FACTORS[raw];
                if (next) {
                  select({ factor: next });
                }
              }}
            />
          </label>
          <div className="mt-2 flex justify-between">
              {STORAGE_FACTORS.map((stop) => (
                <button
                  key={stop}
                  type="button"
                  tabIndex={-1}
                  onClick={() => select({ factor: stop })}
                  className={`num text-[12px] ${stop === factor ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {stop === 1 ? tx("heute", "today") : `×${stop}`}
                </button>
              ))}
            </div>
          <p className="num mt-4 text-[12px] text-muted-foreground">
            {tx(`Start bei 10 % der Nennenergie, nutzbar 10–90 %, ${Math.round(MORE_STORAGE_ROUND_TRIP * 100)} % auf der Abgabe, nur Überschuss, Entladung ab 17 Uhr`, `Start at 10% of nameplate, usable 10–90%, ${Math.round(MORE_STORAGE_ROUND_TRIP * 100)}% on discharge, surplus only, discharge from 17:00`)}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 md:px-6 md:pb-5">
        <p id="more-storage-sentence" className="max-w-[68ch] text-sm text-muted-foreground" aria-live="polite">
          {language === "de" ? step.reading.de : step.reading.en} <GlossaryTip id="modellschaetzung" language={language} />
        </p>
        {report.footnote ? (
          <p className="mt-3 max-w-[68ch] text-[12px] text-muted-foreground">
            {language === "de" ? report.footnote.de : report.footnote.en}{" "}
            {report.fleet ? (
              <a className="underline underline-offset-[3px]" href={report.fleet.chartUrl}>
                {report.fleet.source === "battery-charts" ? "Battery Charts" : "Energy-Charts"}
              </a>
            ) : null}
            {" · "}
            <a className="underline underline-offset-[3px]" href="https://api.energy-charts.info/total_power?country=de">
              Energy-Charts
            </a>
            {" · "}
            <a className="underline underline-offset-[3px]" href="/methodik#live">
              {tx("Annahmen", "Assumptions")}
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function StorageChart({
  report,
  step,
  language,
  showNow,
}: {
  report: MoreStorageReport;
  step: MoreStorageStep;
  language: "de" | "en";
  showNow: boolean;
}) {
  const { ref, width } = useWidth();
  const points = useAnimatedAreas(step.points);
  const height = width > 0 && width < 640 ? 300 : 420;
  const label = `${language === "de" ? step.shareLabel.de : step.shareLabel.en} ${language === "de" ? step.shareCaption.de : step.shareCaption.en}. ${language === "de" ? step.peakLabel.de : step.peakLabel.en}.`;
  return (
    <div ref={ref} className="min-w-0">
      {width > 0 ? (
        <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block">
          <title>{label}</title>
          <StorageChartBody points={points} step={step} report={report} width={width} height={height} language={language} showNow={showNow} />
        </svg>
      ) : (
        <div className="h-[300px]" />
      )}
    </div>
  );
}

function berlinHourNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (Number.isFinite(hour) ? hour % 24 : 0) + (Number.isFinite(minute) ? minute : 0) / 60;
}

function StorageChartBody({
  points,
  step,
  report,
  width,
  height,
  language,
  showNow,
}: {
  points: MoreStoragePoint[];
  step: MoreStorageStep;
  report: MoreStorageReport;
  width: number;
  height: number;
  language: "de" | "en";
  showNow: boolean;
}) {
  const hatchId = useId().replace(/:/g, "");
  if (points.length === 0) {
    return null;
  }
  const pad = { l: 64, r: 12, t: 20, b: 28 };
  const plotW = Math.max(1, width - pad.l - pad.r);
  const plotH = Math.max(1, height - pad.t - pad.b);
  const yMin = report.yMinGw;
  const yMax = report.yMaxGw;
  const xOf = (hour: number) => pad.l + (Math.min(24, Math.max(0, hour)) / 24) * plotW;
  const yOfMw = (mw: number) => {
    const span = yMax - yMin || 1;
    const share = (mw / 1000 - yMin) / span;
    return pad.t + (1 - share) * plotH;
  };
  const runs = splitRuns(points);
  const now = showNow ? berlinHourNow() : null;

  function band(run: MoreStoragePoint[], topMw: (point: MoreStoragePoint) => number, bottomMw: (point: MoreStoragePoint) => number) {
    if (run.length === 0) {
      return null;
    }
    const forward: string[] = [];
    const back: string[] = [];
    run.forEach((point, index) => {
      const end = index + 1 < run.length ? run[index + 1].hour : Math.min(24, point.hour + 0.25);
      if (index === 0) {
        forward.push(`${xOf(point.hour).toFixed(1)},${yOfMw(topMw(point)).toFixed(1)}`);
      }
      forward.push(`${xOf(end).toFixed(1)},${yOfMw(topMw(point)).toFixed(1)}`);
      back.push(`${xOf(end).toFixed(1)},${yOfMw(bottomMw(point)).toFixed(1)} ${xOf(point.hour).toFixed(1)},${yOfMw(bottomMw(point)).toFixed(1)}`);
    });
    return `${forward.join(" ")} ${back.reverse().join(" ")}`;
  }

  const line = runs
    .map((run) =>
      run
        .map((point, index) => {
          const end = index + 1 < run.length ? run[index + 1].hour : Math.min(24, point.hour + 0.25);
          const start = `${xOf(point.hour).toFixed(1)},${yOfMw(point.residualMw).toFixed(1)}`;
          return `${start} ${xOf(end).toFixed(1)},${yOfMw(point.residualMw).toFixed(1)}`;
        })
        .join(" ")
    )
    .join(" ");

  const eveningStart = points.find((point) => point.hour >= 17)?.hour ?? 17;
  const eveningEnd = points.length > 0 ? Math.min(24, points[points.length - 1].hour + 0.25) : 24;
  const before = step.eveningPeakGw !== null && step.eveningPeakGw > 0 ? yOfMw(step.eveningPeakGw * 1000) : null;
  const after =
    step.eveningPeakGw !== null && step.peakReductionGw !== null && step.eveningPeakGw > 0
      ? yOfMw((step.eveningPeakGw - step.peakReductionGw) * 1000)
      : null;
  const lineLabel = points[0] ?? null;
  const storedAnchor = points.reduce((best, point) => (point.chargeMw > best.chargeMw ? point : best), points[0]);
  const storedHeight = storedAnchor ? Math.abs(yOfMw(0) - yOfMw(-storedAnchor.chargeMw)) : 0;
  const storedY = storedAnchor ? (yOfMw(0) + yOfMw(-storedAnchor.chargeMw)) / 2 : 0;
  const hatchAnchor = points.reduce((best, point) => {
    const left = Math.max(0, -point.residualMw - point.chargeMw);
    const bestLeft = Math.max(0, -best.residualMw - best.chargeMw);
    return left > bestLeft ? point : best;
  }, points[0]);
  const hatchLeft = hatchAnchor ? Math.max(0, -hatchAnchor.residualMw - hatchAnchor.chargeMw) : 0;
  const hatchY = hatchAnchor
    ? (yOfMw(Math.min(0, hatchAnchor.residualMw)) + yOfMw(Math.min(0, -hatchAnchor.chargeMw))) / 2
    : 0;
  const showHatch = hatchLeft > 0 && Math.abs(yOfMw(Math.min(0, hatchAnchor.residualMw)) - yOfMw(Math.min(0, -hatchAnchor.chargeMw))) > 18 && Math.abs(hatchY - storedY) > 20;

  return (
    <>
      <defs>
        <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--c-curtail))" strokeWidth="1.3" />
        </pattern>
      </defs>
      {report.yTicksGw.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={yOfMw(tick * 1000)}
            y2={yOfMw(tick * 1000)}
            stroke={tick === 0 ? "hsl(var(--border-strong))" : "hsl(var(--gridline))"}
          />
          <text x={pad.l - 8} y={yOfMw(tick * 1000) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {tick === report.yTicksGw[report.yTicksGw.length - 1]
              ? `${formatQuantity(tick, language, Number.isInteger(tick) ? 0 : 1)} GW`
              : formatQuantity(tick, language, Number.isInteger(tick) ? 0 : 1)}
          </text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map((hour) => (
        <text key={hour} x={xOf(hour)} y={height - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
          {String(hour).padStart(2, "0")}
        </text>
      ))}
      {runs.map((run) => {
        const hatch = band(run, (point) => Math.min(0, point.residualMw), (point) => Math.min(0, -point.chargeMw));
        const stored = band(run, () => 0, (point) => -point.chargeMw);
        const shaved = band(run, (point) => point.residualMw, (point) => point.residualMw - point.dischargeMw);
        return (
          <g key={run[0]?.hour ?? 0}>
            {hatch ? <polygon points={hatch} fill={`url(#${hatchId})`} /> : null}
            {stored ? <polygon points={stored} fill="hsl(var(--c-bess) / 0.85)" /> : null}
            {shaved ? <polygon points={shaved} fill="hsl(var(--c-bess) / 0.85)" /> : null}
          </g>
        );
      })}
      {line ? <polyline points={line} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" /> : null}
      {before !== null && after !== null ? (
        <>
          <line x1={xOf(eveningStart)} x2={xOf(eveningEnd)} y1={before} y2={before} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 4" strokeWidth="1.5" />
          <line x1={xOf(eveningStart)} x2={xOf(eveningEnd)} y1={after} y2={after} stroke="hsl(var(--foreground))" strokeWidth="2" />
          <text
            x={xOf(eveningEnd) - 6}
            y={Math.min(Math.max((before + after) / 2, pad.t + 14), height - pad.b - 8)}
            textAnchor="end"
            fill="hsl(var(--foreground))"
            fontSize="12"
            fontFamily="var(--font-plex-mono), ui-monospace, monospace"
          >
            {language === "de" ? step.peakLabel.de : step.peakLabel.en}
          </text>
        </>
      ) : null}
      {storedAnchor && storedAnchor.chargeMw > 0 && storedHeight > 16 ? (
        <text x={xOf(storedAnchor.hour)} y={storedY + 4} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="12" fontFamily="var(--font-plex-sans), sans-serif">
          {language === "de" ? "gespeichert" : "stored"}
        </text>
      ) : null}
      {hatchAnchor && showHatch && width >= 640 ? (
        <text
          x={xOf(hatchAnchor.hour)}
          y={hatchY + 4}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="12"
          fontFamily="var(--font-plex-sans), sans-serif"
        >
          {language === "de" ? "nicht gespeichert" : "not stored"}
        </text>
      ) : null}
      {lineLabel ? (
        <text
          x={xOf(lineLabel.hour) + 8}
          y={lineLabel.residualMw < 0 ? yOfMw(0) - 14 : yOfMw(lineLabel.residualMw) - 8}
          textAnchor="start"
          fill="hsl(var(--foreground))"
          fontSize="12"
          fontFamily="var(--font-plex-sans), sans-serif"
        >
          {language === "de" ? "Residuallast" : "Residual load"}
        </text>
      ) : null}
      {now !== null ? (
        <g className="jetzt-in">
          <line x1={xOf(now)} x2={xOf(now)} y1={pad.t} y2={height - pad.b} stroke="hsl(var(--foreground))" strokeWidth="1" />
          <rect x={xOf(now) - 22} y={pad.t} width="44" height="16" fill="hsl(var(--foreground))" />
          <text x={xOf(now)} y={pad.t + 12} textAnchor="middle" fill="hsl(var(--background))" fontSize="10" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            JETZT
          </text>
        </g>
      ) : null}
    </>
  );
}

function splitRuns(points: MoreStoragePoint[]): MoreStoragePoint[][] {
  const runs: MoreStoragePoint[][] = [];
  for (const point of points) {
    const previous = runs[runs.length - 1]?.at(-1);
    if (!previous || point.hour - previous.hour > 0.5) {
      runs.push([point]);
    } else {
      runs[runs.length - 1].push(point);
    }
  }
  return runs;
}
