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
import { REFERENCE_PARK_DISPATCH_RULE, referenceParkFullDrawKw, type ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import { REFERENCE_PARK, referenceParkCRate, referenceParkHoursAtFullPower } from "@/lib/referencePark";
import { HAMBURG_SUPERMARKET, hamburgSupermarketProfile, planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { parsePerspective, parseScenario, sitePath, type Perspective, type ScenarioId } from "@/lib/perspective";
import { QUARTIER, planQuartier, quartierProfile } from "@/lib/quartierExample";
import { storyFromPlan, supermarketConnectionStory, type ConnectionPoint, type SiteConnectionStory } from "@/lib/siteConnectionDay";
import { parseLoadProfileCsv, planSite, type LoadProfile, type SitePlan } from "@/lib/sitePlanner";
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
  return (
    <section className="day-hero site-hero" aria-labelledby="site-hero-title">
      <div className="day-hero-inner">
        <PerspectiveToggle view={view} scenario="grossspeicher" language={language} />
        <div className="site-hero-grid site-model-grid">
          <div>
            <p className="day-kicker">{tx("Standort · öffentliche Referenz", "Site · public reference")} <span className="site-chip site-chip-public">{tx("Öffentliche Eckdaten", "Public key figures")}</span></p>
            <h1 id="site-hero-title">{tx("Großspeicher Bollingstedt am Hochspannungsnetz.", "Bollingstedt large storage on the high-voltage grid.")}</h1>
            <dl className="site-facts">
              <ReferenceParkFact label={tx("Leistung", "Power")} value={`${figure} MW`} href={facts.mastrUnits[0].href} source={`MaStR ${facts.mastrUnits[0].seeId}`} />
              <ReferenceParkFact label={tx("Inhalt", "Energy")} value={`${formatQuantity(facts.energyMwh, language, 1)} MWh`} href={facts.mastrUnits[1].href} source={`MaStR ${facts.mastrUnits[1].seeId}`} />
              <ReferenceParkFact label={tx("Volle Leistung", "Full power")} value={`${formatQuantity(hours, language, 1)} h`} href={facts.sources[2].href} source={facts.sources[2].publisher} />
            </dl>
            <ul className="site-model-facts">
              <li>{tx(`${facts.placeDe}, ${facts.districtDe} (${facts.state}). ${facts.project}.`, `${facts.placeEn}, ${facts.districtEn} (${facts.state}). ${facts.project}.`)}</li>
              <li>{tx(`Hochspannung (${facts.voltageKv} kV), Anschluss bei ${facts.gridOperator}.`, `High voltage (${facts.voltageKv} kV), connected to ${facts.gridOperator}.`)}</li>
              <li>{tx("In Betrieb seit 2025 (MaStR: 13.03.2025).", "In operation since 2025 (MaStR: 13 March 2025).")}</li>
              <li>{tx(`Betreiber ${facts.operator}. Eigentümer ${facts.owner} seit 25.08.2026.`, `Operator ${facts.operator}. Owner ${facts.owner} since 25 August 2026.`)}</li>
              <li>{tx(`Die Betreiber-Meldung nennt ${facts.operatorEnergyMwh} MWh. C-Rate ${formatQuantity(cRate, language, 2)}.`, `The operator’s release says ${facts.operatorEnergyMwh} MWh. C-rate ${formatQuantity(cRate, language, 2)}.`)}</li>
              <li className="flex flex-wrap items-center gap-2">
                {tx("Bezug und Einspeisung sind dynamisch begrenzt. Die Grenzwerte sind nicht veröffentlicht.", "Withdrawal and feed-in are limited dynamically. The limits are not published.")}
                <GlossaryTip id="fca" language={language} />
              </li>
            </ul>
            <p className="site-quiet">
              {modelDay
                ? tx(`Gebotszone DE-LU, Liefertag ${germanDate(modelDay.dateBerlin)}.`, `DE-LU bidding zone, delivery day ${germanDate(modelDay.dateBerlin)}.`)
                : tx("Der Day-Ahead-Preis von gestern ist gerade nicht geladen. Der Ring hat dann keinen Verlauf.", "Yesterday’s day-ahead price is not loaded right now. The ring then has no profile.")}
            </p>
            <p className="site-quiet">
              {tx(
                `Annahme: Wirkungsgrad ${formatQuantity(efficiency * 100, language, 0)} %, Ladezustand von ${formatQuantity(socMin * 100, language, 0)} % bis ${formatQuantity(socMax * 100, language, 0)} %, Start bei ${formatQuantity(socStart * 100, language, 0)} %.`,
                `Assumption: round-trip efficiency ${formatQuantity(efficiency * 100, language, 0)}%, state of charge from ${formatQuantity(socMin * 100, language, 0)}% to ${formatQuantity(socMax * 100, language, 0)}%, start at ${formatQuantity(socStart * 100, language, 0)}%.`
              )}{" "}
              <a href="/methodik#modelltag">{tx("Rechnung in der Methodik", "Calculation in the method")}</a>
            </p>
            <p className="site-quiet">
              <a href={facts.dashboardHref}>{tx("echte Fahrweise beim Betreiber", "real operation at the operator")}</a>
              {" · "}
              <a href={facts.sources[3].href}>SH Netz</a>
            </p>
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
              <table className="day-sr">
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
            ) : null}
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

function ReferenceParkFact({ label, value, href, source }: { label: string; value: string; href: string; source: string }) {
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
