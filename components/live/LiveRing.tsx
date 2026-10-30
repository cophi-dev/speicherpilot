"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { LiveStrip } from "@/components/mix/LiveStrip";
import { ChargedLine } from "@/components/day-ring/ChargedLine";
import { DayRing, DayValuesTable, HourlyResidualTable, type RingCallout } from "@/components/day-ring/DayRing";
import { MonoNumber } from "@/components/day-ring/MonoNumber";
import { EnergyScaleLegend } from "@/components/day-ring/EnergyScaleLegend";
import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { StatTrio } from "@/components/day-ring/StatTrio";
import { GlossaryTip } from "@/components/GlossaryTip";
import { DispatchDayChart, niceChartScale, SimLegend, type ChartSample } from "@/components/sim/DispatchDayChart";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  calloutAnchors,
  chargedWouldHaveParts,
  fleetSizeLabel,
  formatBerlinDayLabel,
  eveningPeakStat,
  formatGw1,
  fullSurplusFactor,
  liveClockCaption,
  ringCalloutText,
  saturationNote,
  sliderValueText,
  surplusHours,
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

export function LiveRing({
  dispatch,
  heading,
  subheading,
  isToday = false,
  stand,
  readings,
  onFactor: onFactorProp,
  factor: factorProp,
  hideHeader = false,
}: {
  dispatch: LiveDispatchInput;
  until?: string | null;
  heading?: string;
  subheading?: string | null;
  isToday?: boolean;
  stand?: string;
  readings?: import("@/lib/liveStrip").StripReading[];
  onFactor?: (factor: LiveDispatchFactor) => void;
  factor?: LiveDispatchFactor;
  hideHeader?: boolean;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFactor = parseLiveFactor(searchParams.get("x"));
  const [pendingFactor, setPendingFactor] = useState<LiveDispatchFactor | null>(null);
  if (pendingFactor !== null && pendingFactor === queryFactor) {
    setPendingFactor(null);
  }
  const factor = pendingFactor ?? factorProp ?? queryFactor;
  const [vizMode, setVizMode] = useState<"uhr" | "linie">("uhr");

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
  const fleetStand = dispatch.fleet ? (language === "de" ? dispatch.fleet.updatedLabel.de : dispatch.fleet.updatedLabel.en) : "";

  return (
    <>
    <section className={`day-hero day-hero-screen${hideHeader ? " live-day-hero" : ""}`} aria-labelledby="live-what-if">
      <div className="day-hero-inner">
        {!hideHeader && isToday && stand && readings ? <LiveStrip stand={stand} readings={readings} /> : null}
        {!hideHeader && !isToday ? (
          <p className="live-strip-hint">
            <Link href="/live">{tx("Live-Werte gelten für heute → zu heute", "Live values are for today → go to today")}</Link>
          </p>
        ) : null}
        {story && stories && dispatch.fleet ? (
          <LiveRingBody
            story={story}
            stories={stories}
            fleet={dispatch.fleet}
            factor={factor}
            language={language}
            saturationIndex={saturationIndex}
            saturated={saturated}
            onFactor={(next) => {
              setPendingFactor(next);
              window.requestAnimationFrame(() => {
                if (onFactorProp) {
                  onFactorProp(next);
                } else {
                  replaceQuery("x", String(next));
                }
              });
            }}
            heading={heading}
            subheading={subheading}
            hideHeader={hideHeader}
            vizMode={vizMode}
            onVizMode={setVizMode}
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
    {story && dispatch.fleet ? (
      <section className="day-story" aria-labelledby="live-methods">
        <div className="day-hero-inner">
          <LiveMethods language={language} stand={fleetStand} />
        </div>
      </section>
    ) : null}
    </>
  );
}

function LiveRingBody({
  story,
  stories,
  fleet,
  factor,
  language,
  saturationIndex,
  saturated,
  onFactor,
  heading,
  subheading,
  hideHeader = false,
  vizMode,
  onVizMode,
}: {
  story: LiveDispatchStory;
  stories: Record<LiveDispatchFactor, LiveDispatchStory>;
  fleet: NonNullable<LiveDispatchInput["fleet"]>;
  factor: LiveDispatchFactor;
  language: AppLanguage;
  saturationIndex: number | null;
  saturated: LiveDispatchFactor | null;
  onFactor: (factor: LiveDispatchFactor) => void;
  heading?: string;
  subheading?: string | null;
  hideHeader?: boolean;
  vizMode: "uhr" | "linie";
  onVizMode: (mode: "uhr" | "linie") => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const subtitle = tx(
    "Schieb den Regler und sieh, wie Speicher den Tag runder machen.",
    "Move the slider and see how storage rounds the day."
  );
  const before = story.eveningPeakBeforeGw;
  const after = story.eveningPeakAfterGw;
  const peak = eveningPeakStat(before, after, language);
  const charged = chargedWouldHaveParts(story.chargedGwh, factor, language);
  const hours = surplusHours(story);
  const hourLabel = formatQuantity(hours, language, Number.isInteger(hours) ? 0 : 1);
  const dateLabel = formatBerlinDayLabel(story.dateBerlin);
  const callouts = buildCallouts(story, story.points, language);
  const tablePoints = useDeferredValue(story.points);
  const caption = liveClockCaption(before, after, factor, language);
  const description = tx(
    `Residuallast am ${dateLabel}, Viertelstunde für Viertelstunde. Der Radius wächst linear mit der Leistung in GW. Der gestrichelte Kreis ist null. Dieselbe Reihe steht in der Tabelle.`,
    `Residual load on ${dateLabel}, quarter-hour by quarter-hour. Radius grows linearly with power in GW. The dashed circle is zero. The same series is in the table.`
  );
  const fleetName = fleet.source === "battery-charts" ? "battery-charts.de" : "Energy-Charts";
  const stand = language === "de" ? fleet.updatedLabel.de : fleet.updatedLabel.en;
  const showSaturation = saturated !== null && LIVE_DISPATCH_FACTORS.indexOf(factor) >= LIVE_DISPATCH_FACTORS.indexOf(saturated);
  const chartSamples: ChartSample[] = useMemo(
    () =>
      story.points.map((point) => ({
        hour: point.hour,
        ohne: point.ohneMw / 1000,
        mit: point.mitMw / 1000,
        charge: point.chargeMw / 1000,
        discharge: point.dischargeMw / 1000,
        soc: point.soc,
      })),
    [story.points]
  );
  const chartScale = useMemo(() => {
    const values = [0];
    for (const point of story.points) {
      values.push(point.ohneMw / 1000, point.mitMw / 1000, -(point.chargeMw / 1000), point.dischargeMw / 1000);
    }
    return niceChartScale(values);
  }, [story.points]);

  return (
    <>
      <div className="day-hero-layout">
        {!hideHeader ? (
          <>
            <p className="day-kicker day-order-kicker">{tx("Tag · Modell", "Day · model")}</p>
            <h1 id="live-what-if" className="day-title day-order-title">
              {heading ?? dateLabel}
            </h1>
            {subheading ? <p className="day-subtitle">{subheading}</p> : null}
            <p className="day-lead day-order-lead">{subtitle}</p>
          </>
        ) : null}
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
        {hideHeader ? <p className="day-lead day-order-lead">{subtitle}</p> : null}
        <div className="day-viz-toggle" role="radiogroup" aria-label={tx("Darstellung", "View")}>
          <button
            type="button"
            role="radio"
            aria-checked={vizMode === "uhr"}
            className={vizMode === "uhr" ? "on" : undefined}
            onClick={() => onVizMode("uhr")}
          >
            {tx("Uhr", "Clock")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={vizMode === "linie"}
            className={vizMode === "linie" ? "on" : undefined}
            onClick={() => onVizMode("linie")}
          >
            {tx("Linie", "Line")}
          </button>
        </div>
        <div className="day-order-ring">
          <figure>
            {vizMode === "uhr" ? (
              <DayRing
                points={story.points}
                label={subtitle}
                description={description}
                callouts={callouts}
                chargedGwh={story.chargedGwh}
                center={
                  before !== null && after !== null ? (
                    <>
                      <p className="day-center-figure">
                        <MonoNumber value={formatGw1(before, language)} /> → <MonoNumber value={formatGw1(after, language)} />
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
              <>
                <SimLegend
                  items={[
                    { swatch: "ohne", label: tx("ohne Speicher", "without storage") },
                    { swatch: "mit", label: tx("mit Speicher", "with storage") },
                    { swatch: "charge", label: tx("lädt", "charging") },
                    { swatch: "discharge", label: tx("gibt ab", "discharging") },
                  ]}
                />
                <DispatchDayChart
                  samples={chartSamples}
                  unit="GW"
                  y0={chartScale.y0}
                  y1={chartScale.y1}
                  yTicks={chartScale.yTicks}
                  hatch="graphite"
                  tipLoad={tx("Residuallast", "Residual load")}
                  ariaLabel={tx("Tageskurve Residuallast mit Speicher. Modellschätzung.", "Day curve residual load with storage. Model estimate.")}
                  tag={tx("MODELL", "MODEL")}
                  annotations={[]}
                  chargedNote=""
                  intro={false}
                  language={language}
                />
              </>
            )}
            <figcaption className="day-sr">{caption}</figcaption>
            {vizMode === "uhr" ? <HourlyResidualTable points={tablePoints} caption={caption} /> : null}
            <DayValuesTable
              points={tablePoints}
              caption={description}
              timeLabel={tx("Zeit", "Time")}
              ohneLabel={tx("Residuallast GW", "Residual load GW")}
              mitLabel={tx("mit Speicher GW", "with storage GW")}
              chargeLabel={tx("Laden MW", "Charge MW")}
              dischargeLabel={tx("Abgabe MW", "Discharge MW")}
              socLabel={tx("Ladezustand %", "State of charge %")}
            />
          </figure>
          <p className="day-source">
            <Link href="/#uebersicht" prefetch={false}>
              {tx("Zur Übersicht auf der Startseite", "To the overview on the homepage")}
            </Link>
          </p>
        </div>
        <div className="day-order-controls">
          <StatTrio
            items={[
              { value: `≈ ${hourLabel}`, unit: "h", label: tx("Mittagsüberschuss", "Midday surplus") },
              {
                value: peak?.value ?? "—",
                unit: peak ? "GW" : undefined,
                label: tx("Abendspitze", "Evening peak"),
                note: peak?.note,
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
                    {peak === null ? <span className="num">—</span> : <MonoNumber value={formatGw1(peak, language)} />}
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
              {tx(`, Stand ${stand}`, `, as of ${stand}`)}
              ): {fleetSizeLabel(factor, story.powerMw, story.energyMwh, language)}
              {fleet.source === "energy-charts"
                ? tx(". Battery Charts ist gerade nicht geladen.", ". Battery Charts did not load.")
                : null}
            </span>
          </p>
        </div>
        <div className="day-order-legend">
          <EnergyScaleLegend language={language} residualLabel={tx("Residuallast, GW", "Residual load, GW")} />
        </div>
      </div>
    </>
  );
}

function LiveMethods({ language, stand }: { language: AppLanguage; stand: string }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div className="day-methods">
      <section>
        <h2 id="live-methods">{tx("So rechnet das Modell", "How the model counts")}</h2>
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
          {tx(
            `Stand ${stand}. Der innere Ring ist der Ladezustand im Modell, keine Messung.`,
            `As of ${stand}. The inner ring is the state of charge in the model, not a measurement.`
          )}
        </p>
      </section>
    </div>
  );
}

function buildCallouts(story: LiveDispatchStory, points: LiveDispatchPoint[], language: AppLanguage): RingCallout[] {
  return calloutAnchors(points).map((anchor, index) => ({
    ...anchor,
    n: index + 1,
    text: ringCalloutText(
      anchor.id,
      anchor.point.ohneMw / 1000,
      language,
      {
        before: story.eveningPeakBeforeGw,
        after: story.eveningPeakAfterGw,
      },
      "GW"
    ),
  }));
}
