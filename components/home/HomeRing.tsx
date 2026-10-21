"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DayRing, DayValuesTable, type RingCallout } from "@/components/day-ring/DayRing";
import { EnergyScaleLegend } from "@/components/day-ring/EnergyScaleLegend";
import { ChargedLine } from "@/components/day-ring/ChargedLine";
import { MonoNumber } from "@/components/day-ring/MonoNumber";
import { StatTrio } from "@/components/day-ring/StatTrio";
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
  heroSentence,
  onceRoundDeltaGw,
  saturationNote,
  surplusHours,
  weekdayShort,
} from "@/lib/dayRingStory";
import {
  buildLiveDispatchStory,
  LIVE_DISPATCH_FACTORS,
  type LiveDispatchFactor,
  type LiveDispatchInput,
  type LiveDispatchStory,
} from "@/lib/liveFleetDispatch";
import { sitePath } from "@/lib/perspective";

export function HomeRing({ dispatch, todayKey }: { dispatch: LiveDispatchInput; todayKey: string }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
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

  if (!stories || !dispatch.fleet) {
    return (
      <section className="day-hero">
        <div className="day-hero-inner">
          <h1 className="day-title">
            {dispatch.fleet
              ? tx(
                  "In den geladenen Tagen liegt keine Residuallast mit mindestens vier Viertelstunden vor.",
                  "The loaded days have no residual-load series with at least four quarter-hours."
                )
              : tx(
                  "Die Großspeicher-Flotte von battery-charts.de ist gerade nicht geladen.",
                  "The large-storage fleet from battery-charts.de is not loaded."
                )}
          </h1>
        </div>
      </section>
    );
  }

  const story = stories[1];
  const sentence = heroSentence({ dateBerlin: story.dateBerlin, todayKey, surplusGwh: story.surplusGwh });
  const title = language === "de" ? sentence.de : sentence.en;
  const before = story.eveningPeakBeforeGw;
  const after = story.eveningPeakAfterGw;
  const delta = before !== null && after !== null ? -onceRoundDeltaGw(before, after) : null;
  const hours = surplusHours(story);
  const charged = chargedWouldHaveParts(story.chargedGwh, 1, language);
  const dateLabel = formatBerlinDayLabel(story.dateBerlin);
  const kicker = story.dateBerlin === todayKey
    ? tx(`Heute · Deutschland · ${dateLabel}`, `Today · Germany · ${dateLabel}`)
    : tx(`Letzter Überschusstag · Deutschland · ${weekdayShort(story.dateBerlin, language)} ${dateLabel}`, `Last surplus day · Germany · ${weekdayShort(story.dateBerlin, "en")} ${dateLabel}`);
  const description = tx(
    `Residuallast am ${dateLabel}, Viertelstunde für Viertelstunde. Der Radius wächst linear mit der Leistung in GW.`,
    `Residual load on ${dateLabel}, quarter-hour by quarter-hour. Radius grows linearly with power in GW.`
  );
  const callouts = movementCallouts(story, language);
  const saturated = fullSurplusFactor(stories);
  const fleetName = dispatch.fleet.source === "battery-charts" ? "battery-charts.de" : "Energy-Charts";
  const stand = language === "de" ? dispatch.fleet.updatedLabel.de : dispatch.fleet.updatedLabel.en;

  return (
    <>
      <section className="day-hero" aria-labelledby="home-day">
        <div className="day-hero-inner">
          <div className="day-hero-layout">
            <p className="day-kicker day-order-kicker">{kicker}</p>
            <h1 id="home-day" className="day-title day-order-title">{title}</h1>
            <div className="day-order-ring">
              <figure>
                <DayRing
                  points={story.points}
                  label={title}
                  description={description}
                  callouts={callouts}
                  chargedGwh={story.chargedGwh}
                  center={
                    before !== null && after !== null ? (
                      <>
                        <p className="day-center-figure">
                          <MonoNumber value={formatGw1(before, language)} /> → <MonoNumber value={formatGw1(after, language)} />
                        </p>
                        <p className="day-center-caption">GW {tx("Abendspitze", "evening peak")} · ×1</p>
                      </>
                    ) : null
                  }
                />
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
              <ol className="day-callout-list">
                {callouts.map((callout) => (
                  <li key={callout.id}>
                    <span className="num">{callout.n}</span>
                    {callout.text}
                  </li>
                ))}
              </ol>
            </div>
            <div className="day-order-legend">
              <EnergyScaleLegend language={language} residualLabel={tx("Residuallast, GW", "Residual load, GW")} />
            </div>
            <div className="day-order-controls">
              <StatTrio
                items={[
                  { value: `≈ ${formatQuantity(hours, language, Number.isInteger(hours) ? 0 : 1)}`, unit: "h", label: tx("Mittagsüberschuss", "Midday surplus") },
                  { value: delta === null ? "—" : formatSignedGw(delta, language), unit: delta === null ? undefined : "GW", label: tx("Abendspitze", "Evening peak") },
                ]}
              />
              {charged ? <ChargedLine parts={charged} modelLabel={tx("Modell", "Model")} /> : null}
              <div className="day-cta-row">
                <Link className="day-cta" href="/live">{tx("Mit dem Speicher spielen →", "Play with the storage →")}</Link>
                <Link className="day-textlink" href={sitePath("projekt")}>{tx("Standort rechnen", "Size a site")}</Link>
              </div>
              <p className="day-source">
                <GlossaryTip id="grossspeicher" language={language} />
                <span>
                  {tx("Großspeicher", "Large storage")} (
                  <a href={dispatch.fleet.href}>{fleetName}</a>
                  {tx(`, Stand ${stand}`, `, as of ${stand}`)}
                  ): {fleetSizeLabel(1, story.powerMw, story.energyMwh, language)}
                  {tx(
                    " Daten: Energy-Charts (Fraunhofer ISE), Last, Wind und Sonne, CC BY 4.0.",
                    " Data: Energy-Charts (Fraunhofer ISE), load, wind and solar, CC BY 4.0."
                  )}
                </span>
              </p>
            </div>
          </div>

          <Movements story={story} language={language} hours={hours} />
        </div>
      </section>

      <section className="day-paper" aria-labelledby="home-more">
        <div className="day-hero-inner">
          <h2 id="home-more">{tx("Was wäre mit mehr Großspeichern?", "What if there were more large storage?")}</h2>
          <p className="day-paper-lead">
            {tx("Dieselbe Residuallast, die Flotte mal zwei, mal fünf, mal zehn.", "The same residual load, with the fleet times two, five and ten.")}
          </p>
          <FactorMorph stories={stories} language={language} saturated={saturated} />
          <div className="day-doors">
            <Link className="day-door" href={sitePath("projekt")}>
              <span className="day-kicker">{tx("Für Projektierer", "For developers")}</span>
              <span className="day-door-title">{tx("Welche Speichergröße passt an meinen Standort?", "Which storage size fits my site?")}</span>
              <span className="day-door-go">{tx("Standort rechnen →", "Size a site →")}</span>
            </Link>
            <Link className="day-door" href={sitePath("netz")}>
              <span className="day-kicker">{tx("Für Netzbetreiber", "For grid operators")}</span>
              <span className="day-door-title">{tx("Bleibt der Anschluss unter der Grenze?", "Does the connection stay under the limit?")}</span>
              <span className="day-door-go">{tx("Anschluss prüfen →", "Check the connection →")}</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

const MOVEMENT_IDS = ["night", "midday", "evening"] as const;

function Movements({ story, language, hours }: { story: LiveDispatchStory; language: AppLanguage; hours: number }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const hoursLabel = formatQuantity(hours, language, Number.isInteger(hours) ? 0 : 1);
  const steps = [
    { id: MOVEMENT_IDS[0], n: "01", title: tx("Nacht", "Night"), body: tx("Wind allein reicht nicht. Kraftwerke und Import füllen die Lücke.", "Wind alone is not enough. Power plants and imports fill the gap.") },
    { id: MOVEMENT_IDS[1], n: "02", title: tx("Mittag", "Midday"), body: tx(`${hoursLabel} Stunden lang liefern Wind und Sonne mehr, als gebraucht wird. Speicher laden.`, `For ${hoursLabel} hours, wind and solar deliver more than is used. Storage charges.`) },
    { id: MOVEMENT_IDS[2], n: "03", title: tx("Abend", "Evening"), body: tx("Die Sonne ist weg, der Verbrauch hoch. Speicher geben ab und kappen die Spitze.", "The sun is gone and use is high. Storage gives power back and cuts the peak.") },
  ];
  const [highlight, setHighlight] = useState<(typeof steps)[number]["id"]>("night");
  const items = useRef<Array<HTMLLIElement | null>>([]);
  useEffect(() => {
    const ratios = new Map<number, number>();
    const nodes = items.current.filter((node): node is HTMLLIElement => node !== null);
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
          setHighlight(MOVEMENT_IDS[best] ?? "night");
        }
      },
      { rootMargin: "-20% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const active = steps.find((step) => step.id === highlight) ?? steps[0];
  return (
    <div className="day-movements">
      <h2>{tx("Ein Tag in drei Bewegungen", "One day in three movements")}</h2>
      <div className="day-movement-story">
        <div className="day-movement-pin">
          <DayRing
            points={story.points}
            label={active.title}
            description={active.body}
            highlight={highlight}
            showShift={false}
            showHourTicks={false}
            chargedGwh={0}
          />
        </div>
        <ol>
          {steps.map((step, index) => (
            <li
              key={step.id}
              data-step={index}
              ref={(node) => {
                items.current[index] = node;
              }}
            >
              <p className="num day-movement-n">{step.n}</p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function FactorMorph({
  stories,
  language,
  saturated,
}: {
  stories: Record<LiveDispatchFactor, LiveDispatchStory>;
  language: AppLanguage;
  saturated: LiveDispatchFactor | null;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [factor, setFactor] = useState<LiveDispatchFactor>(1);
  const story = stories[factor];
  const after = story.eveningPeakAfterGw;
  return (
    <div className="day-morph">
      <div className="day-factor-switch" role="group" aria-label={tx("Flottenfaktor", "Fleet factor")}>
        {LIVE_DISPATCH_FACTORS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === factor}
            onClick={() => setFactor(item)}
          >
            ×{item}
          </button>
        ))}
      </div>
      <DayRing
        points={story.points}
        label={tx(`Großspeicher ×${factor}`, `Large storage ×${factor}`)}
        description={tx("Abendspitze mit dieser Flotte", "Evening peak with this fleet")}
        showShift={false}
        showHourTicks={false}
        chargedGwh={0}
        center={<span className="num">{after === null ? "—" : formatGw1(after, language)}</span>}
      />
      <dl className="day-factor-values">
        {LIVE_DISPATCH_FACTORS.map((item) => {
          const peak = stories[item].eveningPeakAfterGw;
          return (
            <div key={item} className={item === factor ? "is-active" : undefined}>
              <dt>×{item}</dt>
              <dd className="num">{peak === null ? "—" : `${formatGw1(peak, language)} GW`}</dd>
            </div>
          );
        })}
      </dl>
      {saturated !== null && factor >= saturated ? <p className="day-factor-note">{saturationNote(saturated, language)}</p> : null}
    </div>
  );
}

function movementCallouts(story: LiveDispatchStory, language: AppLanguage): RingCallout[] {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return calloutAnchors(story.points).map((anchor, index) => {
    const gw = formatGw1(Math.abs(anchor.point.ohneMw / 1000), language);
    const text = anchor.id === "midday"
      ? tx(`Mittag ${gw}`, `Midday ${gw}`)
      : anchor.id === "evening" && story.eveningPeakAfterGw !== null
        ? tx(
            `Abend ${formatGw1(story.eveningPeakBeforeGw ?? 0, language)}→${formatGw1(story.eveningPeakAfterGw, language)}`,
            `Evening ${formatGw1(story.eveningPeakBeforeGw ?? 0, language)}→${formatGw1(story.eveningPeakAfterGw, language)}`
          )
        : tx(`Nacht ${formatGw1(anchor.point.ohneMw / 1000, language)}`, `Night ${formatGw1(anchor.point.ohneMw / 1000, language)}`);
    return { ...anchor, n: index + 1, text };
  });
}
