import "server-only";

import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import { loadStartKartePreviewData } from "@/lib/bessKarte3d/loadSummary.server";
import type { StartKartePreviewData } from "@/lib/bessKarte3d/types";
import { lastSurplusBefore } from "@/lib/kopfTagCopy";
import { loadGermanyViewForTag } from "@/lib/germanyViewTag.server";
import { firstMarktInsightForStart, marktInsightsForRoute } from "@/lib/marktInsightsPage.server";
import {
  monthStatsForRun,
  nationalFleetMonthAvailable,
  nationalFleetMonthKeyForDay,
  parseFleetFactor,
  parseTagFleetFactor,
  parseFleetStrategy,
  sliceFleetDay,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import {
  NATIONAL_FLEET_DISPLAY_ENERGY_GWH,
  NATIONAL_FLEET_DISPLAY_POWER_GW,
} from "@/lib/nationalFleetDisplay";
import { loadTagFleetRunSeries, nationalFleetContext } from "@/lib/nationalMonthFleetModel.server";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";
import { buildStartHeroV2, type StartHeroV2Model } from "@/lib/startHeroV2";
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
    run: NonNullable<ReturnType<typeof loadTagFleetRunSeries>>["run"];
    runSource: NonNullable<ReturnType<typeof loadTagFleetRunSeries>>["source"];
    slice: NonNullable<ReturnType<typeof sliceFleetDay>>;
    monthStats: ReturnType<typeof monthStatsForRun>;
    showPeakWithoutSurplus: boolean;
    isolatedDayHorizon: boolean;
  } | null;
  fleetRun: ReturnType<typeof loadTagFleetRunSeries>["run"] | null;
  fleetRunSource: ReturnType<typeof loadTagFleetRunSeries>["source"] | null;
  fleetSlice: ReturnType<typeof sliceFleetDay> | null;
  startHero?: StartHeroV2Model | null;
  startKarte?: StartKartePreviewData | null;
  leitfrage: string;
  isStartSurface: boolean;
};

function safeLoadTagFleetRun(
  factor: ReturnType<typeof parseFleetFactor>,
  strategy: NationalFleetStrategyUi,
  opts: { monthKey: string; dayKey: string },
): ReturnType<typeof loadTagFleetRunSeries> | null {
  try {
    return loadTagFleetRunSeries(factor, strategy, opts);
  } catch {
    return null;
  }
}

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

  const fleetFactor = opts.isStartSurface ? parseFleetFactor(query.faktor) : parseTagFleetFactor(query.faktor);
  const fleetStrategy = parseFleetStrategy(query.fahrweise);
  const fleetMonthKey = nationalFleetMonthKeyForDay(datum);
  const fleetMonth = nationalFleetMonthAvailable(fleetMonthKey);
  const fleetLoaded = fleetMonth
    ? loadTagFleetRunSeries(fleetFactor, fleetStrategy, { monthKey: fleetMonthKey, dayKey: datum })
    : null;
  const fleetRun = fleetLoaded?.run ?? null;
  const fleetRunSource = fleetLoaded?.source ?? null;
  const fleetSlice = fleetRun ? sliceFleetDay(fleetRun, datum) : null;

  const leitfrage = opts.isStartSurface
    ? "Was hätte mehr Speicher gestern geändert?"
    : `Was hätte mehr Speicher am ${formatBerlinDayLabel(datum)} geändert?`;

  let startHero: StartHeroV2Model | null = null;
  if (opts.isStartSurface) {
    const heroSpitzeLoaded = fleetMonth
      ? safeLoadTagFleetRun(2, "spitze", { monthKey: fleetMonthKey, dayKey: datum })
      : null;
    const heroUeberschussLoaded = fleetMonth
      ? safeLoadTagFleetRun(2, "ueberschuss", { monthKey: fleetMonthKey, dayKey: datum })
      : null;
    const heroMarktLoaded = fleetMonth
      ? safeLoadTagFleetRun(2, "markt", { monthKey: fleetMonthKey, dayKey: datum })
      : null;
    startHero = buildStartHeroV2({
      dayKey: datum,
      spitzeRun: heroSpitzeLoaded?.run ?? null,
      ueberschussRun: heroUeberschussLoaded?.run ?? null,
      marktRun: heroMarktLoaded?.run ?? null,
      question: leitfrage,
      horizonLabel: heroSpitzeLoaded?.source === "month" ? "Monatslauf" : "Tageshorizont",
    });
  }

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
    fleetPowerGw: fleetMonth ? NATIONAL_FLEET_DISPLAY_POWER_GW : fleet.powerGw,
    fleetEnergyGwh: fleetMonth ? NATIONAL_FLEET_DISPLAY_ENERGY_GWH : fleet.energyGwh,
    fleetFactor,
    fleetStrategy,
    fleetDayNoWindSolarSurplus: fleetDayNoWindSolarSurplus(fleetSlice),
    preisTag: view.preisTag,
    marktInsights: opts.isStartSurface
      ? firstMarktInsightForStart({
          records,
          fleetPowerGw: fleetMonth ? NATIONAL_FLEET_DISPLAY_POWER_GW : fleet.powerGw,
          fleetEnergyGwh: fleetMonth ? NATIONAL_FLEET_DISPLAY_ENERGY_GWH : fleet.energyGwh,
          focusDayKey: datum,
          overview30: view.dayOverview,
          monthKey: fleetMonthKey,
        })
      : marktInsightsForRoute({
          route: "tag",
          records,
          fleetPowerGw: fleetMonth ? NATIONAL_FLEET_DISPLAY_POWER_GW : fleet.powerGw,
          fleetEnergyGwh: fleetMonth ? NATIONAL_FLEET_DISPLAY_ENERGY_GWH : fleet.energyGwh,
          focusDayKey: datum,
          overview30: view.dayOverview,
          monthKey: fleetMonthKey,
        }),
    simulatorTeaser: opts.isStartSurface ? undefined : loadEps70Teaser(),
    startHero,
    startKarte: opts.isStartSurface ? loadStartKartePreviewData() : null,
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
              fleetSlice.positiveSurplusQuarterHours === 0 && fleetSlice.chargeMwh > 1,
            runSource: fleetRunSource ?? "month",
            isolatedDayHorizon: fleetRunSource != null && fleetRunSource !== "month",
          }
        : null,
    fleetRun,
    fleetRunSource,
    fleetSlice,
    leitfrage,
    isStartSurface: Boolean(opts.isStartSurface),
  };
}