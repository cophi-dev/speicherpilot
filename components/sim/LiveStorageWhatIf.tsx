"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useLanguage, type AppLanguage } from "@/components/language-context";
import { DispatchDayChart, niceChartScale, SimLegend, type ChartAnnotation, type ChartSample } from "@/components/sim/DispatchDayChart";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  buildLiveDispatchStory,
  LIVE_DISPATCH_FACTORS,
  LIVE_DISPATCH_RTE,
  parseLiveFactor,
  roundPeakDeltaGw,
  type LiveDispatchFactor,
  type LiveDispatchInput,
  type LiveDispatchPoint,
  type LiveDispatchStory,
} from "@/lib/liveFleetDispatch";

const STOPS: Array<{ factor: LiveDispatchFactor; pos: number }> = [
  { factor: 1, pos: 0 },
  { factor: 2, pos: 1 },
  { factor: 5, pos: 4 },
  { factor: 10, pos: 9 },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function shortDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}.${month}.${year}` : iso;
}

function toSamples(points: LiveDispatchPoint[]): ChartSample[] {
  return points.map((point) => ({
    hour: point.hour,
    ohne: point.ohneMw / 1000,
    mit: point.mitMw / 1000,
    charge: point.chargeMw / 1000,
    discharge: point.dischargeMw / 1000,
    soc: point.soc,
  }));
}

function formatGw(value: number, language: AppLanguage) {
  const shown = Math.round(value * 10) / 10;
  return formatQuantity(shown, language, Number.isInteger(shown) ? 0 : 1);
}

function formatGwh(value: number, language: AppLanguage) {
  const digits = Math.abs(value) >= 1 ? 1 : 2;
  return formatQuantity(value, language, digits);
}

/** Smallest multiple after which a larger fleet takes in no more surplus. */
function saturationFactor(stories: Record<LiveDispatchFactor, LiveDispatchStory>): LiveDispatchFactor | null {
  const factors = LIVE_DISPATCH_FACTORS;
  for (let index = 0; index < factors.length - 1; index += 1) {
    const charged = stories[factors[index]].chargedGwh;
    const capped = factors.slice(index + 1).every((step) => stories[step].chargedGwh <= charged + 0.05);
    if (capped && charged > 0.05) {
      return factors[index];
    }
  }
  return null;
}

function lerpPoints(from: LiveDispatchPoint[], to: LiveDispatchPoint[], amount: number): LiveDispatchPoint[] {
  return to.map((point, index) => {
    const prev = from[index] ?? point;
    const mix = (start: number, end: number) => start + (end - start) * amount;
    return {
      hour: point.hour,
      ohneMw: point.ohneMw,
      mitMw: mix(prev.mitMw, point.mitMw),
      chargeMw: mix(prev.chargeMw, point.chargeMw),
      dischargeMw: mix(prev.dischargeMw, point.dischargeMw),
      soc: mix(prev.soc, point.soc),
    };
  });
}

export function LiveStorageWhatIf({ dispatch }: { dispatch: LiveDispatchInput }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const factor = parseLiveFactor(searchParams.get("x"));
  const sliderId = useId();
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [intro, setIntro] = useState(false);
  const played = useRef(false);

  const stories = useMemo(() => {
    if (!dispatch.day || !dispatch.fleet) {
      return null;
    }
    const built = {} as Record<LiveDispatchFactor, LiveDispatchStory>;
    for (const step of LIVE_DISPATCH_FACTORS) {
      built[step] = buildLiveDispatchStory({
        day: dispatch.day,
        fallback: dispatch.fallback,
        powerMw: dispatch.fleet.powerMw,
        energyMwh: dispatch.fleet.energyMwh,
        factor: step,
      });
    }
    return built;
  }, [dispatch.day, dispatch.fallback, dispatch.fleet]);

  const story = stories?.[factor] ?? null;
  const [shown, setShown] = useState<LiveDispatchPoint[]>(() => story?.points ?? []);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || played.current) {
        return;
      }
      played.current = true;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIntro(true);
      }
      observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!intro) {
      return;
    }
    const handle = window.setTimeout(() => setIntro(false), 1800);
    return () => window.clearTimeout(handle);
  }, [intro]);

  useEffect(() => {
    if (!story) {
      return;
    }
    const from = shownRef.current;
    if (from === story.points || reduced || from.length !== story.points.length) {
      setShown(story.points);
      return;
    }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const amount = Math.min(1, (now - started) / 150);
      setShown(lerpPoints(from, story.points, amount));
      if (amount < 1) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [story, reduced]);

  const scale = useMemo(() => {
    if (!stories) {
      return null;
    }
    const values: number[] = [0];
    for (const entry of Object.values(stories)) {
      for (const point of entry.points) {
        values.push(point.ohneMw / 1000, point.mitMw / 1000, point.dischargeMw / 1000, -point.chargeMw / 1000);
      }
    }
    return niceChartScale(values);
  }, [stories]);

  function choose(next: LiveDispatchFactor) {
    setIntro(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("x", String(next));
    router.replace(`/live?${params.toString()}`, { scroll: false });
  }

  const stop = STOPS.find((item) => item.factor === factor) ?? STOPS[2];
  const saturated = stories ? saturationFactor(stories) : null;
  const samples = toSamples(shown.length > 0 ? shown : story?.points ?? []);

  return (
    <section ref={sectionRef} aria-labelledby="live-what-if">
      <p className="sim-kicker">{tx("Live · Was wäre wenn", "Live · What if")}</p>
      <h1 id="live-what-if" className="sim-h1">
        {tx("Was wäre, wenn Deutschland mehr Speicher hätte?", "What if Germany had more storage?")}
      </h1>
      <p className="sim-lead">
        {tx(
          "Ein Tag im deutschen Stromnetz, Viertelstunde für Viertelstunde. Speicher laden, wenn Sonne und Wind mehr liefern als gebraucht wird, und geben den Strom am Abend zurück.",
          "One day on the German grid, quarter-hour by quarter-hour. Storage charges when solar and wind deliver more than is used, and returns that electricity in the evening."
        )}
      </p>
      <div className="sim-card">
        {story && scale && dispatch.fleet ? (
          <LiveChart
            story={story}
            samples={samples}
            scale={scale}
            factor={factor}
            fleet={dispatch.fleet}
            fallback={dispatch.fallback}
            intro={intro}
            stop={stop}
            saturation={saturated}
            saturationChargedGwh={saturated && stories ? stories[saturated].chargedGwh : null}
            sliderId={sliderId}
            language={language}
            onChoose={choose}
          />
        ) : (
          <p>
            {dispatch.fleet
              ? tx(
                  "In den geladenen Tagen liegt keine Residuallast mit mindestens vier Viertelstunden vor. Ohne diese Reihe gibt es keine Abendspitze.",
                  "The loaded days have no residual-load series with at least four quarter-hours. Without that series there is no evening peak."
                )
              : tx(
                  "Die Großspeicher-Flotte von battery-charts.de ist gerade nicht geladen. Ohne diese Zahl gibt es kein ×1.",
                  "The large-storage fleet from battery-charts.de is not loaded. Without that figure there is no ×1."
                )}
          </p>
        )}
      </div>
    </section>
  );
}

function LiveChart({
  story,
  samples,
  scale,
  factor,
  fleet,
  fallback,
  intro,
  stop,
  saturation,
  saturationChargedGwh,
  sliderId,
  language,
  onChoose,
}: {
  story: LiveDispatchStory;
  samples: ChartSample[];
  scale: { y0: number; y1: number; yTicks: number[] };
  factor: LiveDispatchFactor;
  fleet: NonNullable<LiveDispatchInput["fleet"]>;
  fallback: boolean;
  intro: boolean;
  stop: { factor: LiveDispatchFactor; pos: number };
  saturation: LiveDispatchFactor | null;
  saturationChargedGwh: number | null;
  sliderId: string;
  language: AppLanguage;
  onChoose: (next: LiveDispatchFactor) => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const before = story.eveningPeakBeforeGw;
  const after = story.eveningPeakAfterGw;
  const evening = story.eveningPublished && before != null && after != null;
  const beforeShown = before == null ? null : Math.round(before * 10) / 10;
  const afterShown = after == null ? null : Math.round(after * 10) / 10;
  const beforeLabel = beforeShown == null ? "" : formatGw(beforeShown, language);
  const afterLabel = afterShown == null ? "" : formatGw(afterShown, language);
  const discharged = `${formatGwh(story.dischargedGwh, language)} GWh ${tx("entladen", "discharged")}`;
  const charged = `${formatGwh(story.chargedGwh, language)} GWh ${tx("geladen", "charged")}`;
  const endPct = story.energyMwh > 0 ? (story.endSocGwh / (story.energyMwh / 1000)) * 100 : 0;
  const chargedNote = tx(
    `Geladen ${formatGwh(story.chargedGwh, language)} GWh vor 17 Uhr. Abgegeben ${formatGwh(story.dischargedGwh, language)} GWh. Am Tagesende bleiben ${formatGwh(story.endSocGwh, language)} GWh im Speicher (${formatQuantity(endPct, language, 0)} %). Abgegeben = (geladen − Rest) × ${formatQuantity(LIVE_DISPATCH_RTE * 100, language, 0)} %.`,
    `Charged ${formatGwh(story.chargedGwh, language)} GWh before 17:00. Discharged ${formatGwh(story.dischargedGwh, language)} GWh. ${formatGwh(story.endSocGwh, language)} GWh remain in storage at the end of the day (${formatQuantity(endPct, language, 0)}%). Discharged = (charged − remainder) × ${formatQuantity(LIVE_DISPATCH_RTE * 100, language, 0)}%.`
  );
  const satStop = STOPS.find((item) => item.factor === saturation);
  const satPct = satStop ? (satStop.pos / 9) * 100 : 100;
  const satNote =
    saturation != null && saturationChargedGwh != null
      ? tx(
          `ab ×${saturation} kein zusätzlicher Überschuss (${formatGwh(saturationChargedGwh, language)} GWh aufgenommen)`,
          `from ×${saturation} no further surplus (${formatGwh(saturationChargedGwh, language)} GWh taken in)`
        )
      : null;
  const deltaValue = evening && before != null && after != null ? roundPeakDeltaGw(before, after) : 0;
  const deltaSign = deltaValue > 0 ? "−" : deltaValue < 0 ? "+" : "";
  const fleetHrefLabel = fleet.source === "battery-charts" ? "battery-charts.de" : "Energy-Charts";

  return (
    <>
      <div className="sim-cardhead">
        <p className="sim-kicker">
          {tx("Residuallast", "Residual load")} · ¼h · {shortDate(story.dateBerlin)}
          {fallback ? <span className="sim-chip sim-chip-gap">{tx("Letzter Überschusstag", "Last surplus day")}</span> : null}
        </p>
        <span className="sim-chip">MODELL</span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">
        {tx("Was in die Speicher geht, kappt abends die Spitze", "What goes into storage cuts the evening peak")}
      </h2>
      <SimLegend
        items={[
          { swatch: "ohne", label: tx("ohne Speicher", "without storage") },
          { swatch: "mit", label: tx("mit Speicher", "with storage") },
          { swatch: "charge", label: tx("lädt", "charging") },
          { swatch: "discharge", label: tx("entlädt", "discharging") },
          { swatch: "hatch", label: tx("verschobene Energie", "shifted energy") },
        ]}
      />
      <DispatchDayChart
        samples={samples}
        unit="GW"
        y0={scale.y0}
        y1={scale.y1}
        yTicks={scale.yTicks}
        hatch="graphite"
        tipLoad={tx("Residuallast", "Residual load")}
        ariaLabel={
          evening
            ? tx(
                `Residuallast am ${shortDate(story.dateBerlin)} mit und ohne Speicher. Abendspitze ${beforeLabel} auf ${afterLabel} GW. Abgegeben ${formatGwh(story.dischargedGwh, language)} GWh. Modellschätzung.`,
                `Residual load on ${shortDate(story.dateBerlin)} with and without storage. Evening peak ${beforeLabel} to ${afterLabel} GW. Discharged ${formatGwh(story.dischargedGwh, language)} GWh. Model estimate.`
              )
            : tx(
                `Residuallast am ${shortDate(story.dateBerlin)}. Die Stunden ab 17 Uhr sind in dieser Reihe noch nicht veröffentlicht. Modellschätzung.`,
                `Residual load on ${shortDate(story.dateBerlin)}. The hours from 17:00 are not in this series yet. Model estimate.`
              )
        }
        tag="MODELL"
        annotations={liveNotes(samples, factor, discharged, charged, language)}
        chargedNote={chargedNote}
        intro={intro}
        language={language}
        fitLabels
      />
      <div className="sim-ctl">
        <div>
          <label htmlFor={sliderId} className="sim-kicker">
            {tx("Speicher im Netz · Vielfaches von heute", "Storage on the grid · multiple of today")}
          </label>
          <div className="sim-sl" style={{ "--p": String((stop.pos / 9) * 100), "--sat": String(satPct) } as CSSProperties}>
            <div className="sim-bub num" aria-hidden="true">
              ×{factor}
            </div>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={9}
              step={1}
              value={stop.pos}
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={factor}
              aria-valuetext={`×${factor}`}
              onChange={(event) => {
                const raw = Number(event.target.value);
                const next = STOPS.reduce((best, item) => (Math.abs(item.pos - raw) < Math.abs(best.pos - raw) ? item : best));
                if (next.factor !== factor) {
                  onChoose(next.factor);
                }
              }}
              onKeyDown={(event) => {
                const order = STOPS.findIndex((item) => item.factor === factor);
                const forward = event.key === "ArrowRight" || event.key === "ArrowUp";
                const back = event.key === "ArrowLeft" || event.key === "ArrowDown";
                if (!forward && !back && event.key !== "Home" && event.key !== "End") {
                  return;
                }
                event.preventDefault();
                const next = event.key === "Home" ? STOPS[0] : event.key === "End" ? STOPS[STOPS.length - 1] : STOPS[order + (forward ? 1 : -1)];
                if (next && next.factor !== factor) {
                  onChoose(next.factor);
                }
              }}
            />
          </div>
          <div className="sim-ticks num" aria-hidden="true">
            {STOPS.map((item) => (
              <span key={item.factor} style={{ left: `${(item.pos / 9) * 100}%` }}>
                ×{item.factor}
              </span>
            ))}
          </div>
          <p className="sim-hint">
            {fleet.source === "battery-charts"
              ? tx("×1 = heutige Großspeicher-Flotte (", "×1 = today's large-storage fleet (")
              : tx("×1 nutzt den Bestand von ", "×1 uses the stock from ")}
            <a href={fleet.href}>{fleetHrefLabel}</a>
            {fleet.source === "battery-charts"
              ? tx(
                  `, Stand ${fleet.updatedLabel.de}, ${formatQuantity(fleet.powerGw, language, 2)} GW und ${formatQuantity(fleet.energyGwh, language, 2)} GWh).`,
                  `, as of ${fleet.updatedLabel.en}, ${formatQuantity(fleet.powerGw, language, 2)} GW and ${formatQuantity(fleet.energyGwh, language, 2)} GWh).`
                )
              : tx(
                  `, weil battery-charts.de gerade nicht geladen ist (Stand ${fleet.updatedLabel.de}, ${formatQuantity(fleet.powerGw, language, 2)} GW und ${formatQuantity(fleet.energyGwh, language, 2)} GWh).`,
                  `, because battery-charts.de did not load (as of ${fleet.updatedLabel.en}, ${formatQuantity(fleet.powerGw, language, 2)} GW and ${formatQuantity(fleet.energyGwh, language, 2)} GWh).`
                )}
          </p>
        </div>
        <div className="sim-ctl-result" aria-live="polite">
          {evening ? (
            <>
              <p className="sim-hero num">
                {beforeLabel} → {afterLabel} GW
              </p>
              {satNote ? <p className="sim-sat num">{satNote}</p> : null}
              <p className="sim-delta num">
                {deltaSign}
                {formatQuantity(Math.abs(deltaValue), language, Number.isInteger(deltaValue) ? 0 : 1)} GW {tx("Abendspitze", "evening peak")}
              </p>
              <p className="sim-sentence">
                {deltaValue >= 0
                  ? tx(
                      `Mit ×${factor} Speicher sinkt die Abendspitze von ${beforeLabel} auf ${afterLabel} GW. Abgegeben werden ${formatGwh(story.dischargedGwh, language)} GWh. Modellschätzung, kein Messwert.`,
                      `With ×${factor} storage the evening peak falls from ${beforeLabel} to ${afterLabel} GW. ${formatGwh(story.dischargedGwh, language)} GWh are discharged. A model estimate, not a measurement.`
                    )
                  : tx(
                      `Mit ×${factor} Speicher liegt die Abendspitze bei ${afterLabel} GW, ohne Speicher bei ${beforeLabel} GW. Abgegeben werden ${formatGwh(story.dischargedGwh, language)} GWh. Modellschätzung, kein Messwert.`,
                      `With ×${factor} storage the evening peak is ${afterLabel} GW, and ${beforeLabel} GW without storage. ${formatGwh(story.dischargedGwh, language)} GWh are discharged. A model estimate, not a measurement.`
                    )}
              </p>
            </>
          ) : (
            <p className="sim-sentence">
              {tx(
                "Die Stunden ab 17 Uhr sind in dieser Reihe noch nicht veröffentlicht. Die Grafik zeigt nur die Stunden, die Energy-Charts schon gemeldet hat.",
                "The hours from 17:00 are not in this series yet. The chart shows only the hours Energy-Charts has already published."
              )}
            </p>
          )}
        </div>
      </div>
      <p className="sim-src">
        <span className="sim-chip">MODELL</span>{" "}
        {tx(
          `Modellschätzung. Kupferplatte: alle Speicher wirken als ein Block, keine Netzengpässe. Wirkungsgrad ${formatQuantity(LIVE_DISPATCH_RTE * 100, language, 0)} % (Annahme). Quelle: Energy-Charts, Residuallast. Keine Euro-Werte.`,
          `Model estimate. Copper plate: every battery acts as one block, no grid bottlenecks. Round-trip efficiency ${formatQuantity(LIVE_DISPATCH_RTE * 100, language, 0)}% (assumption). Source: Energy-Charts, residual load. No euro figures.`
        )}{" "}
        <a href="/methodik#live">{tx("Formeln", "Formulas")}</a>
      </p>
    </>
  );
}

function liveNotes(samples: ChartSample[], factor: number, discharged: string, charged: string, language: AppLanguage): ChartAnnotation[] {
  const notes: ChartAnnotation[] = [];
  let peak = -1;
  let peakValue = Number.NEGATIVE_INFINITY;
  samples.forEach((sample, index) => {
    if (sample.hour >= 17 && sample.ohne > peakValue) {
      peakValue = sample.ohne;
      peak = index;
    }
  });
  let mitPeak = -1;
  let mitValue = Number.NEGATIVE_INFINITY;
  samples.forEach((sample, index) => {
    if (sample.hour >= 17 && sample.mit > mitValue) {
      mitValue = sample.mit;
      mitPeak = index;
    }
  });
  if (peak >= 0) {
    const sample = samples[peak];
    notes.push({
      hour: sample.hour + 0.125,
      value: sample.ohne,
      text: `${formatGw(sample.ohne, language)} GW ${language === "de" ? "ohne Speicher" : "without storage"}`,
      anchor: "middle",
      dy: -8,
      mdx: -16,
      mdy: -10,
    });
  }
  if (mitPeak >= 0) {
    const sample = samples[mitPeak];
    notes.push({
      hour: sample.hour + 0.125,
      value: sample.mit,
      text: `${formatGw(sample.mit, language)} GW ${language === "de" ? "mit" : "with"} ×${factor}`,
      anchor: "middle",
      dy: -8,
      mdx: 18,
      mdy: -10,
      strong: true,
    });
  }
  let lastDischarge = -1;
  let maxCharge = -1;
  let maxChargeValue = 0;
  samples.forEach((sample, index) => {
    if (sample.discharge > 0.001) {
      lastDischarge = index;
    }
    if (sample.charge > maxChargeValue) {
      maxChargeValue = sample.charge;
      maxCharge = index;
    }
  });
  if (lastDischarge >= 0) {
    notes.push({
      hour: samples[lastDischarge].hour + 0.25,
      value: samples[lastDischarge].mit,
      text: discharged,
      dx: 8,
      dy: 16,
      mdx: 12,
      mdy: 14,
      strong: true,
    });
  }
  if (maxCharge >= 0 && maxChargeValue > 0.001) {
    notes.push({
      hour: samples[maxCharge].hour + 0.125,
      value: -maxChargeValue,
      text: charged,
      anchor: "middle",
      dy: 16,
      mdy: 14,
      strong: true,
    });
  }
  return notes;
}
