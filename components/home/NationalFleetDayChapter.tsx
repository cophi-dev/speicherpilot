import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { GraphScopeMeta } from "@/components/home/GraphScopeMeta";
import {
  formatDayPeakKpiFromSlice,
  formatPeakCaptionMonthContext,
  formatTagDayPeakHeadline,
} from "@/lib/nationalFleetCharts";
import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  FLEET_SATURATION_HINT_DE,
  shouldShowFleetSaturationHint,
} from "@/lib/fleetDaySaturation";
import {
  fleetMonatQuery,
  fleetTagHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  nationalFleetMonthKeyForDay,
  sliceFleetDay,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import {
  NATIONAL_REFERENCE_FLEET_ENERGY_GWH,
  NATIONAL_REFERENCE_FLEET_POWER_GW,
} from "@/lib/nationalFleetReference";
import { loadNationalFleetRunSeries } from "@/lib/nationalMonthFleetModel.server";
import { FleetScenarioLink } from "@/components/home/FleetScenarioLink";

function saturationSlices(dayKey: string): {
  x1: NationalFleetDaySlice | null;
  x5: NationalFleetDaySlice | null;
  x10: NationalFleetDaySlice | null;
} {
  const strategy: NationalFleetStrategyUi = "spitze";
  const monthKey = nationalFleetMonthKeyForDay(dayKey);
  const loadOpts = { monthKey, dayKey };
  const x1 = sliceFleetDay(loadNationalFleetRunSeries(1, strategy, loadOpts), dayKey);
  const x5 = sliceFleetDay(loadNationalFleetRunSeries(5, strategy, loadOpts), dayKey);
  const x10 = sliceFleetDay(loadNationalFleetRunSeries(10, strategy, loadOpts), dayKey);
  return { x1, x5, x10 };
}

export function NationalFleetDayChapter({
  dayKey,
  factor,
  strategy,
  slice,
  monthStats,
  isStartSurface = false,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  run: NationalFleetRunSeries;
  slice: NationalFleetDaySlice;
  monthStats: NationalFleetMonthStats;
  isStartSurface?: boolean;
}) {
  const scenarioHref = (f: NationalFleetFactor, s: NationalFleetStrategyUi) =>
    isStartSurface ? `/?${fleetMonatQuery(f, s)}` : fleetTagHref(dayKey, f, s);
  const peakRpGw = slice.maxRPrimeMw / 1000;
  const peakRGw = slice.maxRMw / 1000;
  const dayPeakKpi = formatDayPeakKpiFromSlice(peakRpGw, peakRGw, dayKey);
  const peakReductionDayGw = dayPeakKpi.reductionGw;
  const dayPeakHeadline = formatTagDayPeakHeadline(
    peakRGw,
    peakRpGw,
    dayPeakKpi.reductionGw,
    dayPeakKpi.reductionPct,
  );
  const monthKey = nationalFleetMonthKeyForDay(dayKey);
  const { x1, x5, x10 } = saturationSlices(dayKey);
  const showSaturation = shouldShowFleetSaturationHint(x1, x5, x10);

  return (
    <section className="v4-chapter v4-chapter-fleet-day" aria-labelledby="fleet-day-title">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">03 · Monatslauf</p>
        <h2 id="fleet-day-title" className="v4-chapter-h2 v4-fleet-day-h2">
          ×{factor}, {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}
        </h2>
        <p className="v4-tag-side num">{dayPeakHeadline}</p>
      </div>

      <div className="v4-content v4-fleet-controls" role="group" aria-label="Szenario wählen">
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Stufe</legend>
          <div className="v4-fleet-factor-row">
            {NATIONAL_FLEET_FACTORS.map((f) => (
              <FleetScenarioLink
                key={f}
                href={scenarioHref(f, strategy)}
                role="button"
                aria-pressed={f === factor}
                className={`v4-fleet-pill${f === factor ? " is-active" : ""}${f === 1 ? " is-measured" : ""}`}
              >
                {f === 1 ? "×1 heute" : `×${f}`}
              </FleetScenarioLink>
            ))}
          </div>
        </fieldset>
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Fahrweise</legend>
          <div className="v4-fleet-strategy-row">
            {(["spitze", "markt", "ueberschuss"] as const).map((id) => (
              <FleetScenarioLink
                key={id}
                href={scenarioHref(factor, id)}
                role="button"
                aria-pressed={strategy === id}
                className={`v4-fleet-pill v4-fleet-pill-wide${strategy === id ? " is-active" : ""}`}
                title={NATIONAL_FLEET_STRATEGY_UI[id].labelDe}
              >
                {id === "spitze" ? "Spitze" : id === "markt" ? "Markt" : "Überschuss"}
              </FleetScenarioLink>
            ))}
          </div>
          <p className="v4-fleet-strategy-copy">
            {strategy === "spitze"
              ? "lädt, wenn Platz ist, und entlädt so, dass die höchste bundesweite Restlast im Zeitraum möglichst niedrig wird (volle Voraussicht); Ort und Knoten rechnet das Modell nicht."
              : `${NATIONAL_FLEET_STRATEGY_UI[strategy].labelDe} (Tageshorizont).`}
          </p>
          <p className="v4-fleet-energy-context">
            Referenzflotte ×1:{" "}
            <span className="num">
              {formatQuantity(NATIONAL_REFERENCE_FLEET_POWER_GW, "de", 2)}
              {"\u00a0"}GW · {formatQuantity(NATIONAL_REFERENCE_FLEET_ENERGY_GWH, "de", 2)}
              {"\u00a0"}GWh
            </span>{" "}
            nutzbare Energie
          </p>
        </fieldset>
      </div>

      <NationalFleetTimeSeriesChart
        monthKey={monthKey}
        factor={factor}
        strategy={strategy}
        dateKey={dayKey}
        peakReductionGw={dayPeakKpi.reductionGw}
        peakReductionPct={dayPeakKpi.reductionPct}
        peakReductionDayGw={peakReductionDayGw}
        peakObservedDayGw={peakRGw}
        dayPeakReference={dayPeakKpi.reference}
        monthContextNote={formatPeakCaptionMonthContext(
          monthStats.peakReductionGw,
          monthStats.peakReductionPct,
        )}
        scrollHint={`Tageshorizont · ${slice.indices.length} Viertelstunden · ${formatBerlinDayLabel(dayKey)}`}
        tagesvorlageDay
        dayNoWindSolarSurplus={slice.positiveSurplusQuarterHours === 0}
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