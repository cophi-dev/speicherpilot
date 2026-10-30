"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, type KeyboardEvent } from "react";

import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { ModelChip } from "@/components/day-ring/ModelChip";
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
import type { OverviewUiModel } from "@/lib/germanyView";
import type { OverviewFactorResult, OverviewQuarterPoint } from "@/lib/overviewChain";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { OVERVIEW_BLICKS, parseOverviewFactor, type OverviewBlick } from "@/lib/overviewRange";
import { uniqueQuarterLabels } from "@/lib/quarterMarks";

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

function formatPeakMoment(iso: string | null, multiDay: boolean) {
  if (!iso) {
    return null;
  }
  const clock = uniqueQuarterLabels([iso])[0] ?? "";
  if (!multiDay) {
    return clock;
  }
  const dateKey = iso.slice(0, 10);
  return `${formatBerlinDate(dateKey)} ${clock}`.trim();
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

export function Uebersicht({ model, until }: { model: OverviewUiModel; until: string | null }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const factor = parseOverviewFactor(searchParams.get("x")) as LiveDispatchFactor;
  const blick = model.bounds.blick;
  const factorResult = model.factors[factor] as OverviewFactorResult;
  const isSingleDay = model.bounds.dayCount === 1;
  const multiDay = model.bounds.dayCount > 1;
  const missingShare =
    model.observed.totalQuarters > 0 ? model.observed.missingQuarters / model.observed.totalQuarters : 0;
  const showMissingHint = missingShare >= 0.02 - 1e-9;

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

  function pushQuery(nextBlick: OverviewBlick, nextFactor: LiveDispatchFactor) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("blick", nextBlick);
    params.set("x", String(nextFactor));
    router.replace(`/?${params.toString()}#uebersicht`, { scroll: false });
  }

  function onBlickKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = OVERVIEW_BLICKS[(index + delta + OVERVIEW_BLICKS.length) % OVERVIEW_BLICKS.length];
    pushQuery(next, factor);
  }

  const surplus = model.observed.surplusGwh ?? 0;
  const noSurplus = surplus <= 1e-6;
  const peakLabel =
    model.observed.peakSurplusMw !== null && model.observed.peakSurplusIso
      ? formatPeakMoment(model.observed.peakSurplusIso, multiDay)
      : null;

  const netImport = model.observed.netImportGwh;
  const importGwh = model.observed.importGwh;
  const exportGwh = model.observed.exportGwh;
  const netTradeGwh =
    netImport !== null ? Math.abs(netImport) : importGwh !== null && exportGwh !== null ? Math.abs(importGwh - exportGwh) : null;
  const importTileTitle = tx("Handel", "Trade");

  return (
    <section id="uebersicht" className="uebersicht" aria-labelledby="uebersicht-title">
      <div className="mx-auto max-w-[1200px]">
        {model.stale ? (
          <p className="uebersicht-banner" role="status">
            {tx(
              `Wir zeigen den letzten erfolgreichen Abruf. Datenstand: ${model.dataStand}.`,
              `We show the last successful fetch. Data as of ${model.dataStand}.`
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <h2 id="uebersicht-title">{tx("Deutschland auf einen Blick", "Germany at a glance")}</h2>
          <ModelChip label={tx("Modellschätzung", "Model estimate")} />
        </div>
        <p className="uebersicht-lead">
          {tx(
            "Überschuss, Handel und Abregelung — und was mehr Speicher in unserem Modell verschoben hätte.",
            "Surplus, trade and curtailment — and what more storage would have shifted in our model."
          )}
        </p>

        <div className="sim-seg uebersicht-period" role="radiogroup" aria-label={tx("Zeitraum", "Period")}>
          {OVERVIEW_BLICKS.map((item, index) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={blick === item}
              className={blick === item ? "on" : undefined}
              onClick={() => pushQuery(item, factor)}
              onKeyDown={(event) => onBlickKey(event, index)}
            >
              {blickLabel(item, language)}
            </button>
          ))}
        </div>
        {model.observed.openDay ? (
          <p className="uebersicht-sub" role="status">
            {tx("Tag läuft noch.", "Day still in progress.")}
          </p>
        ) : null}
        {blick === "heute" && until ? (
          <p className="uebersicht-sub">{tx(`bisher, bis ${until} Uhr`, `so far, until ${until}`)}</p>
        ) : null}
        {showMissingHint ? (
          <p className="uebersicht-sub" role="status">
            {tx(
              `${model.observed.missingQuarters} Viertelstunden fehlen in den Rohdaten (${formatQuantity(missingShare * 100, language, 1)} %).`,
              `${model.observed.missingQuarters} quarter-hours missing in the raw data (${formatQuantity(missingShare * 100, language, 1)}%).`
            )}
          </p>
        ) : null}

        <div className="uebersicht-tiles">
          <article className="uebersicht-kpi">
            <h3>{tx("Überschuss", "Surplus")}</h3>
            <p className="uebersicht-value">{gwh(model.observed.surplusGwh, language)}</p>
            <p className="uebersicht-note">
              {tx(
                `Wind und Sonne lieferten mehr als nötig: an ${model.observed.surplusDays} von ${model.observed.dayCount} Tagen.`,
                `Wind and solar exceeded need: on ${model.observed.surplusDays} of ${model.observed.dayCount} days.`
              )}
            </p>
            {peakLabel ? (
              <p className="uebersicht-quiet">
                {tx("Höchste Spitze", "Highest peak")}: {formatQuantity((model.observed.peakSurplusMw ?? 0) / 1000, language, 1)} GW ·{" "}
                {peakLabel}
              </p>
            ) : null}
            <p className="uebersicht-source">{tx(`Datenstand: ${model.dataStand} · Energy-Charts.info`, `As of ${model.dataStand} · Energy-Charts.info`)}</p>
          </article>

          <article className="uebersicht-kpi">
            <h3>{importTileTitle}</h3>
            <p className="uebersicht-value">{gwh(netTradeGwh, language)}</p>
            <p className="uebersicht-note">
              {importGwh !== null && exportGwh !== null && netTradeGwh !== null
                ? netImport !== null && netImport >= 0
                  ? tx(
                      `Deutschland hat unterm Strich ${gwh(netTradeGwh, language, 2)} eingekauft. Eingekauft in Viertelstunden mit Import: ${gwh(importGwh, language, 2)}, verkauft: ${gwh(exportGwh, language, 2)}.`,
                      `Germany bought ${gwh(netTradeGwh, language, 2)} net. Bought in import quarters: ${gwh(importGwh, language, 2)}, sold: ${gwh(exportGwh, language, 2)}.`
                    )
                  : tx(
                      `Deutschland hat unterm Strich ${gwh(netTradeGwh, language, 2)} verkauft. Eingekauft in Viertelstunden mit Import: ${gwh(importGwh, language, 2)}, verkauft: ${gwh(exportGwh, language, 2)}.`,
                      `Germany sold ${gwh(netTradeGwh, language, 2)} net. Bought in import quarters: ${gwh(importGwh, language, 2)}, sold: ${gwh(exportGwh, language, 2)}.`
                    )
                : tx("Keine Handelsdaten im Zeitraum.", "No trade data in this period.")}
            </p>
            <p className="uebersicht-source">{tx("Quelle: kommerzieller Handelssaldo · Energy-Charts", "Source: commercial trading balance · Energy-Charts")}</p>
          </article>

          <article className="uebersicht-kpi">
            <h3>{tx("Abregelung", "Curtailment")}</h3>
            <p className="uebersicht-value">{gwh(model.curtailmentQuarterDailyGwh, language, 0)}</p>
            <p className="uebersicht-note">
              {tx(
                `Im Schnitt pro Tag im letzten veröffentlichten Quartal (${model.curtailmentQuarterLabel}, BNetzA/SMARD, Quartalssumme ${formatQuarterlyCurtailmentGwh(language)} EE-Redispatch gesamt). Tageswerte veröffentlicht niemand vollständig.`,
                `Daily average in the last published quarter (${model.curtailmentQuarterLabel}, BNetzA/SMARD, quarterly total ${formatQuarterlyCurtailmentGwh(language)} EE redispatch). Nobody publishes complete daily totals.`
              )}
            </p>
            <p className="uebersicht-source">
              <a href={SMARD_QUARTERLY_TOPIC_URL}>{tx(`Stand ${model.curtailmentPublishedLabel}`, `As of ${model.curtailmentPublishedLabel}`)}</a>
            </p>
          </article>

          <article className="uebersicht-kpi" data-model-estimate>
            <div className="flex flex-wrap items-center gap-2">
              <h3>{tx("Mehr Speicher", "More storage")}</h3>
              <ModelChip label={tx("Modellschätzung", "Model estimate")} />
            </div>
            {noSurplus ? (
              <p className="uebersicht-note">
                {tx(
                  "Im Zeitraum gab es keinen Überschuss aus Wind und Sonne. Unser Modell lädt nur aus Überschuss, deshalb hätte auch mehr Speicher hier nichts verschoben.",
                  "There was no wind-and-solar surplus in this period. Our model charges only from surplus, so more storage would not have shifted anything here."
                )}{" "}
                {model.observed.lastSurplusDateBerlin ? (
                  <Link href={`/live?tag=${model.observed.lastSurplusDateBerlin}`}>
                    {tx(
                      `Letzter Tag mit Überschuss: ${formatBerlinDate(model.observed.lastSurplusDateBerlin)}.`,
                      `Last surplus day: ${formatBerlinDate(model.observed.lastSurplusDateBerlin)}.`
                    )}
                  </Link>
                ) : null}
              </p>
            ) : (
              <>
                <p className="uebersicht-value">
                  {gwh(factorResult.absorbedGwh, language)}{" "}
                  {factorResult.absorbedShare !== null
                    ? tx(`(${formatQuantity(factorResult.absorbedShare * 100, language, 0)} % des Überschusses)`, `(${formatQuantity(factorResult.absorbedShare * 100, language, 0)}% of surplus)`)
                    : null}
                </p>
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
                {factorResult.saturated ? (
                  <p className="uebersicht-note">
                    {tx(
                      `Ab ×${factor} nimmt der Speicher allen Überschuss auf. Mehr Speicher bringt in diesem Zeitraum nichts mehr.`,
                      `From ×${factor} the fleet absorbs all surplus. More storage would not help further in this period.`
                    )}
                  </p>
                ) : null}
              </>
            )}
          </article>
        </div>

        <div className="uebersicht-chart-wrap">
          <FactorSlider
            factor={factor}
            label=""
            valueText={language === "de" ? `×${factor} Speicherflotte` : `×${factor} storage fleet`}
            saturationIndex={factorResult.saturated ? LIVE_DISPATCH_FACTORS.indexOf(factor) : null}
            onChange={(next) => pushQuery(blick, next)}
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
              <UebersichtBarChart rows={factorResult.dayRows} soc={factorResult.socSeries} language={language} blick={blick} />
            )}
          </figure>
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
                    <td>{formatBerlinDate(row.dateBerlin)}</td>
                    <td>{formatQuantity(row.surplusGwh, language, 2)}</td>
                    <td>{formatQuantity(row.absorbedGwh, language, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        <p className="uebersicht-foot">
          {tx(
            "Modell: 85 % Wirkungsgrad, Ladestand 10–90 %, Speicher lädt nur aus Überschuss vor 17 Uhr und entlädt ab 17 Uhr. Preise bleiben unverändert (nur bei ×1 sinnvoll).",
            "Model: 85% round-trip, state of charge 10–90%, storage charges from surplus before 17:00 and discharges from 17:00. Prices unchanged (meaningful only at ×1)."
          )}{" "}
          <Link href="/methodik#uebersicht">{tx("Mehr in der Methodik", "More in the method")}</Link>
        </p>
      </div>
    </section>
  );
}
