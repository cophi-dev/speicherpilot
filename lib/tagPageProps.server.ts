import "server-only";

import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import { lastSurplusBefore } from "@/lib/kopfTagCopy";
import { loadGermanyViewForTag } from "@/lib/germanyViewTag.server";
import { marktInsightsForRoute } from "@/lib/marktInsightsPage.server";
import {
  monthStatsForRun,
  nationalFleetMonthAvailable,
  nationalFleetMonthKeyForDay,
  parseFleetFactor,
  sliceFleetDay,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetRunSeries, nationalFleetContext } from "@/lib/nationalMonthFleetModel.server";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";
import { fleetDayNoWindSolarSurplus } from "@/components/home/NationalFleetTagSlot";

export type CompleteTagPageModel = {
  dayKey: string;
  todayKey: string;
  lastCompleteDayKey: string;
  dataStand: string;
  result: ReturnType<typeof auffaelligkeitForDay>;
  records: NonNullable<Awaited<ReturnType<typeof loadGermanyViewForTag>>["auffaelligkeitRecords"]>;
  day: NonNullable<Awaited<ReturnType<typeof loadGermanyViewForTag>>["dispatch"]["day"]>;
  lastSurplusKey: string | null;
  dayOverview: Awaited<ReturnType<typeof loadGermanyViewForTag>>["dayOverview"];
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  fleetFactor: ReturnType<typeof parseFleetFactor>;
  fleetStrategy: NationalFleetStrategyUi;
  fleetDayNoWindSolarSurplus: boolean;
  preisTag: Awaited<ReturnType<typeof loadGermanyViewForTag>>["preisTag"];
  marktInsights: ReturnType<typeof marktInsightsForRoute>;
  simulatorTeaser?: ReturnType<typeof loadEps70Teaser>;
  fleetSoGerechnet: {
    dayKey: string;
    factor: ReturnType<typeof parseFleetFactor>;
    strategy: NationalFleetStrategyUi;
    run: NonNullable<ReturnType<typeof loadNationalFleetRunSeries>>;
    slice: NonNullable<ReturnType<typeof sliceFleetDay>>;
    monthStats: ReturnType<typeof monthStatsForRun>;
    showPeakWithoutSurplus: boolean;
  } | null;
  fleetRun: ReturnType<typeof loadNationalFleetRunSeries> | null;
  fleetSlice: ReturnType<typeof sliceFleetDay> | null;
  leitfrage: string;
  isStartSurface: boolean;
};

export async function loadCompleteTagPageModel(
  datum: string,
  query: { faktor?: string; fahrweise?: string },
  opts: { isStartSurface?: boolean } = {},
): Promise<CompleteTagPageModel | "redirect" | "unavailable"> {
  const view = await loadGermanyViewForTag(datum);
  const records = view.auffaelligkeitRecords;
  const lastComplete = view.lastCompleteDayKey;

  if (datum > view.todayKey || datum > lastComplete) {
    return "redirect";
  }

  if (view.requestedTagStatus !== "ok") {
    return "unavailable";
  }

  const day = view.dispatch.day;
  if (!records || !day || day.dateBerlin !== datum) {
    return "unavailable";
  }

  const recordIndex = records.findIndex((r) => r.dateKey === datum);
  if (recordIndex >= 0 && recordIndex < 30) {
    return "unavailable";
  }

  const fleet = view.dispatch.fleet;
  if (!fleet) {
    return "unavailable";
  }

  const fleetFactor = parseFleetFactor(query.faktor);
  const fleetStrategy: NationalFleetStrategyUi = "spitze";
  const fleetMonthKey = nationalFleetMonthKeyForDay(datum);
  const fleetMonth = nationalFleetMonthAvailable(fleetMonthKey);
  const fleetRun = fleetMonth
    ? loadNationalFleetRunSeries(fleetFactor, fleetStrategy, { monthKey: fleetMonthKey, dayKey: datum })
    : null;
  const fleetSlice = fleetRun ? sliceFleetDay(fleetRun, datum) : null;

  const leitfrage = opts.isStartSurface
    ? "Was hätte mehr Speicher gestern geändert?"
    : `Was hätte mehr Speicher am ${formatBerlinDayLabel(datum)} geändert?`;

  return {
    dayKey: datum,
    todayKey: view.todayKey,
    lastCompleteDayKey: lastComplete,
    dataStand: view.stand,
    result: auffaelligkeitForDay(records, datum),
    records,
    day,
    lastSurplusKey: lastSurplusBefore(records, datum),
    dayOverview: view.dayOverview,
    fleetPowerGw: fleet.powerGw,
    fleetEnergyGwh: fleet.energyGwh,
    fleetFactor,
    fleetStrategy,
    fleetDayNoWindSolarSurplus: fleetDayNoWindSolarSurplus(fleetSlice),
    preisTag: view.preisTag,
    marktInsights: marktInsightsForRoute({
      route: opts.isStartSurface ? "start" : "tag",
      records,
      fleetPowerGw: fleet.powerGw,
      fleetEnergyGwh: fleet.energyGwh,
      focusDayKey: datum,
      overview30: view.dayOverview,
    }),
    simulatorTeaser: loadEps70Teaser(),
    fleetSoGerechnet:
      fleetRun && fleetSlice
        ? {
            dayKey: datum,
            factor: fleetFactor,
            strategy: fleetStrategy,
            run: fleetRun,
            slice: fleetSlice,
            monthStats: monthStatsForRun(
              nationalFleetContext(fleetFactor, fleetStrategy, { monthKey: fleetMonthKey, dayKey: datum }),
              fleetFactor,
              fleetStrategy,
              fleetRun,
            ),
            showPeakWithoutSurplus:
              fleetStrategy === "spitze" &&
              fleetSlice.positiveSurplusQuarterHours === 0 &&
              fleetSlice.chargeMwh > 1,
          }
        : null,
    fleetRun,
    fleetSlice,
    leitfrage,
    isStartSurface: Boolean(opts.isStartSurface),
  };
}