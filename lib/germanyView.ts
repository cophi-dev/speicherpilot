import "server-only";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey, addBerlinCalendarDays } from "@/lib/berlinCalendar";
import { EE_CURTAILMENT_Q2_2026_GWH } from "@/lib/eeCurtailmentQuarterly";
import { buildLiveReadings, type StripReading } from "@/lib/liveStrip";
import { choosePublishedDay, chooseStorageDay, dayIsUsable, type LiveDispatchInput, type LiveFleetPublic } from "@/lib/liveFleetDispatch";
import { loadDayAheadDay, loadDayAheadRange, loadFreiburgFrequency, loadGermanyPower } from "@/lib/loadGermanyPower";
import { lastFleetDataProvenance, loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { getGermanyEnergyFlowForBerlinRange } from "@/lib/energyChartsApi";
import { resolveGermanyEnergyFlowBerlinRangeForDate } from "@/lib/germanyEnergyFlowPeriod";
import { mergeDayAheadPrices } from "@/lib/quarterPrices";
import { evaluateOverview, type OverviewEvaluation } from "@/lib/overviewChain";
import { OVERVIEW_BLICKS, overviewBounds, type OverviewBlick } from "@/lib/overviewRange";
import {
  buildSurplusDayReport,
  isPublishedFullBerlinDay,
  type SurplusDayReport,
} from "@/lib/surplusDaySimulation";
import { buildPowerBoard, type PowerBoardModel } from "@/lib/powerBoard";
import { parseMixRange, powerSeriesFresh, residualDaysFromSlots } from "@/lib/powerMix";
import { uniqueQuarterLabels } from "@/lib/quarterMarks";
import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { pickNewestStrictCompletePowerDayKey } from "@/lib/berlinDayCompleteness";
import { pickLastCompleteDayKey } from "@/lib/completeBerlinDay";
import { buildHomeDayPanelData, type HomeDayPanelData } from "@/lib/homeDayPanel";
import { pickSurplusDay, type ResidualDay } from "@/lib/windSolarResidual";
import {
  buildGermanyViewFromTagSnapshot,
  tagRollSnapshotEligibleForView,
} from "@/lib/tagRollSnapshot.server";

export type OverviewUiModel = OverviewEvaluation & {
  stale: boolean;
  dataStand: string;
  fleetMissing: boolean;
  /** Daily average EE curtailment, Q2 2026 (BNetzA/SMARD). */
  curtailmentQuarterDailyGwh: number;
  curtailmentQuarterLabel: string;
  curtailmentPublishedLabel: string;
};

export type OverviewsBundle = {
  byBlick: Record<OverviewBlick, OverviewEvaluation>;
  stale: boolean;
  dataStand: string;
  fleetMissing: boolean;
  curtailmentQuarterDailyGwh: number;
  curtailmentQuarterLabel: string;
  curtailmentPublishedLabel: string;
};

export type RequestedTagStatus = "ok" | "ausserhalb" | "unvollstaendig" | "default";

export type GermanyView = {
  todayKey: string;
  dispatch: LiveDispatchInput;
  /** Last complete day that can charge on surplus. Homepage explanations use this, not the open day. */
  exampleDispatch: LiveDispatchInput;
  until: string | null;
  board: PowerBoardModel;
  stand: string;
  readings: StripReading[];
  surplusDay: SurplusDayReport | null;
  overviews: OverviewsBundle | null;
  dayOverview: OverviewEvaluation | null;
  requestedTag: string | null;
  requestedTagStatus: RequestedTagStatus;
  auffaelligkeitRecords: TagesKennzahlRecord[] | null;
  /** Last complete Berlin day shown in the dashboard head (typically yesterday). */
  kopfDayKey: string | null;
  /** Strict-grid day for homepage Tagespanel + Lücke chart (can match kopfDayKey). */
  homeTagesDayKey: string | null;
  /** Newest Berlin day with a full quarter-hour series (redirect target for /tag). */
  lastCompleteDayKey: string;
  homeDayPanel: HomeDayPanelData | null;
  kopfDay: ResidualDay | null;
};

function fleetPublic(fleet: Awaited<ReturnType<typeof loadLargeBatteryFleet>>): LiveFleetPublic | null {
  if (!fleet) {
    return null;
  }
  return {
    powerMw: fleet.powerGw * 1000,
    energyMwh: fleet.energyGwh * 1000,
    powerGw: fleet.powerGw,
    energyGwh: fleet.energyGwh,
    updatedLabel: fleet.updatedLabel,
    source: fleet.source,
    href: fleet.chartUrl,
  };
}

function slimOverviewEvaluation(evaluation: OverviewEvaluation): OverviewEvaluation {
  if (evaluation.bounds.blick === "heute" || evaluation.bounds.blick === "gestern") {
    return evaluation;
  }
  const factors = {} as OverviewEvaluation["factors"];
  for (const [key, factor] of Object.entries(evaluation.factors)) {
    factors[Number(key) as keyof OverviewEvaluation["factors"]] = {
      ...factor,
      quarterPoints: [],
    };
  }
  return { ...evaluation, factors };
}

function buildOverviewsBundle(args: {
  slots: NonNullable<Awaited<ReturnType<typeof loadGermanyPower>>["parsed"]>["slots"];
  offshorePresent: boolean;
  days: ResidualDay[];
  fleet: LiveFleetPublic;
  prices: Awaited<ReturnType<typeof loadDayAheadRange>>["prices"];
  lastSurplus: string | null;
  todayKey: string;
  stale: boolean;
  dataStand: string;
}): OverviewsBundle {
  const byBlick = {} as Record<OverviewBlick, OverviewEvaluation>;
  for (const blick of OVERVIEW_BLICKS) {
    const bounds = overviewBounds(blick, args.todayKey);
    const evaluation = evaluateOverview({
      bounds,
      slots: args.slots,
      offshorePresent: args.offshorePresent,
      days: args.days,
      powerMw: args.fleet.powerMw,
      energyMwh: args.fleet.energyMwh,
      prices: args.prices,
      lastSurplusDateBerlin: args.lastSurplus,
      todayKey: args.todayKey,
    });
    byBlick[blick] = slimOverviewEvaluation(evaluation);
  }
  return {
    byBlick,
    stale: args.stale && !powerSeriesFresh(args.slots),
    dataStand: args.dataStand,
    fleetMissing: false,
    curtailmentQuarterDailyGwh: EE_CURTAILMENT_Q2_2026_GWH / 91,
    curtailmentQuarterLabel: "Q2 2026",
    curtailmentPublishedLabel: "12.10.2026",
  };
}

function untilOf(day: ResidualDay | null, todayKey: string): string | null {
  if (!day || day.dateBerlin !== todayKey || day.slots.length === 0) {
    return null;
  }
  const last = day.slots[day.slots.length - 1];
  if (last.hourBerlin === 23 && last.minuteBerlin === 45) {
    return null;
  }
  return uniqueQuarterLabels([last.timestampIso])[0] ?? null;
}

async function loadSurplusDayReportForView(
  days: ResidualDay[],
  todayKey: string,
  startKey: string,
  fleet: LiveFleetPublic,
  now: Date
): Promise<SurplusDayReport | null> {
  const lastSurplus = pickSurplusDay(days, todayKey)?.day.dateBerlin ?? null;
  let key = startKey;
  for (let step = 0; step < 21; step += 1) {
    try {
      const flow = await getGermanyEnergyFlowForBerlinRange(
        resolveGermanyEnergyFlowBerlinRangeForDate(key, now),
        now
      );
      if (flow && isPublishedFullBerlinDay(flow)) {
        return buildSurplusDayReport(
          flow,
          { powerMw: fleet.powerMw, energyMwh: fleet.energyMwh },
          { lastSurplusDateBerlin: lastSurplus }
        );
      }
    } catch {
      /* try older day */
    }
    const older = prevBerlinDateKey(key);
    if (older === key) {
      break;
    }
    key = older;
  }
  return null;
}

export type GermanyViewPath = "/" | "/live" | "/tag" | "/monat";

export async function loadGermanyView(
  now: Date,
  path: GermanyViewPath,
  query: { tag?: string | string[]; zeitraum?: string | string[] }
): Promise<GermanyView> {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const requestedTagEarly = path === "/tag" ? (Array.isArray(query.tag) ? query.tag[0] : query.tag) : undefined;
  if (
    path === "/tag" &&
    requestedTagEarly &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedTagEarly) &&
    tagRollSnapshotEligibleForView(requestedTagEarly, todayKey)
  ) {
    return buildGermanyViewFromTagSnapshot(requestedTagEarly, now);
  }

  const homeLike = path === "/" || path === "/monat";
  const requestedTagRaw =
    path === "/tag" ? (Array.isArray(query.tag) ? query.tag[0] : query.tag) : undefined;
  const requestedRange = Array.isArray(query.zeitraum) ? query.zeitraum[0] : query.zeitraum;
  const yesterdayKey = prevBerlinDateKey(todayKey);
  const priceStart = addBerlinCalendarDays(todayKey, -61);
  const [fleet, power, price, priceRange, frequency] = await Promise.all([
    loadLargeBatteryFleet(),
    loadGermanyPower(now),
    loadDayAheadDay(todayKey),
    loadDayAheadRange(priceStart, todayKey),
    loadFreiburgFrequency(now),
  ]);
  const parsed = power.parsed;
  const days = parsed ? residualDaysFromSlots(parsed) : [];
  const earliestTag = addBerlinCalendarDays(todayKey, -30);
  let requestedTagStatus: RequestedTagStatus = "default";
  let requestedTag: string | null = null;
  let chosen: { day: ResidualDay; fallback: boolean } | null = null;

  if (requestedTagRaw && /^\d{4}-\d{2}-\d{2}$/.test(requestedTagRaw)) {
    requestedTag = requestedTagRaw;
    if (requestedTag < earliestTag || requestedTag > todayKey) {
      requestedTagStatus = "ausserhalb";
    } else {
      const tagged: ResidualDay | undefined = days.find((day) => day.dateBerlin === requestedTag);
      if (!tagged) {
        requestedTagStatus = "ausserhalb";
      } else {
        const day = tagged;
        const usable = dayIsUsable(day);
        requestedTagStatus = usable ? "ok" : "unvollstaendig";
        chosen = { day, fallback: day.dateBerlin !== todayKey };
      }
    }
  }

  if (
    !chosen &&
    !(requestedTag && (requestedTagStatus === "ausserhalb" || requestedTagStatus === "unvollstaendig"))
  ) {
    if (homeLike) {
      const key = pickLastCompleteDayKey(days, todayKey);
      const completeDay = days.find((day) => day.dateBerlin === key);
      if (completeDay && dayIsUsable(completeDay)) {
        chosen = { day: completeDay, fallback: completeDay.dateBerlin !== todayKey };
      }
    }
    if (!chosen) {
      const published = choosePublishedDay(days, todayKey);
      chosen = published ? { day: published.day, fallback: published.fallback } : null;
    }
  }

  const example = chooseStorageDay(days, todayKey);
  const endDate = chosen?.day.dateBerlin ?? todayKey;
  const publicFleet = fleetPublic(fleet);
  const readings = buildLiveReadings({
    slots: parsed?.slots ?? [],
    offshorePresent: parsed?.offshorePresent ?? true,
    powerStale: power.stale,
    prices: price.prices,
    priceStale: price.stale,
    frequency: frequency.sample,
    frequencyStale: frequency.stale,
    now,
  });
  const board = buildPowerBoard({
    slots: parsed?.slots ?? [],
    offshorePresent: parsed?.offshorePresent ?? true,
    range: homeLike ? parseMixRange(requestedRange) : "tag",
    endDate,
    todayKey,
    path,
    fleet: publicFleet ? { powerGw: publicFleet.powerGw, energyGwh: publicFleet.energyGwh } : null,
    stale: power.stale && !powerSeriesFresh(parsed?.slots ?? []),
    tag: path === "/tag" && chosen && chosen.day.dateBerlin !== todayKey ? chosen.day.dateBerlin : null,
  });

  let surplusDay: SurplusDayReport | null = null;
  if (path !== "/tag" && parseMixRange(requestedRange) === "tag" && publicFleet) {
    surplusDay = await loadSurplusDayReportForView(days, todayKey, endDate, publicFleet, now);
  }

  let overviews: OverviewsBundle | null = null;
  let dayOverview: OverviewEvaluation | null = null;
  if (parsed && publicFleet) {
    const lastSurplus = pickSurplusDay(days, todayKey)?.day.dateBerlin ?? null;
    const mergedPrices = mergeDayAheadPrices(priceRange.prices, price.prices);
    if (path !== "/tag") {
      overviews = buildOverviewsBundle({
        slots: parsed.slots,
        offshorePresent: parsed.offshorePresent,
        days,
        fleet: publicFleet,
        prices: mergedPrices,
        lastSurplus,
        todayKey,
        stale: power.stale && !powerSeriesFresh(parsed?.slots ?? []),
        dataStand: readings.stand,
      });
    }
    if (chosen?.day) {
      const dayBounds = overviewBounds("gestern", todayKey);
      dayBounds.blick = "tag";
      dayBounds.startKey = chosen.day.dateBerlin;
      dayBounds.endKey = chosen.day.dateBerlin;
      dayBounds.dayCount = 1;
      dayBounds.capEndAtLastSlot = chosen.day.dateBerlin === todayKey;
      dayOverview = evaluateOverview({
        bounds: dayBounds,
        slots: parsed.slots,
        offshorePresent: parsed.offshorePresent,
        days,
        powerMw: publicFleet.powerMw,
        energyMwh: publicFleet.energyMwh,
        prices: mergedPrices,
        lastSurplusDateBerlin: lastSurplus,
        todayKey,
      });
    }
  }

  const lastCompleteDayKey = pickLastCompleteDayKey(days, todayKey);
  const kopfDayKey = lastCompleteDayKey;
  const homeTagesDayKey =
    path === "/" && parsed
      ? (pickNewestStrictCompletePowerDayKey(parsed.slots, parsed.offshorePresent, todayKey) ?? kopfDayKey)
      : kopfDayKey;
  const kopfDay = days.find((day) => day.dateBerlin === homeTagesDayKey) ?? null;
  let auffaelligkeitRecords: TagesKennzahlRecord[] | null = null;
  if (parsed && publicFleet) {
    const mergedPrices = mergeDayAheadPrices(priceRange.prices, price.prices);
    auffaelligkeitRecords = buildTagesKennzahlRecords({
      days,
      slots: parsed.slots,
      offshorePresent: parsed.offshorePresent,
      prices: mergedPrices,
      powerMw: publicFleet.powerMw,
      energyMwh: publicFleet.energyMwh,
    });
  }

  const evaluationWindow =
    path === "/" && overviews ? overviews.byBlick["30tage"].bounds : null;
  const homeDayPanel =
    path === "/" && parsed && publicFleet && kopfDay
      ? buildHomeDayPanelData({
          dateKey: homeTagesDayKey,
          slots: parsed.slots,
          offshorePresent: parsed.offshorePresent,
          allDays: days,
          day: kopfDay,
          fleet: publicFleet,
          fetchStand: readings.stand,
          fleetProvenance: lastFleetDataProvenance(),
          evaluationWindow,
        })
      : null;

  return {
    todayKey,
    dispatch: {
      fleet: publicFleet,
      day: chosen?.day ?? null,
      fallback: Boolean(chosen?.fallback),
    },
    exampleDispatch: {
      fleet: publicFleet,
      day: example?.day ?? null,
      fallback: Boolean(example?.fallback),
    },
    until: untilOf(chosen?.day ?? null, todayKey),
    board,
    stand: readings.stand,
    readings: readings.readings,
    surplusDay,
    overviews,
    dayOverview,
    requestedTag,
    requestedTagStatus,
    auffaelligkeitRecords,
    kopfDayKey,
    homeTagesDayKey: path === "/" ? homeTagesDayKey : null,
    lastCompleteDayKey,
    homeDayPanel,
    kopfDay,
  };
}
