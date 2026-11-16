import Link from "next/link";

import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { formatPeakKpi } from "@/lib/nationalFleetCharts";
import { formatQuantity } from "@/lib/formatQuantity";
import { formatGwReduction } from "@/lib/monatV1Format";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  fleetTagHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_MONTH_KEY,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export function NationalFleetDayChapter({
  dayKey,
  factor,
  strategy,
  slice,
  monthStats,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  run: NationalFleetRunSeries;
  slice: NationalFleetDaySlice;
  monthStats: NationalFleetMonthStats;
}) {
  const peakRpGw = slice.maxRPrimeMw / 1000;
  const peakRGw = slice.maxRMw / 1000;
  const peakReductionDayGw = peakRGw - peakRpGw;

  return (
    <section className="v4-chapter v4-chapter-fleet-day" aria-labelledby="fleet-day-title">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">03 · Monatslauf</p>
        <h2 id="fleet-day-title" className="v4-chapter-h2 v4-fleet-day-h2">
          ×{factor}, {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}
        </h2>
        <p className="v4-tag-kern">
          {Number.parseFloat(peakReductionDayGw.toFixed(2)) >= 0
            ? formatGwReduction(peakReductionDayGw)
            : `${formatQuantity(Math.abs(peakReductionDayGw), "de", 2)}\u00A0GW höher`}
        </p>
        <p className="v4-tag-side">
          Tages-Spitze {formatQuantity(peakRGw, "de", 2)} → {formatQuantity(peakRpGw, "de", 2)} GW. Monat:{" "}
          {formatPeakKpi(monthStats.peakAfterGw, monthStats.peakReductionGw, monthStats.peakReductionPct)}.
        </p>
      </div>

      <div className="v4-content v4-fleet-controls" role="group" aria-label="Szenario wählen">
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Stufe</legend>
          <div className="v4-fleet-factor-row">
            {NATIONAL_FLEET_FACTORS.map((f) => (
              <Link
                key={f}
                href={fleetTagHref(dayKey, f, strategy)}
                className={`v4-fleet-pill${f === factor ? " is-active" : ""}${f === 1 ? " is-measured" : ""}`}
                aria-current={f === factor ? "true" : undefined}
              >
                {f === 1 ? "×1 heute" : `×${f}`}
              </Link>
            ))}
          </div>
        </fieldset>
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Fahrweise</legend>
          <div className="v4-fleet-strategy-row">
            <Link
              href={fleetTagHref(dayKey, factor, "spitze")}
              className={`v4-fleet-pill v4-fleet-pill-wide${strategy === "spitze" ? " is-active" : ""}`}
              aria-current={strategy === "spitze" ? "true" : undefined}
              title="senkt die bundesweite Restlast-Spitze"
            >
              Spitze
            </Link>
          </div>
          <p className="v4-fleet-strategy-copy">
            lädt, wenn Platz ist, und entlädt so, dass die höchste bundesweite Restlast im Zeitraum möglichst niedrig
            wird (volle Voraussicht).
          </p>
        </fieldset>
      </div>

      <p className="v4-content v4-fleet-energy-context num">
        Referenzflotte ×1: {formatQuantity(monthStats.fleetPowerGw, "de", 2)} GW / 8,27 GWh (Battery Charts, gemessen).
      </p>
      <NationalFleetTimeSeriesChart
        monthKey={NATIONAL_FLEET_MONTH_KEY}
        factor={factor}
        strategy={strategy}
        dateKey={dayKey}
        peakReductionGw={monthStats.peakReductionGw}
        peakReductionPct={monthStats.peakReductionPct}
        peakReductionDayGw={peakReductionDayGw}
        peakObservedDayGw={peakRGw}
        scrollHint={`Tageshorizont · ${slice.indices.length} Viertelstunden am ${formatBerlinDayLabel(dayKey)}`}
      />
      <p className="v4-content v4-fleet-graph-meta num">
        Modell · national ·{" "}
        <Link href="/kompromiss" className="v4-text-link">
          Szenarien rechnen
        </Link>
      </p>
    </section>
  );
}
