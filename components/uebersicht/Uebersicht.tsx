"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { ModelChip } from "@/components/day-ring/ModelChip";
import { PerspectiveChoice } from "@/components/PerspectiveChoice";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import {
  DispatchDayChart,
  niceChartScale,
  SimLegend,
  type ChartSample,
} from "@/components/sim/DispatchDayChart";
import { UebersichtBarChart } from "@/components/uebersicht/UebersichtBarChart";
import { fleetEuroHiddenHint } from "@/lib/beispieltage";
import { formatQuarterlyCurtailmentGwh, SMARD_QUARTERLY_TOPIC_URL } from "@/lib/eeCurtailmentQuarterly";
import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewsBundle } from "@/lib/germanyView";
import type { OverviewQuarterPoint } from "@/lib/overviewChain";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { OVERVIEW_BLICKS, parseOverviewBlick, parseOverviewFactor, type OverviewBlick } from "@/lib/overviewRange";
import { einschaetzung } from "@/lib/overviewSentence";

const SOC_REST_TOOLTIP_DE =
  "Geladen und abgegeben sind nicht einfach 85 % voneinander: Am Zeitraumende bleibt Energie im Speicher (Rest). Entladen = (aufgenommen − Rest) × 85 %.";
const SOC_REST_TOOLTIP_EN =
  "Charged and discharged are not simply 85% of each other: energy stays in the battery at period end (remainder). Discharged = (absorbed − remainder) × 85%.";

function gwh(value: number | null | undefined, language: AppLanguage, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatQuantity(value, language, digits)} GWh`;
}

function formatBerlinDate(dateKey: string) {
  const parts = dateKey.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateKey;
}

function blickLabel(blick: OverviewBlick, language: AppLanguage) {
  const de: Record<OverviewBlick, string> = {
    heute: "Heute",
    gestern: "Gestern",
    "7tage": "7 Tage",
    "30tage": "30 Tage",
  };
  const en: Record<OverviewBlick, string> = {
    heute: "Today",
    gestern: "Yesterday",
    "7tage": "7 days",
    "30tage": "30 days",
  };
  return language === "de" ? de[blick] : en[blick];
}

function readInitialQuery() {
  if (typeof window === "undefined") {
    return { blick: "30tage" as OverviewBlick, factor: 1 as LiveDispatchFactor };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    blick: parseOverviewBlick(params.get("blick")),
    factor: parseOverviewFactor(params.get("x")) as LiveDispatchFactor,
  };
}

function syncHistory(blick: OverviewBlick, factor: LiveDispatchFactor) {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.set("blick", blick);
  params.set("x", String(factor));
  const query = params.toString();
  window.history.replaceState(null, "", query ? `/?${query}#uebersicht` : "/#uebersicht");
}

function quarterLabel(count: number, language: AppLanguage) {
  if (language === "de") {
    if (count === 1) {
      return "1 Viertelstunde fehlt";
    }
    return `${count} Viertelstunden fehlen`;
  }
  return count === 1 ? "1 quarter-hour missing" : `${count} quarter-hours missing`;
}

export function Uebersicht({ bundle, until }: { bundle: OverviewsBundle; until: string | null }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [blick, setBlick] = useState<OverviewBlick>(() => readInitialQuery().blick);
  const [factor, setFactor] = useState<LiveDispatchFactor>(() => readInitialQuery().factor);

  useEffect(() => {
    syncHistory(blick, factor);
  }, [blick, factor]);

  const model = bundle.byBlick[blick];
  const factorResult = model.factors[factor];
  const isSingleDay = model.bounds.dayCount === 1;
  const missingShare =
    model.observed.totalQuarters > 0 ? model.observed.missingQuarters / model.observed.totalQuarters : 0;
  const showMissingHint = missingShare >= 0.02 - 1e-9;

  const assessment = useMemo(
    () => einschaetzung(model, factor, language, { dataStand: bundle.dataStand, until }),
    [model, factor, language, bundle.dataStand, until]
  );

  const chartSamples: ChartSample[] = useMemo(
    () =>
      factorResult.quarterPoints.map((point: OverviewQuarterPoint) => ({
        hour: point.hour,
        ohne: point.residualMw / 1000,
        mit: point.residualMitMw / 1000,
        charge: point.chargeMw / 1000,
        discharge: point.dischargeMw / 1000,
        soc: point.socFraction,
        trade: point.tradeMw !== null ? point.tradeMw / 1000 : undefined,
      })),
    [factorResult.quarterPoints]
  );

  const chartScale = useMemo(() => {
    const values = [0];
    for (const point of factorResult.quarterPoints) {
      values.push(point.residualMw / 1000, point.residualMitMw / 1000, -(point.chargeMw / 1000), point.dischargeMw / 1000);
      if (point.tradeMw !== null) {
        values.push(point.tradeMw / 1000, -(point.tradeMw / 1000));
      }
    }
    return niceChartScale(values);
  }, [factorResult.quarterPoints]);

  function onBlickKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = OVERVIEW_BLICKS[(index + delta + OVERVIEW_BLICKS.length) % OVERVIEW_BLICKS.length];
    setBlick(next);
  }

  const netImport = model.observed.netImportGwh;
  const importGwh = model.observed.importGwh;
  const exportGwh = model.observed.exportGwh;
  const netTradeGwh =
    netImport !== null ? Math.abs(netImport) : importGwh !== null && exportGwh !== null ? Math.abs(importGwh - exportGwh) : null;
  const absorbedSharePct =
    factorResult.absorbedShare !== null ? formatQuantity(factorResult.absorbedShare * 100, language, 0) : null;

  return (
    <section id="uebersicht" className="uebersicht start-overview" aria-labelledby="uebersicht-title">
      <div className="mx-auto max-w-[1200px]">
        {bundle.stale ? (
          <p className="uebersicht-banner" role="status">
            {tx(
              `Wir zeigen den letzten erfolgreichen Abruf. Datenstand: ${bundle.dataStand}.`,
              `We show the last successful fetch. Data as of ${bundle.dataStand}.`
            )}
          </p>
        ) : null}

        <p className="day-kicker">{tx("Deutschland · Übersicht", "Germany · overview")}</p>
        <h1 id="uebersicht-title" className="start-hero-title">
          {tx(
            "Wie viel Strom aus Wind und Sonne war übrig — und hätte mehr Speicher ihn aufgenommen?",
            "How much wind and solar power was left over — and would more storage have absorbed it?"
          )}
        </h1>

        <div className="sim-seg uebersicht-period" role="radiogroup" aria-label={tx("Zeitraum", "Period")}>
          {OVERVIEW_BLICKS.map((item, index) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={blick === item}
              className={blick === item ? "on" : undefined}
              onClick={() => setBlick(item)}
              onKeyDown={(event) => onBlickKey(event, index)}
            >
              {blickLabel(item, language)}
            </button>
          ))}
        </div>

        {showMissingHint ? (
          <p className="uebersicht-sub" role="status">
            {tx(
              `${quarterLabel(model.observed.missingQuarters, language)} in den Rohdaten (${formatQuantity(missingShare * 100, language, 1)} %).`,
              `${quarterLabel(model.observed.missingQuarters, language)} in the raw data (${formatQuantity(missingShare * 100, language, 1)}%).`
            )}
          </p>
        ) : null}

        <p className="uebersicht-assessment">{assessment}</p>
        {model.observed.openDay && blick === "heute" ? (
          <p className="uebersicht-open-hint">
            {tx("Der Tag läuft noch. Die Zahlen können sich noch ändern.", "The day is still in progress. Figures may still change.")}
          </p>
        ) : null}

        <div className="uebersicht-trio" aria-label={tx("Kernzahlen", "Key figures")}>
          <article className="uebersicht-trio-item">
            <h2>{tx("Überschuss", "Surplus")}</h2>
            <p className="uebersicht-value">{gwh(model.observed.surplusGwh, language)}</p>
            <p className="uebersicht-quiet">
              {tx(
                `an ${model.observed.surplusDays} von ${model.observed.dayCount} Tagen`,
                `on ${model.observed.surplusDays} of ${model.observed.dayCount} days`
              )}
            </p>
          </article>
          <article className="uebersicht-trio-item">
            <h2>{tx("Handel", "Trade")}</h2>
            <p className="uebersicht-value">{gwh(netTradeGwh, language)}</p>
            <p className="uebersicht-quiet">
              {netImport !== null && netImport >= 0
                ? tx("unterm Strich eingekauft", "net import")
                : tx("unterm Strich verkauft", "net export")}
            </p>
          </article>
          <article className="uebersicht-trio-item" data-model-estimate>
            <div className="flex flex-wrap items-center gap-2">
              <h2>{tx(`Bei ×${factor} aufgenommen`, `Absorbed at ×${factor}`)}</h2>
              <ModelChip label={tx("Modellschätzung", "Model estimate")} />
            </div>
            <p className="uebersicht-value">
              {gwh(factorResult.absorbedGwh, language)}{" "}
              {absorbedSharePct !== null ? tx(`(${absorbedSharePct} % des Überschusses)`, `(${absorbedSharePct}% of surplus)`) : null}
            </p>
          </article>
        </div>

        <p className="uebersicht-context">
          {tx(
            `Zum Vergleich: im Schnitt ${formatQuantity(bundle.curtailmentQuarterDailyGwh, language, 0)} GWh pro Tag abgeregelt (${bundle.curtailmentQuarterLabel}, BNetzA/SMARD, Quartalssumme ${formatQuarterlyCurtailmentGwh(language)}).`,
            `For comparison: on average ${formatQuantity(bundle.curtailmentQuarterDailyGwh, language, 0)} GWh curtailed per day (${bundle.curtailmentQuarterLabel}, BNetzA/SMARD, quarterly total ${formatQuarterlyCurtailmentGwh(language)}).`
          )}{" "}
          <a href={SMARD_QUARTERLY_TOPIC_URL}>{tx(`Stand ${bundle.curtailmentPublishedLabel}`, `As of ${bundle.curtailmentPublishedLabel}`)}</a>
        </p>

        <div className="uebersicht-chart-wrap">
          <FactorSlider
            factor={factor}
            label=""
            valueText={language === "de" ? `×${factor} Speicherflotte` : `×${factor} storage fleet`}
            saturationIndex={factorResult.saturated ? LIVE_DISPATCH_FACTORS.indexOf(factor) : null}
            onChange={setFactor}
          />
          <figure>
            <figcaption className="sr-only">
              {isSingleDay
                ? tx("Viertelstunden-Verlauf mit und ohne Speicher", "Quarter-hour trace with and without storage")
                : tx("Tagesbalken Überschuss und Aufnahme", "Daily bars for surplus and absorption")}
            </figcaption>
            {isSingleDay && chartSamples.length > 0 ? (
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
                  ariaLabel={tx("Übersicht Residuallast mit Speicher. Modellschätzung.", "Overview residual load with storage. Model estimate.")}
                  tag={tx("MODELL", "MODEL")}
                  annotations={[]}
                  chargedNote=""
                  intro={false}
                  language={language}
                />
              </>
            ) : (
              <UebersichtBarChart rows={factorResult.dayRows} language={language} blick={blick} />
            )}
          </figure>

          <details className="uebersicht-details">
            <summary>{tx("Details", "Details")}</summary>
            <ul className="uebersicht-list">
              <li>
                {tx("Abgegeben am Abend", "Discharged in the evening")}: {gwh(factorResult.dischargedGwh, language)}
              </li>
              <li>
                {tx("Abendspitze im Schnitt", "Average evening peak")}:{" "}
                {factorResult.eveningPeakBeforeGw !== null && factorResult.eveningPeakAfterGw !== null
                  ? `${formatQuantity(factorResult.eveningPeakBeforeGw, language, 1)} → ${formatQuantity(factorResult.eveningPeakAfterGw, language, 1)} GW`
                  : "—"}
              </li>
              <li>
                {tx("Entladung in Stunden mit Import (höchstens)", "Discharge during import hours (at most)")}:{" "}
                {gwh(factorResult.dischargedDuringImportGwh, language, 2)}
              </li>
              <li>
                <span title={language === "de" ? SOC_REST_TOOLTIP_DE : SOC_REST_TOOLTIP_EN}>
                  {tx("Rest im Speicher am Zeitraumende", "Remainder in storage at period end")}: {gwh(factorResult.endSocDeltaGwh, language, 2)}
                </span>
              </li>
              {factor === 1 && factorResult.eurModelX1 !== null ? (
                <li>
                  {tx("Modellschätzung", "Model estimate")}: ≈ {formatQuantity(factorResult.eurModelX1, language, 0)} €{" "}
                  {tx("Erlös aus Preisunterschied (Day-Ahead DE-LU)", "Revenue from price spread (day-ahead DE-LU)")}
                </li>
              ) : factor > 1 ? (
                <li className="beispieltage-euro-hint">{fleetEuroHiddenHint(language)}</li>
              ) : null}
            </ul>
            <details className="uebersicht-table">
              <summary>{tx("Zahlen als Tabelle", "Numbers as a table")}</summary>
              <table>
                <thead>
                  <tr>
                    <th>{tx("Tag", "Day")}</th>
                    <th>{tx("Überschuss GWh", "Surplus GWh")}</th>
                    <th>{tx("aufgenommen GWh", "absorbed GWh")}</th>
                  </tr>
                </thead>
                <tbody>
                  {factorResult.dayRows.map((row) => (
                    <tr key={row.dateBerlin}>
                      <td>
                        <Link href={`/live?tag=${row.dateBerlin}`} prefetch={false}>
                          {formatBerlinDate(row.dateBerlin)}
                        </Link>
                      </td>
                      <td>{formatQuantity(row.surplusGwh, language, 2)}</td>
                      <td>{formatQuantity(row.absorbedGwh, language, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </details>
        </div>

        <section className="start-doors" aria-labelledby="start-doors-title">
          <h2 id="start-doors-title">{tx("Weiter", "Next")}</h2>
          <PerspectiveChoice language={language} />
        </section>

        <p className="uebersicht-foot">
          {tx(`Datenstand: ${bundle.dataStand} · Energy-Charts.info`, `As of ${bundle.dataStand} · Energy-Charts.info`)} ·{" "}
          <Link href="/methodik#uebersicht" prefetch={false}>
            {tx("Methodik", "Method")}
          </Link>{" "}
          ·{" "}
          <Link href="/news" prefetch={false}>
            News
          </Link>
        </p>
      </div>
    </section>
  );
}
