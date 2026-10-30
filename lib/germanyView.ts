import "server-only";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey, addBerlinCalendarDays } from "@/lib/berlinCalendar";
import { EE_CURTAILMENT_Q2_2026_GWH } from "@/lib/eeCurtailmentQuarterly";
import { buildLiveReadings, type StripReading } from "@/lib/liveStrip";
import { choosePublishedDay, chooseStorageDay, dayIsUsable, type LiveDispatchInput, type LiveFleetPublic } from "@/lib/liveFleetDispatch";
import { loadDayAheadDay, loadDayAheadRange, loadFreiburgFrequency, loadGermanyPower } from "@/lib/loadGermanyPower";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
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
import { parseMixRange, residualDaysFromSlots } from "@/lib/powerMix";
import { uniqueQuarterLabels } from "@/lib/quarterMarks";
import type { ResidualDay } from "@/lib/windSolarResidual";
import { pickSurplusDay } from "@/lib/windSolarResidual";

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
    stale: args.stale,
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

export async function loadGermanyView(
  now: Date,
  path: "/" | "/live",
  query: { tag?: string | string[]; zeitraum?: string | string[] }
): Promise<GermanyView> {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const requestedTagRaw = path === "/live" ? (Array.isArray(query.tag) ? query.tag[0] : query.tag) : undefined;
  const requestedRange = Array.isArray(query.zeitraum) ? query.zeitraum[0] : query.zeitraum;
  const yesterdayKey = prevBerlinDateKey(todayKey);
  const priceStart = addBerlinCalendarDays(yesterdayKey, -29);
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

  if (!chosen) {
    const published = choosePublishedDay(days, todayKey);
    chosen = published ? { day: published.day, fallback: published.fallback } : null;
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
    range: path === "/live" ? "tag" : parseMixRange(requestedRange),
    endDate,
    todayKey,
    path,
    fleet: publicFleet ? { powerGw: publicFleet.powerGw, energyGwh: publicFleet.energyGwh } : null,
    stale: power.stale,
    tag: path === "/live" && chosen && chosen.day.dateBerlin !== todayKey ? chosen.day.dateBerlin : null,
  });

  let surplusDay: SurplusDayReport | null = null;
  if (parseMixRange(requestedRange) === "tag" && publicFleet) {
    surplusDay = await loadSurplusDayReportForView(days, todayKey, endDate, publicFleet, now);
  }

  let overviews: OverviewsBundle | null = null;
  let dayOverview: OverviewEvaluation | null = null;
  if (parsed && publicFleet) {
    const lastSurplus = pickSurplusDay(days, todayKey)?.day.dateBerlin ?? null;
    const mergedPrices = mergeDayAheadPrices(priceRange.prices, price.prices);
    overviews = buildOverviewsBundle({
      slots: parsed.slots,
      offshorePresent: parsed.offshorePresent,
      days,
      fleet: publicFleet,
      prices: mergedPrices,
      lastSurplus,
      todayKey,
      stale: power.stale,
      dataStand: readings.stand,
    });
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
  };
}
