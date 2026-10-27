"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type KeyboardEvent } from "react";

import { ExampleDayChart } from "@/components/home/ExampleDayChart";
import { GlossaryTip } from "@/components/GlossaryTip";
import { ModelChip } from "@/components/day-ring/ModelChip";
import { MonoNumber } from "@/components/day-ring/MonoNumber";
import { StatTrio } from "@/components/day-ring/StatTrio";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import {
  BEISPIEL_SCALES,
  beispieltagByDate,
  beispieltage,
  breakdownText,
  comparisonText,
  displayEuro,
  factorVersusMedian,
  formatModelEuro,
  HINTS,
  liveResultLabel,
  scaleKey,
  scaleSizeLabel,
  thousandsLabel,
  berlinClock,
  type BeispielScale,
} from "@/lib/beispieltage";
import type { Beispieltag } from "@/lib/beispieltageSchema";
import { formatQuantity } from "@/lib/formatQuantity";

const FILE = beispieltage;
const MAX_X1 = Math.max(...FILE.days.map((day) => day.revenueEur.x1));

export function ExampleDays() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("beispieltag");
  const resolved = beispieltagByDate(param, FILE).dateBerlin;
  const [picked, setPicked] = useState<string | null>(null);
  const [paramSeen, setParamSeen] = useState(param);
  if (param !== paramSeen) {
    setParamSeen(param);
    setPicked(null);
  }
  const [scale, setScale] = useState<BeispielScale>(1);
  const day = beispieltagByDate(picked ?? resolved, FILE);

  function chooseDay(next: string) {
    setPicked(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("beispieltag", next);
    router.replace(`/?${params.toString()}#beispieltage`, { scroll: false });
  }

  const revenue = day.revenueEur[scaleKey(scale)];
  const shown = formatModelEuro(displayEuro(revenue, scale), language);
  const medianDay = FILE.days.find((item) => item.role === "median") ?? FILE.days[3];

  return (
    <section id="beispieltage" className="day-paper beispieltage" aria-labelledby="beispieltage-title">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="beispieltage-title">
            {tx("Tage, an denen ein Speicher viel gebracht hätte", "Days when a battery would have done a lot")}
          </h2>
          <ModelChip label={tx("Modellschätzung · Beispieltage", "Model estimate · example days")} />
        </div>
        <p className="beispieltage-lead">
          {tx(
            "Vier echte Tage aus den letzten zwölf Monaten. Ein Speicher in der Größe des ",
            "Four real days from the last twelve months. A battery the size of the "
          )}
          <GlossaryTip id="grossspeicher" language={language} />{" "}
          {tx("Großspeichers Bollingstedt fährt gegen die ", "Bollingstedt large storage trades against the ")}
          <GlossaryTip id="day-ahead-price" language={language} />{" "}
          {tx(
            "Day-Ahead-Preise dieser Tage. Das ist eine Rechnung im Modell und keine Abrechnung.",
            "day-ahead prices of these days. This is a model calculation, not a bill."
          )}
        </p>

        <DayCards day={day} language={language} onChoose={chooseDay} />
        <ExampleDayChart day={day} language={language} />

        <div className="beispieltage-result" data-model-estimate>
          <div className="flex flex-wrap items-center gap-2">
            <h3>{tx("Modellerlös an diesem Tag", "Model revenue on this day")}</h3>
            <ModelChip label={tx("Modellschätzung", "Model estimate")} />
          </div>
          <div className="beispieltage-result-row">
            <p className="beispieltage-euro">
              <span className="beispieltage-approx">≈</span>{" "}
              <MonoNumber value={shown} />
              <span> €</span>
              {scale >= 5 ? <span className="beispieltage-note"> {tx("(rechnerisch)", "(arithmetic)")}</span> : null}
            </p>
            <ScalePicker scale={scale} language={language} onChoose={setScale} />
          </div>
          <p className="beispieltage-size">
            {scaleSizeLabel(scale, language, FILE.park.powerMw, FILE.park.energyMwh)}
            {". "}
            {tx("Die Fahrweise bleibt gleich. Nur die Mengen wachsen.", "The dispatch stays the same. Only the amounts grow.")}
          </p>
          <p>
            {breakdownText(day, scale, language)}
            {day.parts.chargingEur > 0 ? null : (
              <>
                {" "}
                <GlossaryTip id="preisspanne" language={language} />
              </>
            )}
          </p>
          <StatTrio
            items={[
              {
                value: formatQuantity(day.stats.spreadEurPerMwh, language, 0),
                unit: "€/MWh",
                label: tx("Preisspanne des Tages", "Price spread of the day"),
              },
              {
                value: formatQuantity(day.chargedFromGridMwh * scale, language, 1),
                unit: "MWh",
                label: tx("geladene Menge", "energy charged"),
              },
              {
                value: formatQuantity(day.dischargedToGridMwh * scale, language, 1),
                unit: "MWh",
                label: tx("abgegebene Menge", "energy discharged"),
              },
            ]}
          />
        </div>

        <div className="beispieltage-compare" data-model-estimate>
          <CompareBars day={day} median={medianDay} language={language} />
          <p>{comparisonText(day, scale, FILE, language)}</p>
        </div>
        <p className="beispieltage-rule">{language === "de" ? FILE.selectionRule.de : FILE.selectionRule.en}</p>
        {FILE.counterExample ? (
          <p className="beispieltage-quiet" data-model-estimate>
            {language === "de" ? FILE.counterExample.textDe : FILE.counterExample.textEn}{" "}
            <span className="beispieltage-chip-inline">{tx("Modellschätzung", "Model estimate")}</span>
          </p>
        ) : null}

        <ul className="beispieltage-hints">
          {HINTS.map((hint) => (
            <li key={hint.de}>
              {hint.tips.map((id) => (
                <GlossaryTip key={id} id={id} language={language} />
              ))}{" "}
              {language === "de" ? hint.de : hint.en}
            </li>
          ))}
        </ul>

        <details className="beispieltage-table">
          <summary>{tx(`Alle ${day.prices.length} Viertelstunden als Tabelle`, `All ${day.prices.length} quarter-hours as a table`)}</summary>
          <div data-model-estimate>
            <QuarterTable day={day} language={language} />
          </div>
        </details>

        <p className="beispieltage-source">
          {tx(
            `Daten: Energy-Charts (Bundesnetzagentur | SMARD.de, ${FILE.sources.prices.licence}), Day-Ahead DE-LU, Abruf 27.10.2026 · Modell: Repo-Kern, siehe Methodik. Beispieldaten.`,
            `Data: Energy-Charts (Bundesnetzagentur | SMARD.de, ${FILE.sources.prices.licence}), day-ahead DE-LU, retrieved 27 October 2026 · Model: repository core, see the method. Example data.`
          )}{" "}
          <Link href="/methodik#beispieltage">{tx("So ist gerechnet: Methodik", "How it is calculated: method")}</Link>
        </p>
        <p className="sr-only" aria-live="polite">
          {liveResultLabel(day, scale, language)}
        </p>
        <p className="sr-only">
          {tx(
            `Faktor zum mittleren Tag: ${formatQuantity(factorVersusMedian(day.revenueEur.x1, FILE.medianDayRevenueX1), language, 1)}.`,
            `Factor versus the middle day: ${formatQuantity(factorVersusMedian(day.revenueEur.x1, FILE.medianDayRevenueX1), language, 1)}.`
          )}
        </p>
      </div>
    </section>
  );
}

function DayCards({
  day,
  language,
  onChoose,
}: {
  day: Beispieltag;
  language: AppLanguage;
  onChoose: (dateBerlin: string) => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const label = tx("Tag wählen", "Choose a day");
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="beispieltage-cards"
      onKeyDown={(event) => moveRadio(event, FILE.days.map((item) => item.dateBerlin), day.dateBerlin, onChoose, "data-date")}
    >
      {FILE.days.map((item) => {
        const selected = item.dateBerlin === day.dateBerlin;
        const text = language === "de" ? item.textDe : item.textEn;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            data-date={item.dateBerlin}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`beispieltage-card${selected ? " is-selected" : ""}`}
            onClick={() => onChoose(item.dateBerlin)}
          >
            <span className="beispieltage-card-title">{text.title}</span>
            <span className="beispieltage-card-why">{text.why}</span>
            <span className="beispieltage-mini" aria-hidden="true">
              <span style={{ width: `${Math.max(8, (item.revenueEur.x1 / MAX_X1) * 100)}%` }} />
            </span>
            <span className="beispieltage-card-figure">{thousandsLabel(item.revenueEur.x1, language)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScalePicker({
  scale,
  language,
  onChoose,
}: {
  scale: BeispielScale;
  language: AppLanguage;
  onChoose: (scale: BeispielScale) => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div
      role="radiogroup"
      aria-label={tx("Anzahl Speicher wie Bollingstedt", "Number of batteries like Bollingstedt")}
      className="beispieltage-scales"
      onKeyDown={(event) => moveRadio(event, BEISPIEL_SCALES.map(String), String(scale), (value) => onChoose(Number(value) as BeispielScale), "data-scale")}
    >
      {BEISPIEL_SCALES.map((step) => {
        const selected = step === scale;
        return (
          <button
            key={step}
            type="button"
            role="radio"
            data-scale={step}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`beispieltage-scale${selected ? " is-selected" : ""}`}
            onClick={() => onChoose(step)}
          >
            ×{step}
          </button>
        );
      })}
    </div>
  );
}

function CompareBars({ day, median, language }: { day: Beispieltag; median: Beispieltag; language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const dayHeight = Math.max(6, (day.revenueEur.x1 / MAX_X1) * 48);
  const medianHeight = Math.max(6, (median.revenueEur.x1 / MAX_X1) * 48);
  return (
    <div
      className="beispieltage-bars"
      role="img"
      aria-label={tx("Dieser Tag gegen den normalen Tag, gleiche Skala", "This day against the ordinary day, same scale")}
    >
      <span>
        <i style={{ height: `${dayHeight}px` }} />
        {tx("dieser Tag", "this day")}
      </span>
      <span>
        <i className="is-median" style={{ height: `${medianHeight}px` }} />
        {tx("normaler Tag", "ordinary day")}
      </span>
    </div>
  );
}

function QuarterTable({ day, language }: { day: Beispieltag; language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const when = language === "de" ? day.textDe.title : day.textEn.title;
  return (
    <table>
      <caption>
        {tx(
          `Viertelstunden am ${when}. Preis in Euro je Megawattstunde, Leistung in Megawatt, minus ist Laden, Ladezustand in Prozent. Modellschätzung.`,
          `Quarter-hours on ${when}. Price in euro per megawatt-hour, power in megawatts, minus is charging, state of charge in percent. Model estimate.`
        )}
      </caption>
      <thead>
        <tr>
          <th scope="col">{tx("Zeit", "Time")}</th>
          <th scope="col">{tx("Preis €/MWh", "Price €/MWh")}</th>
          <th scope="col">{tx("Leistung MW", "Power MW")}</th>
          <th scope="col">{tx("Ladezustand %", "State of charge %")}</th>
        </tr>
      </thead>
      <tbody>
        {day.slotStartIso.map((iso, index) => (
          <tr key={iso}>
            <td>{berlinClock(iso)}</td>
            <td>{formatQuantity(day.prices[index] ?? 0, language, 2)}</td>
            <td>{formatQuantity(day.dispatch.powerMw[index] ?? 0, language, 1)}</td>
            <td>{formatQuantity(day.dispatch.socPct[index] ?? 0, language, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function moveRadio(
  event: KeyboardEvent<HTMLDivElement>,
  values: string[],
  current: string,
  onChoose: (value: string) => void,
  attribute: string
) {
  const index = Math.max(0, values.indexOf(current));
  let next = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    next = (index + 1) % values.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    next = (index - 1 + values.length) % values.length;
  } else if (event.key === "Home") {
    event.preventDefault();
    next = 0;
  } else if (event.key === "End") {
    event.preventDefault();
    next = values.length - 1;
  } else {
    return;
  }
  const value = values[next];
  if (!value) {
    return;
  }
  onChoose(value);
  event.currentTarget.querySelector<HTMLButtonElement>(`[${attribute}="${value}"]`)?.focus();
}
