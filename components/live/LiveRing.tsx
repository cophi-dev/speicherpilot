"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ChargedLine } from "@/components/day-ring/ChargedLine";
import { DayRing, DayValuesTable, type RingCallout } from "@/components/day-ring/DayRing";
import { EnergyScaleLegend } from "@/components/day-ring/EnergyScaleLegend";
import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { LineDayChart } from "@/components/day-ring/LineDayChart";
import { StatTrio } from "@/components/day-ring/StatTrio";
import { ViewToggle } from "@/components/day-ring/ViewToggle";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  calloutAnchors,
  chargedWouldHaveParts,
  fleetSizeLabel,
  formatBerlinDayLabel,
  formatGw1,
  formatSignedGw,
  fullSurplusFactor,
  onceRoundDeltaGw,
  parseRingView,
  saturationNote,
  sliderValueText,
  surplusHours,
  weekdayShort,
} from "@/lib/dayRingStory";
import {
  buildLiveDispatchStory,
  LIVE_DISPATCH_FACTORS,
  parseLiveFactor,
  type LiveDispatchFactor,
  type LiveDispatchInput,
  type LiveDispatchPoint,
  type LiveDispatchStory,
} from "@/lib/liveFleetDispatch";

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

function lerpPoints(from: LiveDispatchPoint[], to: LiveDispatchPoint[], elapsedMs: number): LiveDispatchPoint[] {
  const t = Math.min(1, elapsedMs / 600);
  return to.map((point, index) => {
    const prev = from[index] ?? point;
    const local = point.hour < 17 ? Math.min(1, t / (2 / 3)) : Math.min(1, Math.max(0, (t - 1 / 3) / (2 / 3)));
    const mix = (start: number, end: number) => start + (end - start) * local;
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

export function LiveRing({ dispatch }: { dispatch: LiveDispatchInput }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const factor = parseLiveFactor(searchParams.get("x"));
  const view = parseRingView(searchParams.get("ansicht"));
  const reduced = usePrefersReducedMotion();

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
    if (!story) {
      return;
    }
    const from = shownRef.current;
    if (reduced || from.length !== story.points.length || from === story.points) {
      setShown(story.points);
      return;
    }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const elapsed = now - started;
      setShown(lerpPoints(from, story.points, elapsed));
      if (elapsed < 600) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [story, reduced]);

  function replaceQuery(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `/live?${query}` : "/live", { scroll: false });
  }

  const saturated = stories ? fullSurplusFactor(stories) : null;
  const saturationIndex = saturated ? LIVE_DISPATCH_FACTORS.indexOf(saturated) : null;

  return (
    <section className="day-hero" aria-labelledby="live-what-if">
      <div className="day-hero-inner">
        {story && stories && dispatch.fleet ? (
          <LiveRingBody
            story={story}
            stories={stories}
            shown={shown.length === story.points.length ? shown : story.points}
            fleet={dispatch.fleet}
            factor={factor}
            view={view}
            language={language}
            saturationIndex={saturationIndex}
            saturated={saturated}
            onFactor={(next) => replaceQuery("x", String(next))}
            onView={(next) => replaceQuery("ansicht", next === "uhr" ? null : next)}
          />
        ) : (
          <div>
            <p className="day-kicker">{tx("Live · Was wäre wenn", "Live · What if")}</p>
            <h1 id="live-what-if" className="day-title">
              {dispatch.fleet
                ? tx(
                    "In den geladenen Tagen liegt keine Residuallast mit mindestens vier Viertelstunden vor. Ohne diese Reihe gibt es keine Abendspitze.",
                    "The loaded days have no residual-load series with at least four quarter-hours. Without that series there is no evening peak."
                  )
                : tx(
                    "Die Großspeicher-Flotte von battery-charts.de ist gerade nicht geladen. Ohne diese Zahl gibt es kein ×1.",
                    "The large-storage fleet from battery-charts.de is not loaded. Without that figure there is no ×1."
                  )}
            </h1>
          </div>
        )}
      </div>
    </section>
  );
}

function LiveRingBody({
  story,
  stories,
  shown,
  fleet,
  factor,
  view,
  language,
  saturationIndex,
  saturated,
  onFactor,
  onView,
}: {
  story: LiveDispatchStory;
  stories: Record<LiveDispatchFactor, LiveDispatchStory>;
  shown: LiveDispatchPoint[];
  fleet: NonNullable<LiveDispatchInput["fleet"]>;
  factor: LiveDispatchFactor;
  view: "uhr" | "linie";
  language: AppLanguage;
  saturationIndex: number | null;
  saturated: LiveDispatchFactor | null;
  onFactor: (factor: LiveDispatchFactor) => void;
  onView: (view: "uhr" | "linie") => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const title = tx(
    "Schieb den Regler und sieh, wie Speicher den Tag runder machen.",
    "Move the slider and see how storage rounds the day."
  );
  const before = story.eveningPeakBeforeGw;
  const after = story.eveningPeakAfterGw;
  const charged = chargedWouldHaveParts(story.chargedGwh, factor, language);
  const hours = surplusHours(story);
  const hourLabel = formatQuantity(hours, language, Number.isInteger(hours) ? 0 : 1);
  const delta = before !== null && after !== null ? -onceRoundDeltaGw(before, after) : null;
  const dateLabel = formatBerlinDayLabel(story.dateBerlin);
  const kicker = `${tx("Live · Was wäre wenn", "Live · What if")} · ${weekdayShort(story.dateBerlin, language)} ${dateLabel}`;
  const callouts = buildCallouts(story, story.points, language);
  const description = tx(
    `Residuallast am ${dateLabel}, Viertelstunde für Viertelstunde. Der Radius wächst linear mit der Leistung in GW. Der gestrichelte Kreis ist null. Dieselbe Reihe steht in der Tabelle.`,
    `Residual load on ${dateLabel}, quarter-hour by quarter-hour. Radius grows linearly with power in GW. The dashed circle is zero. The same series is in the table.`
  );
  const fleetName = fleet.source === "battery-charts" ? "battery-charts.de" : "Energy-Charts";
  const stand = language === "de" ? fleet.updatedLabel.de : fleet.updatedLabel.en;
  const showSaturation = saturated !== null && LIVE_DISPATCH_FACTORS.indexOf(factor) >= LIVE_DISPATCH_FACTORS.indexOf(saturated);

  return (
    <>
      <div className="day-hero-layout">
        <p className="day-kicker day-order-kicker">{kicker}</p>
        <h1 id="live-what-if" className="day-title day-order-title">
          {title}
        </h1>
        <div className="day-order-slider">
          <FactorSlider
            factor={factor}
            valueText={sliderValueText(factor, after, language)}
            label={tx("Speicherfaktor", "Storage factor")}
            saturationIndex={saturationIndex}
            onChange={onFactor}
          />
          {showSaturation && saturated ? <p className="day-sat">{saturationNote(saturated, language)}</p> : null}
          {charged ? <ChargedLine parts={charged} modelLabel={tx("Modell", "Model")} /> : null}
        </div>
        <div className="day-order-ring">
          <figure>
            {view === "uhr" ? (
              <DayRing
                points={story.points}
                label={title}
                description={description}
                callouts={callouts}
                chargedGwh={story.chargedGwh}
                center={
                  before !== null && after !== null ? (
                    <>
                      <p className="day-center-figure num">
                        {formatGw1(before, language)} → {formatGw1(after, language)}
                      </p>
                      <p className="day-center-caption">
                        GW {tx("Abendspitze", "evening peak")} · ×{factor}
                      </p>
                    </>
                  ) : (
                    <p className="day-center-caption">{tx("Keine Abendspitze in dieser Reihe", "No evening peak in this series")}</p>
                  )
                }
              />
            ) : (
              <div className="day-line-card">
                <LineDayChart
                  points={shown}
                  label={description}
                  ohneLabel={tx("ohne Speicher", "without storage")}
                  mitLabel={tx("mit Speicher", "with storage")}
                />
              </div>
            )}
            <figcaption className="day-sr">{description}</figcaption>
            <DayValuesTable
              points={story.points}
              caption={description}
              timeLabel={tx("Zeit", "Time")}
              ohneLabel={tx("Residuallast GW", "Residual load GW")}
              mitLabel={tx("mit Speicher GW", "with storage GW")}
              chargeLabel={tx("Laden MW", "Charge MW")}
              dischargeLabel={tx("Abgabe MW", "Discharge MW")}
              socLabel={tx("Ladezustand %", "State of charge %")}
            />
          </figure>
          {view === "uhr" ? (
            <ol className="day-callout-list">
              {callouts.map((callout) => (
                <li key={callout.id}>
                  <span className="num">{callout.n}</span>
                  {callout.text}
                </li>
              ))}
            </ol>
          ) : null}
          <ViewToggle
            view={view}
            onChange={onView}
            uhrLabel={tx("Uhr", "Clock")}
            linieLabel={tx("Linie", "Line")}
            groupLabel={tx("Ansicht", "View")}
          />
        </div>
          <div className="day-order-legend">
            <EnergyScaleLegend
              language={language}
              residualLabel={tx("Residuallast, GW", "Residual load, GW")}
              zeroLabel={tx("gestrichelter Kreis = 0", "dashed circle = 0")}
              chargedLabel={tx("geladen", "charged")}
              dischargedLabel={tx("abends abgegeben", "discharged in the evening")}
            />
          </div>
        <div className="day-order-controls">
          <StatTrio
            items={[
              { value: hourLabel, unit: "h", label: tx("Überschuss vor 17 Uhr", "Surplus before 17:00") },
              {
                value: fleetSizeLabel(factor, story.powerMw, story.energyMwh, language),
                label: tx("Flotte", "Fleet"),
                compact: true,
              },
              {
                value: delta === null ? "—" : formatSignedGw(delta, language),
                unit: delta === null ? undefined : "GW",
                label: tx("Abendspitze", "Evening peak"),
              },
            ]}
          />
          <ul className="day-peaks" aria-label={tx("Abendspitze in GW", "Evening peak in GW")}>
            {LIVE_DISPATCH_FACTORS.map((step) => {
              const peak = stories[step].eveningPeakAfterGw;
              return (
                <li key={step}>
                  <button type="button" aria-pressed={step === factor} onClick={() => onFactor(step)}>
                    <span>×{step}</span>
                    <span className="num">{peak === null ? "—" : formatGw1(peak, language)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="day-source">
            <GlossaryTip id="grossspeicher" language={language} />
            <span>
              {tx("Großspeicher", "Large storage")} (
              <a href={fleet.href}>{fleetName}</a>
              {tx(`, Stand ${stand}`, `, as of ${stand}`)})
            </span>
          </p>
          <p className="day-source">
            {formatQuantity(fleet.powerGw, language, 2)} GW · {formatQuantity(fleet.energyGwh, language, 2)} GWh
            {fleet.source === "energy-charts"
              ? tx(". Battery Charts ist gerade nicht geladen.", ". Battery Charts did not load.")
              : null}
          </p>
        </div>
      </div>
      <div className="day-methods">
        <section>
          <h2>{tx("So rechnet das Modell", "How the model counts")}</h2>
          <p>
            {tx(
              "Speicher starten leer, laden nur, wenn Wind und Sonne mehr liefern als gebraucht wird, und geben ab 17 Uhr so ab, dass die höchste Stunde möglichst tief fällt.",
              "Storage starts empty, charges only when wind and solar deliver more than is used, and from 17:00 gives power back so the highest hour falls as far as it can."
            )}
          </p>
        </section>
        <section>
          <h2>{tx("Was es nicht ist", "What it is not")}</h2>
          <p>
            {tx(
              "Keine Prognose und kein Fahrplan echter Anlagen. Ein Gedankenexperiment mit echten Daten eines Tages.",
              "Not a forecast and not a schedule for real plants. A thought experiment with one day’s real data."
            )}
          </p>
        </section>
        <section>
          <h2>
            {tx("Großspeicher heute", "Large storage today")}
            <GlossaryTip id="ladezustand" language={language} />
          </h2>
          <p>
            {formatQuantity(fleet.powerGw, language, 2)} GW · {formatQuantity(fleet.energyGwh, language, 2)} GWh
            {tx(`. Stand ${stand}. Der innere Ring ist der Ladezustand im Modell, keine Messung.`, `. As of ${stand}. The inner ring is the state of charge in the model, not a measurement.`)}
          </p>
        </section>
      </div>
    </>
  );
}

function buildCallouts(story: LiveDispatchStory, points: LiveDispatchPoint[], language: AppLanguage): RingCallout[] {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return calloutAnchors(points).map((anchor, index) => {
    const gw = anchor.point.ohneMw / 1000;
    const shown = formatGw1(gw, language);
    let text = tx(`Residuallast ${shown} GW.`, `Residual load ${shown} GW.`);
    if (anchor.id === "night") {
      text = tx(`Nachts liegt die Last bei ${shown} GW.`, `At night the load sits at ${shown} GW.`);
    } else if (anchor.id === "midday") {
      text = tx(`Mittag, Überschuss ${formatGw1(Math.abs(gw), language)} GW.`, `Midday, surplus ${formatGw1(Math.abs(gw), language)} GW.`);
    } else if (anchor.id === "evening" && story.eveningPeakAfterGw !== null) {
      text = tx(
        `Abendspitze ${formatGw1(story.eveningPeakBeforeGw ?? gw, language)} → ${formatGw1(story.eveningPeakAfterGw, language)} GW.`,
        `Evening peak ${formatGw1(story.eveningPeakBeforeGw ?? gw, language)} → ${formatGw1(story.eveningPeakAfterGw, language)} GW.`
      );
    }
    return { ...anchor, n: index + 1, text };
  });
}
