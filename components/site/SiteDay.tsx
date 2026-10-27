"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { DayRing, DayValuesTable, type RingCallout } from "@/components/day-ring/DayRing";
import { ModelChip } from "@/components/day-ring/ModelChip";
import { UtilisationLegend } from "@/components/day-ring/UtilisationLegend";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import { SiteSimulator } from "@/components/site/SiteSimulator";
import {
  BESS_DISPATCH_INITIAL_SOC_FRAC,
  BESS_DISPATCH_SOC_MAX_FRAC,
  BESS_DISPATCH_SOC_MIN_FRAC,
} from "@/lib/bessDispatchSimulator";
import { connectionLight } from "@/lib/connectionLight";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import { REFERENCE_PARK_DISPATCH_RULE, referenceParkConnectionUse, referenceParkFullDrawKw, type ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import { REFERENCE_PARK, referenceParkCRate, referenceParkHoursAtFullPower } from "@/lib/referencePark";
import { HAMBURG_SUPERMARKET, hamburgSupermarketProfile, planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { parsePerspective, parseScenario, sitePath, type Perspective, type ScenarioId } from "@/lib/perspective";
import { QUARTIER, planQuartier, quartierProfile } from "@/lib/quartierExample";
import { storyFromPlan, supermarketConnectionStory, type ConnectionPoint, type SiteConnectionStory } from "@/lib/siteConnectionDay";
import { GRID_SUPPORT_CONFIG, parseLoadProfileCsv, planSite, type LoadProfile, type SitePlan } from "@/lib/sitePlanner";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

export function SiteDay({ modelDay = null }: { modelDay?: ReferenceParkModelDay | null }) {
  const params = useSearchParams();
  const view = parsePerspective(params.get("view")) ?? "projekt";
  const scenario = parseScenario(params.get("scenario")) ?? "supermarkt";
  const { language } = useLanguage();
  const [csv, setCsv] = useState<LoadProfile | null>(null);
  const [limitDraft, setLimitDraft] = useState("");

  const example = useMemo(() => exampleBundle(scenario), [scenario]);
  const limitKw = Number(limitDraft.replace(",", "."));
  const uploaded = useMemo(() => {
    if (!csv || !Number.isFinite(limitKw) || limitKw <= 0) {
      return null;
    }
    const plan = planSite({
      profile: csv,
      pvEnabled: false,
      pvKwp: 0,
      pvOrientation: "south",
      limitKw,
      voltage: "NS",
      operation: "grid-serving",
      demandChargeEurPerKwYear: HAMBURG_SUPERMARKET.demandChargeEurPerKwYear,
      energyPriceCtPerKwh: HAMBURG_SUPERMARKET.energyPriceCtPerKwh,
      feedInCtPerKwh: HAMBURG_SUPERMARKET.feedInCtPerKwh,
      dynamicTariff: false,
      autoSize: true,
      manualPowerKw: 0,
      manualEnergyKwh: 0,
      roundTripEfficiency: HAMBURG_SUPERMARKET.roundTripEfficiency,
      capexEurPerKwh: HAMBURG_SUPERMARKET.capexEurPerKwh,
      maxCyclesPerYear: HAMBURG_SUPERMARKET.maxCyclesPerYear,
      lifetimeYears: HAMBURG_SUPERMARKET.lifetimeYears,
      discountRate: 0,
    });
    return { plan, profile: csv, story: storyFromPlan(plan, limitKw, HAMBURG_SUPERMARKET.roundTripEfficiency) };
  }, [csv, limitKw]);

  const active = uploaded ?? example;
  const missingLimit = csv !== null && uploaded === null;

  return (
    <div className="site-v2">
      {scenario === "grossspeicher" ? (
        <ReferenceParkHero view={view} language={language} modelDay={modelDay} />
      ) : active ? (
        <ExampleHero view={view} scenario={scenario} language={language} plan={active.plan} story={active.story} example={!uploaded} />
      ) : null}
      {scenario !== "grossspeicher" && active && !missingLimit ? (
        <SiteSimulator view={view} story={active.story} language={language} />
      ) : null}
      {view === "netz" && scenario !== "grossspeicher" && active ? (
        <SupportCard language={language} story={active.story} />
      ) : null}
      {view === "projekt" && scenario !== "grossspeicher" && active ? (
        <Assumptions language={language} plan={active.plan} />
      ) : null}
      <CsvZone
        language={language}
        missingLimit={missingLimit}
        onFile={(text) => {
          const parsed = parseLoadProfileCsv(text);
          if (parsed.ok) {
            setCsv(parsed.profile);
          }
        }}
        limitDraft={limitDraft}
        onLimit={setLimitDraft}
      />
      <ExampleCards language={language} view={view} scenario={scenario} />
    </div>
  );
}

function exampleBundle(scenario: ScenarioId): { plan: SitePlan; profile: LoadProfile; story: SiteConnectionStory } | null {
  if (scenario === "grossspeicher") {
    return null;
  }
  if (scenario === "quartier") {
    const plan = planQuartier();
    return { plan, profile: quartierProfile(), story: storyFromPlan(plan, QUARTIER.transformerKw, QUARTIER.roundTripEfficiency) };
  }
  const plan = planHamburgSupermarket();
  return { plan, profile: hamburgSupermarketProfile(), story: supermarketConnectionStory() };
}

function ExampleHero({
  view,
  scenario,
  language,
  plan,
  story,
  example,
}: {
  view: Perspective;
  scenario: ScenarioId;
  language: AppLanguage;
  plan: SitePlan;
  story: SiteConnectionStory;
  example: boolean;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const netz = view === "netz";
  const peak = formatQuantity(story.peakBeforeKw, language, 0);
  const limit = formatQuantity(story.limitKw, language, 0);
  const hours = formatQuantity(story.hoursOverLimit, language, 2);
  const energy = formatQuantity(plan.energyKwh, language, 0);
  const power = formatQuantity(plan.powerKw, language, 0);
  const cycles = formatQuantity(plan.fullCycles, language, 0);
  const discharged = formatQuantity(story.dischargedKwh, language, 1);
  const duration = formatQuantity(plan.durationHours, language, plan.durationHours % 1 === 0 ? 0 : 1);
  const beforeLight = connectionLight(story.peakBeforeKw, story.limitKw);
  const afterLight = connectionLight(story.peakAfterKw, story.limitKw);
  const sentence = netz
    ? scenario === "quartier"
      ? tx("Abends liegt die Ortsnetzstation über ihrer Planleistung. Der Speicher hält sie darunter.", "In the evening the local substation sits above its planning rating. Storage holds it under that rating.")
      : tx("Abends will der Supermarkt mehr, als sein Anschluss hergibt. Der Speicher hält ihn darunter.", "In the evening the supermarket wants more than its connection can give. Storage holds it under that limit.")
    : scenario === "quartier"
      ? tx("Der Speicher an der Ortsnetzstation nimmt die Abendspitze des Quartiers auf.", "Storage at the local substation takes the neighbourhood evening peak.")
      : tx("Eine Stunde Speicher reicht, um die Abendspitze dieses Supermarkts zu kappen.", "One hour of storage is enough to shave this supermarket’s evening peak.");
  const points = toRing(story.points);
  const callouts = siteCallouts(story, language, netz);

  return (
    <section className="day-hero site-hero" aria-labelledby="site-hero-title">
      <div className="day-hero-inner">
        <PerspectiveToggle view={view} scenario={scenario} language={language} />
        <div className="site-hero-grid">
          <div>
            <p className="day-kicker">
              {netz ? tx("Standort · Anschluss prüfen", "Site · check the connection") : tx("Standort · Speicher planen", "Site · plan storage")}
              {example ? <span className="site-chip">{tx("Beispieldaten", "Example data")}</span> : null}
            </p>
            <h1 id="site-hero-title">{sentence}</h1>
            <dl className="site-stats">
              {netz ? (
                <>
                  <Stat value={peak} unit="kW" label={tx("Spitze ohne Speicher", "Peak without storage")} />
                  <Stat value={limit} unit="kW" label={scenario === "quartier" ? tx("Planleistung", "Planning rating") : tx("Anschlussgrenze", "Connection limit")} />
                  <Stat value={hours} unit="h" label={tx("über der Grenze am Spitzentag", "over the limit on the peak day")} />
                </>
              ) : (
                <>
                  <Stat value={energy} unit="kWh" label={tx(`bei ${power} kW, ${duration} h`, `at ${power} kW, ${duration} h`)} />
                  <Stat value={`≈ ${cycles}`} unit={tx("/Jahr", "/year")} label={<><GlossaryTip id="vollzyklen" language={language} /> {tx("Vollzyklen", "Full cycles")}</>} />
                  <Stat value={discharged} unit="kWh" label={tx("am Spitzentag abgegeben", "delivered on the peak day")} />
                </>
              )}
            </dl>
            {netz ? (
              <div className="site-chips">
                <Verdict prefix={tx("ohne Speicher", "without storage")} status={beforeLight.status} label={beforeLight.label[language]} ratio={beforeLight.ratio} />
                <span aria-hidden="true">→</span>
                <Verdict prefix={tx("mit Speicher", "with storage")} status={afterLight.status} label={afterLight.label[language]} ratio={afterLight.ratio} />
                <Link className="site-badge" href="/methodik#netzdienlichkeit">
                  {tx("netzdienlich v1 · Einschätzung, kein Befund", "grid-supportive v1 · estimate, not a finding")}
                </Link>
              </div>
            ) : (
              <p className="site-model-line"><ModelChip label={tx("Modellschätzung", "Model estimate")} /></p>
            )}
            <div className="day-cta-row">
              <a className="day-cta" href="#csv-drop">{tx("Eigenes CSV prüfen →", "Check your own CSV →")}</a>
              <PdfLink view={view} language={language} plan={plan} profile={scenario === "quartier" ? quartierProfile() : hamburgSupermarketProfile()} />
            </div>
          </div>
          <div>
            <DayRing
              points={points}
              unit="kW"
              scale="utilisation"
              limit={story.limitKw}
              mode={netz ? "netz" : "projekt"}
              label={sentence}
              description={tx("Ein Tag am Anschluss, Viertelstunden in kW.", "One day at the connection, quarter-hours in kW.")}
              callouts={callouts}
              showShift={false}
              chargedGwh={0}
              center={<span className="num">{netz ? `${peak} → ${limit}` : energy}<small>{netz ? " kW" : " kWh"}</small></span>}
            />
            <UtilisationLegend language={language} />
          </div>
        </div>
        <DayValuesTable
          points={points}
          caption={tx("Viertelstunden am Anschluss, kW", "Quarter-hours at the connection, kW")}
          timeLabel={tx("Zeit", "Time")}
          ohneLabel={tx("ohne Speicher kW", "without storage kW")}
          mitLabel={tx("mit Speicher kW", "with storage kW")}
          chargeLabel={tx("Laden kW", "Charge kW")}
          dischargeLabel={tx("Abgeben kW", "Discharge kW")}
          socLabel={tx("Ladezustand", "State of charge")}
        />
      </div>
    </section>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: ReactNode }) {
  return (
    <div>
      <dd className="num">{value}<small> {unit}</small></dd>
      <dt>{label}</dt>
    </div>
  );
}

function Verdict({
  prefix,
  status,
  label,
  ratio,
}: {
  prefix: string;
  status: string;
  label: string;
  ratio: number | null;
}) {
  const color = status === "missing" || ratio === null ? "#C5CED6" : utilisationDot(ratio);
  return (
    <p className="site-verdict">
      <span>{prefix}</span>
      <span className="site-dot" style={{ background: color }} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

function utilisationDot(ratio: number): string {
  if (ratio >= 1) return "#FF6655";
  if (ratio >= 0.9) return "#F2A25C";
  if (ratio >= 0.6) return "#2F6FC0";
  return "#2CC8B8";
}

function PerspectiveToggle({ view, scenario, language }: { view: Perspective; scenario: ScenarioId; language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div className="site-toggle" role="group" aria-label={tx("Perspektive", "Perspective")}>
      <Link href={sitePath("projekt", scenario)} aria-current={view === "projekt" ? "page" : undefined}>{tx("Projektierer", "Developer")}</Link>
      <Link href={sitePath("netz", scenario)} aria-current={view === "netz" ? "page" : undefined}>{tx("Netzbetreiber", "Grid operator")}</Link>
    </div>
  );
}

function siteCallouts(story: SiteConnectionStory, language: AppLanguage, netz: boolean): RingCallout[] {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const over = story.points.filter((point) => point.ohneKw > story.limitKw + 0.05);
  const first = over[0] ?? story.points[0];
  const last = over[over.length - 1] ?? first;
  const pv = story.points.reduce((best, point) => (point.ohneKw < best.ohneKw ? point : best), story.points[0]);
  const end = clock(last.hour + 0.25);
  const limitPoint = story.points.find((point) => point.hour >= 9 && point.hour < 10) ?? story.points[0];
  const covered = netz
    ? tx(`${clock(first.hour)}–${end} über der Grenze`, `${clock(first.hour)}–${end} over the limit`)
    : tx("vom Speicher gedeckt", "covered by storage");
  return [
    { id: "evening", n: 1, point: toRing([first])[0], text: covered },
    { id: "night", n: 2, point: toRing([limitPoint])[0], text: tx(`Anschluss ${formatQuantity(story.limitKw, language, 0)} kW`, `Connection ${formatQuantity(story.limitKw, language, 0)} kW`) },
    { id: "midday", n: 3, point: toRing([pv])[0], text: tx(`Mittags ${formatQuantity(Math.abs(pv.ohneKw), language, 0)} kW Rückspeisung`, `Midday ${formatQuantity(Math.abs(pv.ohneKw), language, 0)} kW export`) },
  ];
}

function ReferenceParkGridHero({ language, modelDay }: { language: AppLanguage; modelDay: ReferenceParkModelDay | null }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const facts = REFERENCE_PARK;
  const figure = formatQuantity(facts.powerMw, language, 1);
  const energy = formatQuantity(facts.energyMwh, language, 1);
  const voltage = formatQuantity(facts.voltageKv, language, 0);
  const efficiency = modelDay?.efficiency ?? ROUND_TRIP_EFFICIENCY;
  const socMin = modelDay?.socMinFrac ?? BESS_DISPATCH_SOC_MIN_FRAC;
  const socMax = modelDay?.socMaxFrac ?? BESS_DISPATCH_SOC_MAX_FRAC;
  const socStart = modelDay?.initialSocFrac ?? BESS_DISPATCH_INITIAL_SOC_FRAC;
  const points = modelDay?.points ?? [];
  const use = referenceParkConnectionUse(points, facts.powerMw);
  const peakPct = Math.round(GRID_SUPPORT_CONFIG.peakUtilisation * 100);
  const sharePct = Math.round(GRID_SUPPORT_CONFIG.supportiveMinShare * 100);
  const note = tx("Modelltag · nicht die echte Fahrweise", "Model day · not the real operation");
  const rule = tx(
    "Laden ist Bezug aus dem Netz. Abgeben ist Einspeisung ins Netz.",
    "Charging is withdrawal from the grid. Discharging is feed-in to the grid."
  );
  const ringLabel = tx(
    `MODELLTAG. Anschluss ${facts.nameDe}, ${voltage} kV, ${figure} MW.`,
    `MODELLTAG. Connection ${facts.nameEn}, ${voltage} kV, ${figure} MW.`
  );
  const ringDescription = tx(
    `${note}. ${rule} ${REFERENCE_PARK_DISPATCH_RULE.de}`,
    `${note}. ${rule} ${REFERENCE_PARK_DISPATCH_RULE.en}`
  );
  const useLine = connectionUseSentence(use, facts.powerMw, language);
  return (
    <section className="day-hero site-hero" aria-labelledby="site-hero-title">
      <div className="day-hero-inner">
        <PerspectiveToggle view="netz" scenario="grossspeicher" language={language} />
        <div className="site-hero-grid site-model-grid">
          <div className="site-model-copy">
            <p className="day-kicker">
              {tx("Netzbetreiber · Hochspannung", "Grid operator · high voltage")}{" "}
              <span className="site-chip site-chip-public">{tx("Modelltag", "Model day")}</span>
            </p>
            <h1 id="site-hero-title">
              {language === "de" ? (
                <>Bollingstedt am <span className="site-keep">110-kV-Netz</span> von SH Netz.</>
              ) : (
                "Bollingstedt on the 110 kV grid of SH Netz."
              )}
            </h1>
            <dl className="site-facts">
              <ReferenceParkFact label={tx("Leistung", "Power")} value={`${figure} MW`} href={facts.mastrUnits[0].href} source={`MaStR ${facts.mastrUnits[0].seeId}`} />
              <ReferenceParkFact label={tx("Inhalt", "Energy")} value={`${energy} MWh`} href={facts.mastrUnits[1].href} source={`MaStR ${facts.mastrUnits[1].seeId}`} />
              <ReferenceParkFact
                label={<><GlossaryTip id="hs" language={language} /> {tx("Spannung", "Voltage")}</>}
                value={`${voltage} kV`}
                href={facts.sources[3].href}
                source={facts.gridOperator}
              />
            </dl>
          </div>
          <div className="site-model-ring">
            <DayRing
              points={points}
              unit="kW"
              scale="utilisation"
              limit={referenceParkFullDrawKw()}
              showLimit={false}
              mode="netz"
              empty={points.length === 0}
              showHourTicks
              showSoc
              showFlow={false}
              showShift={false}
              smoothSeries={false}
              clearCenter
              solidStrokes
              referenceRing
              label={ringLabel}
              description={ringDescription}
              centerMark={{ pill: "MODELLTAG", figure, unit: "MW", note: [] }}
            />
            <p className="day-model-caption">{note}</p>
            <p className="day-model-rule">{rule}</p>
            <p className="day-model-rule-link">
              <a href="/methodik#modelltag">{tx("Regel im Detail →", "Rule in detail →")}</a>
            </p>
            <ReferenceParkTable
              points={points}
              caption={tx(
                `${ringLabel} ${note}. Plus ist Einspeisung, minus ist Bezug.`,
                `${ringLabel} ${note}. Plus is feed-in, minus is withdrawal.`
              )}
              language={language}
            />
          </div>
          <div className="site-model-rest">
            <h2 className="site-block-title" id="anschlussauslastung">{tx("Anschlussauslastung am Modelltag", "Connection use on the model day")}</h2>
            <p>
              {points.length > 0
                ? tx(
                    "Eine veröffentlichte Grenze in MW gibt es nicht. Die Auslastung der Vereinbarung lässt sich deshalb nicht rechnen.",
                    "No limit in MW is published. Use of the agreement therefore cannot be calculated."
                  )
                : tx(
                    "Der Day-Ahead-Preis von gestern ist gerade nicht geladen. Eine Auslastung gibt es dann nicht.",
                    "Yesterday’s day-ahead price is not loaded right now. There is then no utilisation figure."
                  )}
            </p>
            {points.length > 0 ? (
              <p>
                {useLine}{" "}
                {tx(
                  "Das ist die Auslastung der gemeldeten Leistung, nicht die Auslastung einer unveröffentlichten Grenze.",
                  "That is use of the published power, not use of an unpublished limit."
                )}
              </p>
            ) : null}
            <h2 className="site-block-title">{tx("Laden und Abgeben", "Charging and discharging")}</h2>
            <aside className="site-note">
              <GlossaryTip id="front-of-meter" language={language} />
              <div>
                <p>
                  {tx(
                    "Der Speicher steht direkt am Netz. Eine Last eines Betriebs dahinter gibt es nicht.",
                    "The battery sits directly on the grid. There is no site load behind it."
                  )}
                </p>
              </div>
            </aside>
            <p>
              {tx(
                "Laden ist Bezug aus dem Netz von SH Netz. Abgeben ist Einspeisung in dasselbe Netz. Beides im Ring ist eine Modellschätzung, nicht die gemessene Fahrweise.",
                "Charging is withdrawal from the SH Netz grid. Discharging is feed-in to the same grid. Both on the ring are a model estimate, not the measured operation."
              )}
            </p>
            <p>{tx(REFERENCE_PARK_DISPATCH_RULE.de, REFERENCE_PARK_DISPATCH_RULE.en)}</p>
            <p>
              <Link href="/#beispieltage">{tx("Beispieltage auf der Startseite ansehen", "See the example days on the homepage")}</Link>
            </p>
            <h2 className="site-block-title">{tx("Flexible Anschlussvereinbarung", "Flexible connection agreement")}</h2>
            <aside className="site-note">
              <GlossaryTip id="fca" language={language} />
              <div>
                <p>
                  {tx(
                    "Nach § 17 Abs. 2b EnWG kann der Netzbetreiber eine flexible Anschlussvereinbarung anbieten. Sie setzt der höchsten Bezugs- oder Einspeiseleistung eine Grenze, statisch oder dynamisch.",
                    "Under section 17 (2b) of the Energy Industry Act the grid operator can offer a flexible connection agreement. It sets a static or a dynamic limit on the highest withdrawal or feed-in."
                  )}
                </p>
                <p>
                  {tx(
                    "Bei Bollingstedt sind Bezug und Einspeisung dynamisch begrenzt. Die Grenzwerte sind nicht veröffentlicht.",
                    "At Bollingstedt, withdrawal and feed-in are limited dynamically. The limits are not published."
                  )}
                </p>
                <p>
                  <Link href="/szenarien">{tx("Szenarien rechnen", "Run scenarios")}</Link>
                </p>
              </div>
            </aside>
            <p className="site-quiet">
              {tx(
                `Eine Marke netzdienlich steht hier nicht. Regel v1 braucht eine bekannte Anschlussleistung und eine Standortlast: mindestens ${sharePct} % der Entladung bei mindestens ${peakPct} % Auslastung, und Laden ohne neue Bezugsspitze. Beides liegt für diesen Anschluss nicht vor.`,
                `There is no grid-support badge here. Rule v1 needs a known connection capacity and a site load: at least ${sharePct}% of discharge at at least ${peakPct}% utilisation, and charging without a new import peak. Neither is available for this connection.`
              )}{" "}
              <a href="/methodik#netzdienlichkeit">{tx("Regel v1 in der Methodik", "Rule v1 in the method")}</a>
            </p>
            <aside className="site-note">
              <GlossaryTip id="ladezustand" language={language} />
              <div>
                <p>
                  {tx(
                    `Annahme im Modell: Wirkungsgrad ${formatQuantity(efficiency * 100, language, 0)} %, Ladezustand von ${formatQuantity(socMin * 100, language, 0)} % bis ${formatQuantity(socMax * 100, language, 0)} %, Start bei ${formatQuantity(socStart * 100, language, 0)} %.`,
                    `Model assumption: round-trip efficiency ${formatQuantity(efficiency * 100, language, 0)}%, state of charge from ${formatQuantity(socMin * 100, language, 0)}% to ${formatQuantity(socMax * 100, language, 0)}%, start at ${formatQuantity(socStart * 100, language, 0)}%.`
                  )}{" "}
                  <a href="/methodik#modelltag">{tx("Rechnung in der Methodik", "Calculation in the method")}</a>
                </p>
                <p>
                  {modelDay
                    ? tx(`Gebotszone DE-LU, Liefertag ${germanDate(modelDay.dateBerlin)}.`, `DE-LU bidding zone, delivery day ${germanDate(modelDay.dateBerlin)}.`)
                    : tx("Ohne Preise von gestern bleibt der Ring leer.", "Without yesterday’s prices the ring stays empty.")}
                </p>
              </div>
            </aside>
            <p className="site-quiet">
              <a href={facts.dashboardHref}>{tx("echte Fahrweise beim Betreiber", "real operation at the operator")}</a>
              {" · "}
              <a href={facts.sources[3].href}>SH Netz</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function connectionUseSentence(
  use: ReturnType<typeof referenceParkConnectionUse>,
  nameplateMw: number,
  language: AppLanguage
): string {
  const figure = formatQuantity(nameplateMw, language, 1);
  const idle = (mw: number) => mw <= 0.05;
  if (language === "de") {
    if (idle(use.maxChargeMw) && idle(use.maxDischargeMw)) {
      return "Im Modell gibt es an diesem Tag keinen Bezug und keine Einspeisung.";
    }
    if (use.chargeAtNameplate && use.dischargeAtNameplate) {
      return `Der höchste Bezug und die höchste Einspeisung im Modell liegen bei der gemeldeten Leistung von ${figure} MW.`;
    }
    return `Im Modell liegen ${dePeak("Bezug", use.chargeAtNameplate, use.maxChargeMw, nameplateMw)} und ${dePeak("Einspeisung", use.dischargeAtNameplate, use.maxDischargeMw, nameplateMw)}.`;
  }
  if (idle(use.maxChargeMw) && idle(use.maxDischargeMw)) {
    return "The model has no withdrawal and no feed-in on this day.";
  }
  if (use.chargeAtNameplate && use.dischargeAtNameplate) {
    return `The highest withdrawal and the highest feed-in in the model are the published power of ${figure} MW.`;
  }
  return `In the model, ${enPeak("withdrawal", use.chargeAtNameplate, use.maxChargeMw, nameplateMw)} and ${enPeak("feed-in", use.dischargeAtNameplate, use.maxDischargeMw, nameplateMw)}.`;
}

function dePeak(label: "Bezug" | "Einspeisung", atNameplate: boolean, megawatts: number, nameplateMw: number): string {
  const figure = formatQuantity(nameplateMw, "de", 1);
  if (megawatts <= 0.05) {
    return label === "Bezug" ? "kein Bezug" : "keine Einspeisung";
  }
  if (atNameplate) {
    const article = label === "Bezug" ? "der höchste Bezug" : "die höchste Einspeisung";
    return `${article} bei der gemeldeten Leistung von ${figure} MW`;
  }
  const value = formatQuantity(megawatts, "de", 1);
  const share = formatQuantity((megawatts / nameplateMw) * 100, "de", 0);
  const article = label === "Bezug" ? "der höchste Bezug" : "die höchste Einspeisung";
  return `${article} bei ${value} MW, das sind ${share} % der gemeldeten ${figure} MW`;
}

function enPeak(label: "withdrawal" | "feed-in", atNameplate: boolean, megawatts: number, nameplateMw: number): string {
  const figure = formatQuantity(nameplateMw, "en", 1);
  if (megawatts <= 0.05) {
    return label === "withdrawal" ? "there is no withdrawal" : "there is no feed-in";
  }
  const name = label === "withdrawal" ? "the highest withdrawal" : "the highest feed-in";
  if (atNameplate) {
    return `${name} is the published power of ${figure} MW`;
  }
  const value = formatQuantity(megawatts, "en", 1);
  const share = formatQuantity((megawatts / nameplateMw) * 100, "en", 0);
  return `${name} is ${value} MW, ${share}% of the published ${figure} MW`;
}

function ReferenceParkTable({ points, caption, language }: { points: LiveDispatchPoint[]; caption: string; language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  if (points.length === 0) {
    return null;
  }
  return (
    <div className="day-sr">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>{tx("Zeit", "Time")}</th>
            <th>{tx("Leistung MW", "Power MW")}</th>
            <th>{tx("Ladezustand", "State of charge")}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => {
            const signed = point.dischargeMw > 0 ? point.dischargeMw : -point.chargeMw;
            return (
              <tr key={point.hour}>
                <td>{clock(point.hour)}</td>
                <td>{signed.toFixed(1)}</td>
                <td>{formatQuantity(point.soc * 100, language, 0)} %</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReferenceParkHero({ view, language, modelDay }: { view: Perspective; language: AppLanguage; modelDay: ReferenceParkModelDay | null }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const facts = REFERENCE_PARK;
  const hours = referenceParkHoursAtFullPower();
  const cRate = referenceParkCRate();
  const figure = formatQuantity(facts.powerMw, language, 1);
  const note = tx("Gestrige Day-Ahead-Preise · nicht die echte Fahrweise", "Yesterday’s day-ahead prices · not the real operation");
  const rule = tx(REFERENCE_PARK_DISPATCH_RULE.de, REFERENCE_PARK_DISPATCH_RULE.en);
  const ringLabel = tx(
    `MODELLTAG. ${facts.nameDe}, ${figure} MW.`,
    `MODELLTAG. ${facts.nameEn}, ${figure} MW.`
  );
  const efficiency = modelDay?.efficiency ?? ROUND_TRIP_EFFICIENCY;
  const socMin = modelDay?.socMinFrac ?? BESS_DISPATCH_SOC_MIN_FRAC;
  const socMax = modelDay?.socMaxFrac ?? BESS_DISPATCH_SOC_MAX_FRAC;
  const socStart = modelDay?.initialSocFrac ?? BESS_DISPATCH_INITIAL_SOC_FRAC;
  const ringDescription = tx(
    `${note}. ${rule} Annahme: Wirkungsgrad ${formatQuantity(efficiency * 100, language, 0)} %, Ladezustand von ${formatQuantity(socMin * 100, language, 0)} % bis ${formatQuantity(socMax * 100, language, 0)} %, Start bei ${formatQuantity(socStart * 100, language, 0)} %.`,
    `${note}. ${rule} Assumption: round-trip efficiency ${formatQuantity(efficiency * 100, language, 0)}%, state of charge from ${formatQuantity(socMin * 100, language, 0)}% to ${formatQuantity(socMax * 100, language, 0)}%, start at ${formatQuantity(socStart * 100, language, 0)}%.`
  );
  const points = modelDay?.points ?? [];
  if (view === "netz") {
    return <ReferenceParkGridHero language={language} modelDay={modelDay} />;
  }
  return (
    <section className="day-hero site-hero" aria-labelledby="site-hero-title">
      <div className="day-hero-inner">
        <PerspectiveToggle view={view} scenario="grossspeicher" language={language} />
        <div className="site-hero-grid site-model-grid">
          <div className="site-model-copy">
            <p className="day-kicker">{tx("Standort · öffentliche Referenz", "Site · public reference")} <span className="site-chip site-chip-public">{tx("Öffentliche Eckdaten", "Public key figures")}</span></p>
            <h1 id="site-hero-title">{tx("Großspeicher Bollingstedt am Hochspannungsnetz.", "Bollingstedt large storage on the high-voltage grid.")}</h1>
            <dl className="site-facts">
              <ReferenceParkFact label={tx("Leistung", "Power")} value={`${figure} MW`} href={facts.mastrUnits[0].href} source={`MaStR ${facts.mastrUnits[0].seeId}`} />
              <ReferenceParkFact label={tx("Inhalt", "Energy")} value={`${formatQuantity(facts.energyMwh, language, 1)} MWh`} href={facts.mastrUnits[1].href} source={`MaStR ${facts.mastrUnits[1].seeId}`} />
              <ReferenceParkFact label={tx("Volle Leistung", "Full power")} value={`${formatQuantity(hours, language, 1)} h`} href={facts.sources[2].href} source={facts.sources[2].publisher} />
            </dl>
          </div>
          <div className="site-model-ring">
            <DayRing
              points={points}
              unit="kW"
              scale="utilisation"
              limit={referenceParkFullDrawKw()}
              showLimit={false}
              mode="netz"
              empty={points.length === 0}
              showHourTicks
              showSoc
              showFlow={false}
              showShift={false}
              smoothSeries={false}
              clearCenter
              solidStrokes
              referenceRing
              label={ringLabel}
              description={ringDescription}
              centerMark={{ pill: "MODELLTAG", figure, unit: "MW", note: [] }}
            />
            <p className="day-model-caption">{note}</p>
            <p className="day-model-rule">{rule}</p>
            <p className="day-model-rule-link">
              <a href="/methodik#modelltag">{tx("Regel im Detail →", "Rule in detail →")}</a>
            </p>
            {points.length > 0 ? (
              <div className="day-sr">
                <table>
                  <caption>{tx(`${ringLabel} ${note}. Leistung in MW, plus ist Abgabe, minus ist Bezug.`, `${ringLabel} ${note}. Power in MW, plus is discharge, minus is charge.`)}</caption>
                  <thead>
                    <tr>
                      <th>{tx("Zeit", "Time")}</th>
                      <th>{tx("Leistung MW", "Power MW")}</th>
                      <th>{tx("Ladezustand", "State of charge")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => {
                      const signed = point.dischargeMw > 0 ? point.dischargeMw : -point.chargeMw;
                      return (
                        <tr key={point.hour}>
                          <td>{clock(point.hour)}</td>
                          <td>{signed.toFixed(1)}</td>
                          <td>{formatQuantity(point.soc * 100, language, 0)} %</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
          <div className="site-model-rest">
            <dl className="site-meta">
              <div>
                <dt>{tx("Standort", "Site")}</dt>
                <dd>{tx(`${facts.placeDe}, ${facts.districtDe} (${facts.state}). ${facts.project}.`, `${facts.placeEn}, ${facts.districtEn} (${facts.state}). ${facts.project}.`)}</dd>
              </div>
              <div>
                <dt>{tx("In Betrieb", "In operation")}</dt>
                <dd>{tx("seit 2025 (MaStR: 13.03.2025).", "since 2025 (MaStR: 13 March 2025).")}</dd>
              </div>
              <div>
                <dt>{tx("Betreiber", "Operator")}</dt>
                <dd>
                  {tx(
                    `${facts.operator}. Eigentümer ${facts.owner} seit 25.08.2026. Die Betreiber-Meldung nennt ${facts.operatorEnergyMwh} MWh. C-Rate ${formatQuantity(cRate, language, 2)}.`,
                    `${facts.operator}. Owner ${facts.owner} since 25 August 2026. The operator’s release says ${facts.operatorEnergyMwh} MWh. C-rate ${formatQuantity(cRate, language, 2)}.`
                  )}
                </dd>
              </div>
              <div>
                <dt>{tx("Anschluss", "Connection")}</dt>
                <dd>
                  {tx(
                    `Hochspannung (${facts.voltageKv} kV), ${facts.gridOperator}. Bezug und Einspeisung sind dynamisch begrenzt. Die Grenzwerte sind nicht veröffentlicht.`,
                    `High voltage (${facts.voltageKv} kV), ${facts.gridOperator}. Withdrawal and feed-in are limited dynamically. The limits are not published.`
                  )}
                </dd>
              </div>
            </dl>
            <h2 className="site-block-title">{tx("Laden und Abgeben", "Charging and discharging")}</h2>
            <p>
              {tx(
                "Laden ist Bezug aus dem Netz von SH Netz. Abgeben ist Einspeisung in dasselbe Netz. Beides im Ring ist eine Modellschätzung, nicht die gemessene Fahrweise.",
                "Charging is withdrawal from the SH Netz grid. Discharging is feed-in to the same grid. Both on the ring are a model estimate, not the measured operation."
              )}
            </p>
            <p>
              <Link href="/#beispieltage">{tx("Beispieltage auf der Startseite ansehen", "See the example days on the homepage")}</Link>
            </p>
            <aside className="site-note">
              <GlossaryTip id="fca" language={language} />
              <div>
                <p>
                  {tx(
                    `Annahme: Wirkungsgrad ${formatQuantity(efficiency * 100, language, 0)} %, Ladezustand von ${formatQuantity(socMin * 100, language, 0)} % bis ${formatQuantity(socMax * 100, language, 0)} %, Start bei ${formatQuantity(socStart * 100, language, 0)} %.`,
                    `Assumption: round-trip efficiency ${formatQuantity(efficiency * 100, language, 0)}%, state of charge from ${formatQuantity(socMin * 100, language, 0)}% to ${formatQuantity(socMax * 100, language, 0)}%, start at ${formatQuantity(socStart * 100, language, 0)}%.`
                  )}{" "}
                  <a href="/methodik#modelltag">{tx("Rechnung in der Methodik", "Calculation in the method")}</a>
                </p>
                <p>
                  {modelDay
                    ? tx(`Gebotszone DE-LU, Liefertag ${germanDate(modelDay.dateBerlin)}.`, `DE-LU bidding zone, delivery day ${germanDate(modelDay.dateBerlin)}.`)
                    : tx("Der Day-Ahead-Preis von gestern ist gerade nicht geladen. Der Ring hat dann keinen Verlauf.", "Yesterday’s day-ahead price is not loaded right now. The ring then has no profile.")}
                </p>
              </div>
            </aside>
            <p className="site-quiet">
              <a href={facts.dashboardHref}>{tx("echte Fahrweise beim Betreiber", "real operation at the operator")}</a>
              {" · "}
              <a href={facts.sources[3].href}>SH Netz</a>
              {" · "}
              <Link href="/szenarien">{tx("Szenarien rechnen", "Run scenarios")}</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function germanDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function ReferenceParkFact({ label, value, href, source }: { label: ReactNode; value: string; href: string; source: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
      <dd><a href={href}>{source}</a></dd>
    </div>
  );
}

function SupportCard({ language, story }: { language: AppLanguage; story: SiteConnectionStory }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const share = Math.round(story.badge.dischargeShare * 100);
  return (
    <section className="day-paper" aria-labelledby="site-support">
      <div className="day-hero-inner site-split">
        <article className="site-card">
          <p className="day-kicker">{tx("Einschätzung netzdienlich v1", "Grid-support estimate v1")}</p>
          <h2 id="site-support">{tx("Anteil der Entladung in der Spitze", "Share of discharge in the peak")}</h2>
          <p className="num site-bar" style={{ ["--share" as string]: `${share}%` }}><span>{share} %</span><span>{tx("Schwelle 60 %", "Threshold 60%")}</span></p>
          <p>{tx(`Neue Bezugsspitze: ${story.badge.createsNewPeak ? "ja" : "keine"}.`, `New import peak: ${story.badge.createsNewPeak ? "yes" : "none"}.`)}</p>
          <p>{tx("Ob netzdienlicher Speicherbetrieb im örtlichen Verteilnetz Netzausbau vermeidet, kann nur der Netzbetreiber beurteilen; ihm steht dabei ein Entscheidungsspielraum zu.", "Whether grid-supportive storage operation avoids network expansion in the local distribution network can only be judged by the network operator; that operator has a margin of decision.")}</p>
          <Link href="/methodik#netzdienlichkeit">{tx("Regel v1 in der Methodik", "Rule v1 in the method")}</Link>
        </article>
      </div>
    </section>
  );
}

function Assumptions({ language, plan }: { language: AppLanguage; plan: SitePlan }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <section className="day-paper">
      <div className="day-hero-inner">
        <p className="day-kicker">{tx("Wirtschaftlichkeit", "Economics")} <ModelChip label={tx("Modellschätzung", "Model estimate")} /></p>
        <h2>{tx(`Rückzahlung ≈ ${formatYears(plan.paybackYears, language)} Jahre`, `Payback ≈ ${formatYears(plan.paybackYears, language)} years`)}</h2>
        <details>
          <summary>{tx("Annahmen", "Assumptions")}</summary>
          <ul>
            <li>{tx(`Leistungspreis ${formatQuantity(HAMBURG_SUPERMARKET.demandChargeEurPerKwYear, language, 0)} €/kW·Jahr, Annahme.`, `Demand charge ${formatQuantity(HAMBURG_SUPERMARKET.demandChargeEurPerKwYear, language, 0)} €/kW·year, an assumption.`)}</li>
            <li>{tx(`Arbeitspreis ${formatQuantity(HAMBURG_SUPERMARKET.energyPriceCtPerKwh, language, 1)} ct/kWh, Einspeisung ${formatQuantity(HAMBURG_SUPERMARKET.feedInCtPerKwh, language, 0)} ct/kWh.`, `Retail price ${formatQuantity(HAMBURG_SUPERMARKET.energyPriceCtPerKwh, language, 1)} ct/kWh, export ${formatQuantity(HAMBURG_SUPERMARKET.feedInCtPerKwh, language, 0)} ct/kWh.`)}</li>
            <li>{tx(`CAPEX ${formatQuantity(HAMBURG_SUPERMARKET.capexEurPerKwh, language, 0)} €/kWh, Wirkungsgrad ${formatQuantity(plan.assumptions.roundTripEfficiency * 100, language, 0)} %, Lebensdauer ${HAMBURG_SUPERMARKET.lifetimeYears} Jahre.`, `CAPEX ${formatQuantity(HAMBURG_SUPERMARKET.capexEurPerKwh, language, 0)} €/kWh, round-trip efficiency ${formatQuantity(plan.assumptions.roundTripEfficiency * 100, language, 0)}%, lifetime ${HAMBURG_SUPERMARKET.lifetimeYears} years.`)}</li>
            <li><GlossaryTip id="capex" language={language} /> {tx("Keine Euro-Zahl außerhalb dieses Blocks. Kein Angebot.", "No euro figure outside this block. Not a quote.")}</li>
          </ul>
        </details>
      </div>
    </section>
  );
}

function CsvZone({
  language,
  missingLimit,
  onFile,
  limitDraft,
  onLimit,
}: {
  language: AppLanguage;
  missingLimit: boolean;
  onFile: (text: string) => void;
  limitDraft: string;
  onLimit: (value: string) => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <section className="day-paper" id="csv-drop" aria-labelledby="csv-title">
      <div className="day-hero-inner site-csv">
        <div className="site-empty" aria-hidden="true">
          <svg viewBox="-120 -120 240 240" width="180" height="180">
            <circle cx="0" cy="0" r="96" fill="none" stroke="#C5CED6" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <h2 id="csv-title">{missingLimit ? tx("Anschlussleistung fehlt.", "Connection capacity is missing.") : tx("Noch kein Lastprofil.", "No load profile yet.")}</h2>
          <p>{tx("CSV · 15-min oder 60-min · kW oder kWh · max 10 MB. Ohne Anschlussleistung bleibt die Ampel grau und die Grenze unsichtbar.", "CSV · 15-min or 60-min · kW or kWh · max 10 MB. Without a connection capacity the light stays grey and the limit stays hidden.")}</p>
          <label>
            {tx("Anschluss kW", "Connection kW")}
            <input inputMode="decimal" value={limitDraft} onChange={(event) => onLimit(event.target.value)} />
          </label>
          <label className="day-cta">
            {tx("CSV hochladen", "Upload CSV")}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file.text().then(onFile);
              }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

function ExampleCards({ language, view, scenario }: { language: AppLanguage; view: Perspective; scenario: ScenarioId }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const cards: Array<{ id: ScenarioId; kicker: string; title: string; body: string }> = [
    { id: "supermarkt", kicker: tx("Beispieldaten", "Example data"), title: tx("Supermarkt", "Supermarket"), body: tx("Fiktives Profil. Bleibt der Anschluss unter der Grenze?", "Fictional profile. Does the connection stay under the limit?") },
    { id: "quartier", kicker: tx("Beispieldaten", "Example data"), title: tx("Quartier", "Neighbourhood"), body: tx("150 Haushalte. Hält die Ortsnetzstation ihre Planleistung?", "150 households. Does the local substation hold its planning rating?") },
    { id: "grossspeicher", kicker: tx("Öffentliche Eckdaten", "Public key figures"), title: tx("Großspeicher Bollingstedt", "Bollingstedt large storage"), body: tx("Schleswig-Holstein. Modelltag, nicht die echte Fahrweise.", "Schleswig-Holstein. Model day, not the real operation.") },
  ];
  return (
    <section className="day-paper">
      <div className="day-hero-inner">
        <h2>{tx("Beispiele", "Examples")}</h2>
        <ul className="site-examples">
          {cards.map((card) => (
            <li key={card.id}>
              <Link href={sitePath(view, card.id)} aria-current={scenario === card.id ? "page" : undefined}>
                <span className="day-kicker">{card.kicker}</span>
                <span className="site-example-title">{card.title}</span>
                <span>{card.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PdfLink({ view, language, plan, profile }: { view: Perspective; language: AppLanguage; plan: SitePlan; profile: LoadProfile }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="day-textlink"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void (async () => {
          try {
            const { pdf } = await import("@react-pdf/renderer");
            const { SiteProposalDocument } = await import("@/components/site/SiteProposalDocument");
            const kind = view === "netz" ? "connection" : "offer";
            const blob = await pdf(<SiteProposalDocument plan={plan} profile={profile} language={language} enteredVoltage={plan.voltageSuggestion.level} kind={kind} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = kind === "connection" ? "speicherpilot-anschlusspruefung.pdf" : "speicherpilot-angebot.pdf";
            link.click();
            URL.revokeObjectURL(url);
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {view === "netz" ? tx("Anschlussprüfung als PDF", "Connection check as PDF") : tx("Angebot als PDF", "Proposal as PDF")}
    </button>
  );
}

function toRing(points: ConnectionPoint[]): LiveDispatchPoint[] {
  return points.map((point) => ({
    hour: point.hour,
    ohneMw: point.ohneKw,
    mitMw: point.mitKw,
    chargeMw: point.chargeKw,
    dischargeMw: point.dischargeKw,
    soc: point.soc,
  }));
}

function clock(hour: number): string {
  const total = Math.round(hour * 60);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}
