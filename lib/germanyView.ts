import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildLiveReadings, type StripReading } from "@/lib/liveStrip";
import { choosePublishedDay, chooseStorageDay, dayIsUsable, type LiveDispatchInput, type LiveFleetPublic } from "@/lib/liveFleetDispatch";
import { loadDayAheadDay, loadFreiburgFrequency, loadGermanyPower } from "@/lib/loadGermanyPower";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { getGermanyEnergyFlowForBerlinRange } from "@/lib/energyChartsApi";
import { resolveGermanyEnergyFlowBerlinRangeForDate } from "@/lib/germanyEnergyFlowPeriod";
import { buildSurplusDayReport, type SurplusDayReport } from "@/lib/surplusDaySimulation";
import { buildPowerBoard, type PowerBoardModel } from "@/lib/powerBoard";
import { parseMixRange, residualDaysFromSlots } from "@/lib/powerMix";
import { uniqueQuarterLabels } from "@/lib/quarterMarks";
import type { ResidualDay } from "@/lib/windSolarResidual";

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

export async function loadGermanyView(
  now: Date,
  path: "/" | "/live",
  query: { tag?: string | string[]; zeitraum?: string | string[] }
): Promise<GermanyView> {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const requestedTag = Array.isArray(query.tag) ? query.tag[0] : query.tag;
  const requestedRange = Array.isArray(query.zeitraum) ? query.zeitraum[0] : query.zeitraum;
  const [fleet, power, price, frequency] = await Promise.all([
    loadLargeBatteryFleet(),
    loadGermanyPower(now),
    loadDayAheadDay(todayKey),
    loadFreiburgFrequency(now),
  ]);
  const parsed = power.parsed;
  const days = parsed ? residualDaysFromSlots(parsed) : [];
  const tagged = requestedTag && /^\d{4}-\d{2}-\d{2}$/.test(requestedTag) ? days.find((day) => day.dateBerlin === requestedTag) : null;
  const chosen = tagged && dayIsUsable(tagged)
    ? { day: tagged, fallback: tagged.dateBerlin !== todayKey }
    : choosePublishedDay(days, todayKey);
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
    range: parseMixRange(requestedRange),
    endDate,
    todayKey,
    path,
    fleet: publicFleet ? { powerGw: publicFleet.powerGw, energyGwh: publicFleet.energyGwh } : null,
    stale: power.stale,
    tag: chosen && chosen.day.dateBerlin !== todayKey ? chosen.day.dateBerlin : null,
  });

  let surplusDay: SurplusDayReport | null = null;
  if (parseMixRange(requestedRange) === "tag" && publicFleet) {
    try {
      const flow = await getGermanyEnergyFlowForBerlinRange(
        resolveGermanyEnergyFlowBerlinRangeForDate(endDate, now),
        now
      );
      if (flow) {
        surplusDay = buildSurplusDayReport(flow, {
          powerMw: publicFleet.powerMw,
          energyMwh: publicFleet.energyMwh,
        });
      }
    } catch {
      surplusDay = null;
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
  };
}
