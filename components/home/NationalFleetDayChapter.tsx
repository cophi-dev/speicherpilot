import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { GraphScopeMeta } from "@/components/home/GraphScopeMeta";
import { formatPeakKpi } from "@/lib/nationalFleetCharts";
import { formatQuantity } from "@/lib/formatQuantity";
import { formatGwReduction } from "@/lib/monatV1Format";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  FLEET_SATURATION_HINT_DE,
  shouldShowFleetSaturationHint,
} from "@/lib/fleetDaySaturation";
import {
  fleetTagHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_MONTH_KEY,
  NATIONAL_FLEET_STRATEGY_UI,
  sliceFleetDay,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetRunSeries } from "@/lib/nationalMonthFleetModel.server";
import Link from "next/link";

function saturationSlices(dayKey: string): {
  x1: NationalFleetDaySlice | null;
  x5: NationalFleetDaySlice | null;
  x10: NationalFleetDaySlice | null;
} {
  const strategy: NationalFleetStrategyUi = "spitze";
  const x1 = sliceFleetDay(loadNationalFleetRunSeries(1, strategy), dayKey);
  const x5 = sliceFleetDay(loadNationalFleetRunSeries(5, strategy), dayKey);
  const x10 = sliceFleetDay(loadNationalFleetRunSeries(10, strategy), dayKey);
  return { x1, x5, x10 };
}

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
  const { x1, x5, x10 } = saturationSlices(dayKey);
  const showSaturation = shouldShowFleetSaturationHint(x1, x5, x10);

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
        Referenzflotte ×1: {formatQuantity(monthStats.fleetPowerGw, "de", 2)} GW · 8,27 GWh nutzbare Energie
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
        scrollHint={`Tageshorizont · ${slice.indices.length} Viertelstunden · ${formatBerlinDayLabel(dayKey)}`}
        tagesvorlageDay
      />
      <div className="v4-content">
        <GraphScopeMeta />
      </div>
      {showSaturation ? (
        <p className="v4-content v4-fleet-saturation-hint">{FLEET_SATURATION_HINT_DE}</p>
      ) : null}
    </section>
  );
}