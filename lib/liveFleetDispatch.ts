import type { LargeBatteryFleetSource } from "@/lib/largeBatteryFleet";
import { dispatchPeakFleet, MORE_STORAGE_DISCHARGE_HOUR, MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import { windSolarSurplusMwh, type ResidualDay } from "@/lib/windSolarResidual";

/** Public fleet fields. The keyed Battery Charts URL stays on the server. */
export type LiveFleetPublic = {
  powerMw: number;
  energyMwh: number;
  powerGw: number;
  energyGwh: number;
  updatedLabel: { de: string; en: string };
  source: LargeBatteryFleetSource;
  href: string;
};

export type LiveDispatchInput = {
  fleet: LiveFleetPublic | null;
  day: ResidualDay | null;
  fallback: boolean;
};

/** Same documented round-trip efficiency as /methodik and `MORE_STORAGE_ROUND_TRIP`. Losses are taken on discharge. */
export const LIVE_DISPATCH_RTE = MORE_STORAGE_ROUND_TRIP;

const QUARTER_HOUR_H = 0.25;

export const LIVE_DISPATCH_FACTORS = [1, 2, 5, 10] as const;

export type LiveDispatchFactor = (typeof LIVE_DISPATCH_FACTORS)[number];

const MIN_SLOTS = 4;

export function parseLiveFactor(value: string | null | undefined): LiveDispatchFactor {
  const parsed = Number(value);
  return LIVE_DISPATCH_FACTORS.includes(parsed as LiveDispatchFactor) ? (parsed as LiveDispatchFactor) : 5;
}

/**
 * Evening-peak cut in GW, rounded once from the unrounded peaks.
 * Rounding each peak first and then subtracting is a different number (38.1 − 33.5 = 4.6).
 */
export function roundPeakDeltaGw(beforeGw: number, afterGw: number): number {
  return Math.round((beforeGw - afterGw) * 10) / 10;
}

export function scaleFleet(powerMw: number, energyMwh: number, factor: number) {
  return {
    powerMw: powerMw * factor,
    energyMwh: energyMwh * factor,
  };
}

export type LiveDispatchPoint = {
  hour: number;
  ohneMw: number;
  mitMw: number;
  chargeMw: number;
  dischargeMw: number;
  /** 0–1 of nameplate. */
  soc: number;
};

export type LiveDispatchStory = {
  factor: LiveDispatchFactor;
  dateBerlin: string;
  fallback: boolean;
  /** At least one quarter from 17:00 is in the published series. */
  eveningPublished: boolean;
  points: LiveDispatchPoint[];
  /** Maximum residual from 17:00, GW. Null when that part of the day is not published. */
  eveningPeakBeforeGw: number | null;
  eveningPeakAfterGw: number | null;
  /** Energy delivered to the grid, GWh. This is the on-chart label. */
  dischargedGwh: number;
  /** Energy drawn from the grid before 17:00, GWh. This is the charge-area label. */
  chargedGwh: number;
  /**
   * Energy still stored at the last quarter, GWh. The SoC band draws this as a share of nameplate.
   * Delivered energy is `(charged − this) × rte`, because losses are taken on discharge.
   */
  endSocGwh: number;
  /** Wind-plus-solar surplus before 17:00, GWh. The charge cannot exceed this. */
  surplusGwh: number;
  powerMw: number;
  energyMwh: number;
  rte: number;
};

export function dayIsUsable(day: ResidualDay | null | undefined): day is ResidualDay {
  return Boolean(day && day.slots.length >= MIN_SLOTS);
}

function hasEvening(day: ResidualDay | null | undefined): boolean {
  return Boolean(day?.slots.some((slot) => slot.hourBerlin >= 17 && slot.hourBerlin < 21));
}

export function chooseDispatchDay(
  today: ResidualDay | null,
  yesterday: ResidualDay | null
): { day: ResidualDay; fallback: boolean } | null {
  if (dayIsUsable(today) && hasEvening(today)) {
    return { day: today, fallback: false };
  }
  if (dayIsUsable(yesterday) && hasEvening(yesterday)) {
    return { day: yesterday, fallback: true };
  }
  if (dayIsUsable(today)) {
    return { day: today, fallback: false };
  }
  if (dayIsUsable(yesterday)) {
    return { day: yesterday, fallback: true };
  }
  return null;
}

function hasModelEvening(day: ResidualDay | null | undefined): boolean {
  return Boolean(day?.slots.some((slot) => slot.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR));
}

/** Prefer a day that can charge on surplus and still show the evening peak. */
export function chooseStorageDay(
  days: ResidualDay[],
  todayKey: string
): { day: ResidualDay; fallback: boolean } | null {
  const usable = days.filter(dayIsUsable).sort((left, right) => (left.dateBerlin < right.dateBerlin ? 1 : -1));
  const ready = usable.filter((day) => windSolarSurplusMwh(day.slots) > 0 && hasModelEvening(day));
  const todayReady = ready.find((day) => day.dateBerlin === todayKey);
  if (todayReady) {
    return { day: todayReady, fallback: false };
  }
  if (ready[0]) {
    return { day: ready[0], fallback: true };
  }
  const today = usable.find((day) => day.dateBerlin === todayKey);
  if (today) {
    return { day: today, fallback: false };
  }
  if (usable[0]) {
    return { day: usable[0], fallback: usable[0].dateBerlin !== todayKey };
  }
  return null;
}

export function buildLiveDispatchStory(input: {
  day: ResidualDay;
  fallback: boolean;
  powerMw: number;
  energyMwh: number;
  factor: LiveDispatchFactor;
}): LiveDispatchStory {
  const rte = LIVE_DISPATCH_RTE;
  const scaled = scaleFleet(input.powerMw, input.energyMwh, input.factor);
  const run = dispatchPeakFleet(input.day.slots, scaled.powerMw, scaled.energyMwh);
  let socMwh = 0;
  const points: LiveDispatchPoint[] = run.points.map((point) => {
    if (point.chargeMw > 0) {
      socMwh += point.chargeMw * QUARTER_HOUR_H;
    }
    if (point.dischargeMw > 0) {
      socMwh -= (point.dischargeMw * QUARTER_HOUR_H) / rte;
    }
    socMwh = Math.min(scaled.energyMwh, Math.max(0, socMwh));
    return {
      hour: point.hour,
      ohneMw: point.residualMw,
      mitMw: point.residualMw + point.chargeMw - point.dischargeMw,
      chargeMw: point.chargeMw,
      dischargeMw: point.dischargeMw,
      soc: scaled.energyMwh > 0 ? socMwh / scaled.energyMwh : 0,
    };
  });
  const before = run.eveningPeakGw;
  const after = before === null || run.peakReductionGw === null ? null : before - run.peakReductionGw;
  const dischargedMwh = run.points.reduce((sum, point) => sum + point.dischargeMw * QUARTER_HOUR_H, 0);
  const endSocGwh = ((points[points.length - 1]?.soc ?? 0) * scaled.energyMwh) / 1000;
  const surplusMwh = input.day.slots.reduce((sum, slot) => {
    if (slot.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR) {
      return sum;
    }
    return sum + Math.max(0, -(slot.loadMw - slot.windMw - slot.solarMw)) * QUARTER_HOUR_H;
  }, 0);
  return {
    factor: input.factor,
    dateBerlin: input.day.dateBerlin,
    fallback: input.fallback,
    eveningPublished: before !== null,
    points,
    eveningPeakBeforeGw: before,
    eveningPeakAfterGw: after,
    dischargedGwh: dischargedMwh / 1000,
    chargedGwh: run.storedMwh / 1000,
    endSocGwh,
    surplusGwh: surplusMwh / 1000,
    powerMw: scaled.powerMw,
    energyMwh: scaled.energyMwh,
    rte,
  };
}

/** SoC at empty (0 %) or full nameplate (100 %). The peak model starts empty and can fill. */
export function socEdge(socPct: number): "empty" | "full" | "between" {
  if (socPct <= 0.05) {
    return "empty";
  }
  if (socPct >= 99.95) {
    return "full";
  }
  return "between";
}
