import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { formatBerlinDateKeyFromUtcDate, addBerlinCalendarDays } from "@/lib/berlinCalendar";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { buildLiveReadings } from "@/lib/liveStrip";
import { chooseStorageDay, dayIsUsable, type LiveFleetPublic } from "@/lib/liveFleetDispatch";
import type { LargeBatteryFleetSource } from "@/lib/largeBatteryFleet";
import { evaluateOverview, type OverviewEvaluation } from "@/lib/overviewChain";
import { buildPowerBoard, type PowerBoardModel } from "@/lib/powerBoard";
import type { PowerSlot } from "@/lib/powerMix";
import { mergeDayAheadPrices } from "@/lib/quarterPrices";
import { pickSurplusDay, type ResidualDay } from "@/lib/windSolarResidual";
import { overviewBounds } from "@/lib/overviewRange";
import { pickLastCompleteDayKey } from "@/lib/completeBerlinDay";
import type { GermanyView, RequestedTagStatus } from "@/lib/germanyView";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";

export type TagRollSnapshot = {
  version: number;
  coverageStart: string;
  coverageEnd: string;
  builtAt: string;
  dataStand: string;
  offshorePresent: boolean;
  powerSlots: PowerSlot[];
  records: TagesKennzahlRecord[];
  days: ResidualDay[];
  prices: DayAheadPricePoint[];
  fleet: {
    powerGw: number;
    energyGwh: number;
    powerMw: number;
    energyMwh: number;
    updatedLabel: string;
    source: string;
  };
};

let cachedSnapshot: TagRollSnapshot | null = null;

export function loadTagRollSnapshot(): TagRollSnapshot {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }
  const path = join(process.cwd(), "data/tag-pages/roll-snapshot.json");
  cachedSnapshot = JSON.parse(readFileSync(path, "utf8")) as TagRollSnapshot;
  return cachedSnapshot;
}

export function tagRollSnapshotCovers(dayKey: string): boolean {
  const snap = loadTagRollSnapshot();
  return dayKey >= snap.coverageStart && dayKey <= snap.coverageEnd;
}

function untilOf(day: ResidualDay | null, todayKey: string): string | null {
  if (!day || day.dateBerlin === todayKey) {
    return null;
  }
  const last = day.slots[day.slots.length - 1];
  return last?.timestampIso ?? null;
}

export function buildGermanyViewFromTagSnapshot(dayKey: string, now: Date): GermanyView {
  const snap = loadTagRollSnapshot();
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const earliestTag = addBerlinCalendarDays(todayKey, -30);
  const publicFleet: LiveFleetPublic = {
    powerMw: snap.fleet.powerMw,
    energyMwh: snap.fleet.energyMwh,
    powerGw: snap.fleet.powerGw,
    energyGwh: snap.fleet.energyGwh,
    updatedLabel: { de: snap.fleet.updatedLabel, en: snap.fleet.updatedLabel },
    source: snap.fleet.source as LargeBatteryFleetSource,
    href: "https://battery-charts.de",
  };

  let requestedTagStatus: RequestedTagStatus = "default";
  if (dayKey < earliestTag || dayKey > todayKey) {
    requestedTagStatus = "ausserhalb";
  } else {
    const tagged = snap.days.find((d) => d.dateBerlin === dayKey);
    if (!tagged) {
      requestedTagStatus = "ausserhalb";
    } else {
      requestedTagStatus = dayIsUsable(tagged) ? "ok" : "unvollstaendig";
    }
  }

  const day = snap.days.find((d) => d.dateBerlin === dayKey) ?? null;
  const chosen = day && requestedTagStatus === "ok" ? { day, fallback: day.dateBerlin !== todayKey } : null;
  const example = chooseStorageDay(snap.days, todayKey);

  const readings = buildLiveReadings({
    slots: snap.powerSlots,
    offshorePresent: snap.offshorePresent,
    powerStale: false,
    prices: [],
    priceStale: false,
    frequency: null,
    frequencyStale: false,
    now,
  });

  const board: PowerBoardModel = buildPowerBoard({
    slots: snap.powerSlots,
    offshorePresent: snap.offshorePresent,
    range: "tag",
    endDate: dayKey,
    todayKey,
    path: "/tag",
    fleet: { powerGw: publicFleet.powerGw, energyGwh: publicFleet.energyGwh },
    stale: false,
    tag: dayKey !== todayKey ? dayKey : null,
  });

  const lastCompleteDayKey = pickLastCompleteDayKey(snap.days, todayKey);
  const mergedPrices = mergeDayAheadPrices(snap.prices, []);

  let dayOverview: OverviewEvaluation | null = null;
  if (chosen?.day) {
    const dayBounds = overviewBounds("gestern", todayKey);
    dayBounds.blick = "tag";
    dayBounds.startKey = chosen.day.dateBerlin;
    dayBounds.endKey = chosen.day.dateBerlin;
    dayBounds.dayCount = 1;
    dayBounds.capEndAtLastSlot = chosen.day.dateBerlin === todayKey;
    const lastSurplus = pickSurplusDay(snap.days, todayKey)?.day.dateBerlin ?? null;
    dayOverview = evaluateOverview({
      bounds: dayBounds,
      slots: snap.powerSlots,
      offshorePresent: snap.offshorePresent,
      days: snap.days,
      powerMw: publicFleet.powerMw,
      energyMwh: publicFleet.energyMwh,
      prices: mergedPrices,
      lastSurplusDateBerlin: lastSurplus,
      todayKey,
    });
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
    stand: snap.dataStand,
    readings: readings.readings,
    surplusDay: null,
    overviews: null,
    dayOverview,
    requestedTag: dayKey,
    requestedTagStatus,
    auffaelligkeitRecords: snap.records,
    kopfDayKey: lastCompleteDayKey,
    homeTagesDayKey: null,
    lastCompleteDayKey,
    homeDayPanel: null,
    kopfDay: snap.days.find((d) => d.dateBerlin === lastCompleteDayKey) ?? null,
  };
}
