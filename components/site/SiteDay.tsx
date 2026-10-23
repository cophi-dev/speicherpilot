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
import { connectionLight } from "@/lib/connectionLight";
import { FLOWER_BERGEDORF } from "@/lib/flowerBergedorf";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import { HAMBURG_SUPERMARKET, hamburgSupermarketProfile, planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { parsePerspective, parseScenario, sitePath, type Perspective, type ScenarioId } from "@/lib/perspective";
import { QUARTIER, planQuartier, quartierProfile } from "@/lib/quartierExample";
import { middayMeanKw, storyFromPlan, supermarketConnectionStory, type ConnectionPoint, type SiteConnectionStory } from "@/lib/siteConnectionDay";
import { parseLoadProfileCsv, planSite, type LoadProfile, type SitePlan } from "@/lib/sitePlanner";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

export function SiteDay() {
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
        <FlowerHero language={language} />
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
              center={
                netz ? (
                  <span className="num site-center-lock">{peak} → {limit} kW</span>
                ) : (
                  <span className="num">{energy}<small> kWh</small></span>
                )
              }
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
  const end = clock(last.hour + 0.25);
  const limitPoint = story.points.find((point) => point.hour >= 9 && point.hour < 10) ?? story.points[0];
  const middayPoint = story.points.find((point) => point.hour >= 13 && point.hour < 13.25)
    ?? story.points.find((point) => point.hour >= 12 && point.hour < 14)
    ?? story.points[0];
  const covered = netz
    ? tx(`${clock(first.hour)}–${end} über der Grenze`, `${clock(first.hour)}–${end} over the limit`)
    : tx("vom Speicher gedeckt", "covered by storage");
  const middayValue = middayMeanKw(story.points) ?? middayPoint.ohneKw;
  const middayKw = formatQuantity(Math.abs(middayValue), language, 1);
  const midday = middayValue < -0.05
    ? tx(`Mittel 12–14 Uhr: ${middayKw} kW Rückspeisung`, `Mean 12:00–14:00: ${middayKw} kW export`)
    : tx(`Mittel 12–14 Uhr: ${middayKw} kW Bezug`, `Mean 12:00–14:00: ${middayKw} kW import`);
  return [
    { id: "evening", n: 1, point: toRing([first])[0], text: covered },
    { id: "night", n: 2, point: toRing([limitPoint])[0], text: tx(`Anschluss ${formatQuantity(story.limitKw, language, 0)} kW`, `Connection ${formatQuantity(story.limitKw, language, 0)} kW`) },
    { id: "midday", n: 3, point: toRing([middayPoint])[0], text: midday },
  ];
}

function FlowerHero({ language }: { language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const facts = FLOWER_BERGEDORF;
  return (
    <section className="day-hero site-hero" aria-labelledby="site-hero-title">
      <div className="day-hero-inner">
        <div className="site-hero-grid">
          <div>
            <p className="day-kicker">{tx("Standort · öffentliche Referenz", "Site · public reference")} <span className="site-chip site-chip-public">{tx("Öffentliche Eckdaten", "Public key figures")}</span></p>
            <h1 id="site-hero-title">{tx("Für Flower ist kein Tagesverlauf veröffentlicht. Der Ring bleibt leer.", "Flower has published no daily profile. The ring stays empty.")}</h1>
            <dl className="site-facts">
              <FlowerFact label={tx("Leistung", "Power")} value={`${formatQuantity(facts.powerMw, language, 0)} MW`} href={facts.sources[0].href} source={facts.sources[0].publisher} />
              <FlowerFact label={tx("Energie", "Energy")} value={`${formatQuantity(facts.energyMwh, language, 0)} MWh`} href={facts.sources[0].href} source={facts.sources[0].publisher} />
              <FlowerFact label={tx("Ort", "Place")} value={language === "de" ? facts.placeDe : facts.placeEn} href={facts.sources[1].href} source={facts.sources[1].publisher} />
            </dl>
            <p className="site-quiet">{tx("Keine Spannung, kein Anschluss, kein Erlös. Was die Quellen nicht nennen, steht hier nicht.", "No voltage, no connection, no revenue. What the sources do not state is not shown here.")}</p>
          </div>
          <div className="site-flower-ring">
            <DayRing points={[]} unit="kW" scale="utilisation" mode="netz" empty showHourTicks={false} label={tx("Leerer Ring", "Empty ring")} description={tx("Kein veröffentlichter Tagesverlauf.", "No published daily profile.")} showSoc={false} showFlow={false} showShift={false} />
            <p className="site-flower-note">{tx("nur öffentliche Eckdaten", "public key figures only")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowerFact({ label, value, href, source }: { label: string; value: string; href: string; source: string }) {
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
  const noDischarge = story.dischargedKwh <= 1e-6;
  const sharePct = Math.round(story.badge.dischargeShare * 100);
  const met = story.badge.met;
  return (
    <section className="day-paper" aria-labelledby="site-support">
      <div className="day-hero-inner site-split">
        <article className="site-card">
          <p className="day-kicker">{tx("Einschätzung netzdienlich v1", "Grid-support estimate v1")}</p>
          <h2 id="site-support">{tx("Anteil der Entladung in der Spitze", "Share of discharge in the peak")}</h2>
          {noDischarge ? (
            <p className="site-meter-empty">{tx("keine Entladung in der Spitze", "no discharge in the peak")}</p>
          ) : (
            <div className="site-meter">
              <div className="site-meter-top">
                <div
                  className="site-meter-track"
                  role="img"
                  aria-label={tx(`${sharePct} Prozent der Entladung in der Spitze`, `${sharePct} percent of discharge in the peak`)}
                >
                  <span className="site-meter-clip" style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}>
                    <span className="site-meter-fill" />
                  </span>
                  <span className="site-meter-mark" />
                  <span className="site-meter-threshold">60 %</span>
                </div>
                <p className="num site-meter-value">{formatQuantity(sharePct, language, 0)} %</p>
              </div>
              <p className={met ? "site-pill is-met" : "site-pill"}>
                {met ? tx("netzdienlich (Schätzung)", "grid-supportive (estimate)") : tx("nicht netzdienlich", "not grid-supportive")}
              </p>
            </div>
          )}
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
            <li><GlossaryTip id="capex" language={language} /> {tx("Euro-Beträge sind Modellschätzungen mit Beispielannahmen (z. B. Leistungspreis 120 €/kW·a) und als solche gekennzeichnet.", "Euro amounts are model estimates with example assumptions (for example a demand charge of 120 €/kW·a) and are labelled as such.")}</li>
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
    { id: "grossspeicher", kicker: tx("Öffentliche Eckdaten", "Public key figures"), title: tx("Großspeicher Flower", "Flower large storage"), body: tx("Bergedorf. Kein Tagesverlauf, nur veröffentlichte Zahlen.", "Bergedorf. No daily profile, only published figures.") },
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
      className="day-textlink tap-44"
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
