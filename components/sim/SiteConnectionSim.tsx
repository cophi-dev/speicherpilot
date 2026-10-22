"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useLanguage, type AppLanguage } from "@/components/language-context";
import { DispatchDayChart, niceChartScale, SimLegend, type ChartAnnotation, type ChartSample } from "@/components/sim/DispatchDayChart";
import { formatQuantity } from "@/lib/formatQuantity";
import { sitePath, type Perspective } from "@/lib/perspective";
import type { SiteConnectionStory } from "@/lib/siteConnectionDay";
import { supermarketConnectionStory } from "@/lib/siteConnectionDay";

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

function energyLabel(value: number, language: AppLanguage) {
  const digits = Math.abs(value) >= 10 ? 0 : 1;
  return formatQuantity(value, language, digits);
}

export function SiteConnectionSim({ view }: { view: Perspective }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const story = useMemo(() => supermarketConnectionStory(), []);
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [intro, setIntro] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const node = sectionRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || played.current) {
        return;
      }
      played.current = true;
      setIntro(true);
      observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!intro) {
      return;
    }
    const handle = window.setTimeout(() => setIntro(false), 1800);
    return () => window.clearTimeout(handle);
  }, [intro]);

  const samples: ChartSample[] = story.points.map((point) => ({
    hour: point.hour,
    ohne: point.ohneKw,
    mit: point.mitKw,
    charge: point.chargeKw,
    discharge: point.dischargeKw,
    soc: point.soc,
  }));
  const scale = useMemo(() => {
    const values = [0, story.limitKw];
    for (const point of story.points) {
      values.push(point.ohneKw, point.mitKw, point.dischargeKw, -point.chargeKw);
    }
    return niceChartScale(values);
  }, [story]);
  const scaleMax = Math.max(130, (story.peakBeforeKw / story.limitKw) * 100, (story.peakAfterKw / story.limitKw) * 100);
  const ohneLeft = (story.peakBeforeKw / story.limitKw) * 100 / scaleMax * 100;
  const mitLeft = (story.peakAfterKw / story.limitKw) * 100 / scaleMax * 100;
  const limitLeft = (100 / scaleMax) * 100;
  const arrowLeft = Math.min(ohneLeft, mitLeft);
  const arrowWidth = Math.abs(ohneLeft - mitLeft);
  const deltaKw = story.peakAfterKw - story.peakBeforeKw;
  const sharePct = story.badge.dischargeShare * 100;
  const discharged = `${energyLabel(story.dischargedKwh, language)} kWh ${tx("entladen", "discharged")}`;
  const chargedNote =
    story.chargedKwh > 0
      ? tx(
          `Geladen ${energyLabel(story.chargedKwh, language)} kWh einschließlich Verluste. Wirkungsgrad ${formatQuantity(story.rte * 100, language, 0)} % (Annahme).`,
          `Charged ${energyLabel(story.chargedKwh, language)} kWh including losses. Round-trip efficiency ${formatQuantity(story.rte * 100, language, 0)}% (assumption).`
        )
      : tx(
          `An diesem Spitzentag wird ${energyLabel(story.chargedKwh, language)} kWh geladen. Die Verluste sitzen im Wirkungsgrad von ${formatQuantity(story.rte * 100, language, 0)} % (Annahme).`,
          `This peak day charges ${energyLabel(story.chargedKwh, language)} kWh. Losses sit in the ${formatQuantity(story.rte * 100, language, 0)}% round-trip efficiency (assumption).`
        );

  return (
    <section ref={sectionRef} aria-labelledby="site-connection-day">
      <p className="sim-kicker">{tx("Standort · Simulation am Netzanschluss", "Site · connection simulation")}</p>
      <h1 id="site-connection-day" className="sim-h1">
        {tx("Ein Speicher am Netzanschluss, einen Tag lang", "One battery on a connection, for one day")}
      </h1>
      <p className="sim-lead">
        {tx(
          "Die rote Linie ist die Grenze des Anschlusses. Der Speicher lädt, wenn die Leitung Luft hat, und hilft, wenn es eng wird.",
          "The red line is the connection limit. The battery charges when the line has room, and helps when it is tight."
        )}
      </p>
      <div className="sim-seg" role="group" aria-label={tx("Perspektive", "Perspective")}>
        <Link href={sitePath("projekt", "supermarkt")} aria-current={view === "projekt" ? "page" : undefined} className={view === "projekt" ? "on" : undefined}>
          {tx("Entwickler", "Developer")} <em>{tx("Größe · Spitze", "Size · peak")}</em>
        </Link>
        <Link href={sitePath("netz", "supermarkt")} aria-current={view === "netz" ? "page" : undefined} className={view === "netz" ? "on" : undefined}>
          {tx("Netzbetreiber", "Grid operator")} <em>{tx("Anschluss · Netzlast", "Connection · grid load")}</em>
        </Link>
      </div>
      <div className="sim-tabs">
        <span>{tx("Supermarkt", "Supermarket")}</span>
        <p>{tx("fiktives Beispiel · weitere Standorte erst mit öffentlichen Daten", "fictional example · further sites wait for public data")}</p>
      </div>
      <div className="sim-tiles">
        <article className="sim-kpi">
          <p className="sim-kicker">{tx("Speicher", "Storage")}</p>
          <p className="sim-kpi-value">
            <span className="num">{formatQuantity(story.energyKwh, language, 0)}</span>
            <span className="unit">kWh</span>
          </p>
          <p className="sim-kpi-note">
            <span className="num">{formatQuantity(story.powerKw, language, 0)} kW</span> {tx("Leistung · Beispielgröße", "power · example size")}
          </p>
        </article>
        <article className="sim-kpi sim-scale-card">
          <p className="sim-kicker">{tx("Anschluss · Auslastung am Abend", "Connection · evening loading")}</p>
          <div className="sim-scale">
            <div className={`sim-arrow${deltaKw > 0 ? " up" : ""}`} style={{ left: `${arrowLeft}%`, width: `${arrowWidth}%` }}>
              <span className="num">
                {deltaKw > 0 ? "+" : "−"}
                {formatQuantity(Math.abs(deltaKw), language, Math.abs(deltaKw) >= 10 ? 0 : 1)} kW
              </span>
            </div>
            <div className="sim-track" />
            <div className="sim-lim" style={{ left: `${limitLeft}%` }} />
            <div className="sim-mark ohne" style={{ left: `${ohneLeft}%` }} title={tx("ohne Speicher", "without storage")} />
            <div className="sim-mark mit" style={{ left: `${mitLeft}%` }} title={tx("mit Speicher", "with storage")} />
            <span className="sim-scale-label num" style={{ left: 0 }}>
              0 %
            </span>
            <span className="sim-scale-label limit num" style={{ left: `${limitLeft}%` }}>
              100 % · {formatQuantity(story.limitKw, language, 0)} kW
            </span>
          </div>
          <p className="sim-scale-legend num">
            <span>
              <i className="dot hollow" aria-hidden="true" />
              {tx("ohne Speicher", "without storage")} {formatQuantity((story.peakBeforeKw / story.limitKw) * 100, language, 0)} % ({formatQuantity(story.peakBeforeKw, language, 0)} kW)
            </span>
            <span>
              <i className="dot solid" aria-hidden="true" />
              {tx("mit Speicher", "with storage")} {formatQuantity((story.peakAfterKw / story.limitKw) * 100, language, 0)} % ({formatQuantity(story.peakAfterKw, language, 0)} kW)
            </span>
          </p>
        </article>
        <article className="sim-kpi">
          <p className="sim-kicker">{tx("Netzdienlichkeit", "Grid support")}</p>
          <p className="mt-2">
            <a className="sim-badge" href="/methodik#netzdienlichkeit">
              {story.badge.label}
              <b>v1</b>
            </a>
          </p>
          <p className="sim-kpi-note">
            <span className="num">{formatQuantity(sharePct, language, sharePct >= 10 ? 0 : 1)} %</span>{" "}
            {tx("der Entladung in Spitzenfenstern", "of discharge in peak windows")}
            {story.badge.createsNewPeak
              ? tx(" · neue Spitze", " · new peak")
              : tx(" · keine neue Spitze", " · no new peak")}
          </p>
        </article>
      </div>
      <div className="sim-split">
        <div className="sim-card">
          <div className="sim-cardhead">
            <p className="sim-kicker">{tx("Netzbezug · ¼h · Beispieltag", "Grid import · ¼h · example day")}</p>
            <span className="sim-chip">MODELL</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold">
            {tx("Was in den Speicher geht, kappt abends die Spitze", "What goes into storage cuts the evening peak")}
          </h2>
          <SimLegend
            items={[
              { swatch: "ohne", label: tx("Last ohne Speicher", "Load without storage") },
              { swatch: "mit", label: tx("Netzbezug mit Speicher", "Import with storage") },
              { swatch: "limit", label: tx("Netzanschluss", "Connection") },
              { swatch: "charge", label: tx("lädt", "charging") },
              { swatch: "discharge", label: tx("entlädt", "discharging") },
              { swatch: "hatch-limit", label: tx("über dem Anschluss", "above the connection") },
            ]}
          />
          <DispatchDayChart
            samples={samples}
            unit="kW"
            y0={scale.y0}
            y1={scale.y1}
            yTicks={scale.yTicks}
            hatch="limit"
            limit={story.limitKw}
            limitLabel={`${tx("Netzanschluss", "Connection")} ${formatQuantity(story.limitKw, language, 0)} kW`}
            tipLoad={tx("Last", "Load")}
            ariaLabel={tx(
              `Netzbezug eines fiktiven Supermarkts mit und ohne Speicher. Spitze ${formatQuantity(story.peakBeforeKw, language, 0)} auf ${formatQuantity(story.peakAfterKw, language, 0)} kW. Abgegeben ${energyLabel(story.dischargedKwh, language)} kWh. Modellschätzung, Beispieldaten.`,
              `Grid import of a fictional supermarket with and without storage. Peak ${formatQuantity(story.peakBeforeKw, language, 0)} to ${formatQuantity(story.peakAfterKw, language, 0)} kW. Discharged ${energyLabel(story.dischargedKwh, language)} kWh. Model estimate, example data.`
            )}
            tag={tx("BEISPIELDATEN · MODELL", "EXAMPLE DATA · MODEL")}
            annotations={siteNotes(story, samples, discharged, language)}
            chargedNote={chargedNote}
            intro={intro && !reduced}
            language={language}
          />
          <p className="sim-src">
            <span className="sim-chip">MODELL</span>{" "}
            {tx(
              `Modellschätzung · Beispieldaten · fiktiver Supermarkt · Wirkungsgrad ${formatQuantity(story.rte * 100, language, 0)} % (Annahme). Dieselbe Tagesrechnung wie auf der Startseite: Start voll, Nachladen ab 19:30 mit höchstens 15 kW.`,
              `Model estimate · example data · fictional supermarket · round-trip efficiency ${formatQuantity(story.rte * 100, language, 0)}% (assumption). The same day as the homepage: starts full, recharges from 19:30 at 15 kW at most.`
            )}
          </p>
        </div>
        <aside className="sim-card">
          {view === "netz" ? <GridCopy story={story} language={language} /> : <DeveloperCopy story={story} language={language} />}
        </aside>
      </div>
    </section>
  );
}

function GridCopy({ story, language }: { story: SiteConnectionStory; language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const pct = formatQuantity((story.peakBeforeKw / story.limitKw) * 100, language, 0);
  const hours = formatQuantity(story.hoursOverLimit, language, story.hoursOverLimit >= 10 ? 0 : 1);
  const holds = story.peakAfterKw <= story.limitKw + 0.05;
  return (
    <>
      <p className="sim-kicker">{tx("Aus Sicht des Netzbetreibers", "From the grid operator’s view")}</p>
      <dl className="sim-copy">
        <dt>{tx("Anschlussauslastung", "Connection loading")}</dt>
        <dd>
          {tx(
            `Ohne Speicher bräuchte der Markt am Abend bis zu ${pct} % seines Anschlusses, rund ${hours} Stunden lang.`,
            `Without storage the market would need up to ${pct}% of its connection in the evening, for about ${hours} hours.`
          )}
        </dd>
        <dt>{tx("Engpass", "Tight spot")}</dt>
        <dd>
          {holds
            ? tx(
                `Mit Speicher bleibt der Bezug bei höchstens ${formatQuantity(story.peakAfterKw, language, 0)} kW. In diesem Beispiel reicht der Anschluss ohne Verstärkung.`,
                `With storage, import stays at ${formatQuantity(story.peakAfterKw, language, 0)} kW at most. In this example the connection is enough without reinforcement.`
              )
            : tx(
                `Mit Speicher bleibt der Bezug bei höchstens ${formatQuantity(story.peakAfterKw, language, 0)} kW. Das liegt weiter über der Grenze von ${formatQuantity(story.limitKw, language, 0)} kW.`,
                `With storage, import stays at ${formatQuantity(story.peakAfterKw, language, 0)} kW at most. That is still above the ${formatQuantity(story.limitKw, language, 0)} kW limit.`
              )}
        </dd>
        <dt>{story.badge.createsNewPeak ? tx("Neue Spitze", "New peak") : tx("Keine neue Spitze", "No new peak")}</dt>
        <dd>
          {story.badge.createsNewPeak
            ? tx(
                "Beim Laden entsteht eine neue Bezugsspitze. Die Marke bleibt deshalb neutral bei nicht erfüllt.",
                "Charging creates a new import peak. The badge therefore stays neutral at not met."
              )
            : tx(
                "Geladen wird, wenn die Leitung Luft hat. Dabei entsteht keine neue Spitze.",
                "Charging happens when the line has room. That creates no new peak."
              )}
        </dd>
      </dl>
      <a className="sim-method" href="/methodik#netzdienlichkeit">
        {tx("Wie netzdienlich v1 berechnet wird", "How grid-support v1 is calculated")}
      </a>
    </>
  );
}

function DeveloperCopy({ story, language }: { story: SiteConnectionStory; language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <>
      <p className="sim-kicker">{tx("Aus Sicht des Entwicklers", "From the developer’s view")}</p>
      <dl className="sim-copy">
        <dt>{tx("Größe", "Size")}</dt>
        <dd>
          {tx(
            `${formatQuantity(story.energyKwh, language, 0)} kWh Energie und ${formatQuantity(story.powerKw, language, 0)} kW Leistung. Das ist die Beispielgröße.`,
            `${formatQuantity(story.energyKwh, language, 0)} kWh of energy and ${formatQuantity(story.powerKw, language, 0)} kW of power. That is the example size.`
          )}
        </dd>
        <dt>{tx("Spitze", "Peak")}</dt>
        <dd>
          {tx(
            `Ohne Speicher ${formatQuantity(story.peakBeforeKw, language, 0)} kW, mit Speicher ${formatQuantity(story.peakAfterKw, language, 0)} kW.`,
            `${formatQuantity(story.peakBeforeKw, language, 0)} kW without storage, ${formatQuantity(story.peakAfterKw, language, 0)} kW with storage.`
          )}
        </dd>
        <dt>{tx("Anschluss", "Connection")}</dt>
        <dd>
          {tx(
            `Die Grenze des Beispiels liegt bei ${formatQuantity(story.limitKw, language, 0)} kW.`,
            `The example limit is ${formatQuantity(story.limitKw, language, 0)} kW.`
          )}
        </dd>
        <dt>{tx("Erlös", "Revenue")}</dt>
        <dd>
          {tx(
            "Die gesenkte Spitze mindert den Leistungspreis des Beispiels. Diese Simulation nennt keine Euro-Zahl. Die Projektierung darunter rechnet das Modell weiter.",
            "The lower peak reduces the example’s demand charge. This simulation states no euro figure. The project view below continues the model."
          )}
        </dd>
      </dl>
      <a className="sim-method" href="/methodik#beispiele">
        {tx("Annahmen zum Beispiel-Supermarkt", "Assumptions for the example supermarket")}
      </a>
    </>
  );
}

function siteNotes(story: SiteConnectionStory, samples: ChartSample[], discharged: string, language: AppLanguage): ChartAnnotation[] {
  const notes: ChartAnnotation[] = [];
  let peak = 0;
  samples.forEach((sample, index) => {
    if (sample.ohne > samples[peak].ohne) {
      peak = index;
    }
  });
  const peakSample = samples[peak];
  if (peakSample) {
    notes.push({
      hour: peakSample.hour + 0.125,
      value: peakSample.ohne,
      text: `${formatQuantity(peakSample.ohne, language, 0)} kW ${language === "de" ? "ohne Speicher" : "without storage"}`,
      anchor: "middle",
      dy: -8,
      mdx: -16,
      mdy: -10,
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
    const mid = peakSample ? (peakSample.ohne + story.limitKw) / 2 : samples[lastDischarge].mit;
    notes.push({
      hour: samples[lastDischarge].hour + 0.25,
      value: mid,
      text: discharged,
      dx: 8,
      mdx: 12,
      strong: true,
    });
  }
  if (maxCharge >= 0 && maxChargeValue > 0.001) {
    notes.push({
      hour: samples[maxCharge].hour + 0.125,
      value: -maxChargeValue,
      text: discharged,
      anchor: "middle",
      dy: 16,
      mdy: 14,
      strong: true,
    });
  }
  return notes;
}
