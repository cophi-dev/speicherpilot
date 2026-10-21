import { simulateBessDispatch, type BessDispatchDayInput } from "@/lib/bessDispatchSimulator";
import type { LargeBatteryFleetSource } from "@/lib/largeBatteryFleet";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

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

/** Visible model assumption. Not a measured round-trip efficiency. */
export const LIVE_DISPATCH_RTE = 0.88;

export const LIVE_DISPATCH_FACTORS = [1, 2, 5, 10] as const;

export type LiveDispatchFactor = (typeof LIVE_DISPATCH_FACTORS)[number];

const MIN_SLOTS = 4;

export function parseLiveFactor(value: string | null | undefined): LiveDispatchFactor {
  const parsed = Number(value);
  return LIVE_DISPATCH_FACTORS.includes(parsed as LiveDispatchFactor) ? (parsed as LiveDispatchFactor) : 5;
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
  /** Evening window 17:00–21:00 is in the published series. */
  eveningPublished: boolean;
  points: LiveDispatchPoint[];
  /** Maximum residual in the evening window, GW. Null when that window is not published. */
  eveningPeakBeforeGw: number | null;
  eveningPeakAfterGw: number | null;
  /** Energy delivered to the grid, GWh. This is the on-chart label. */
  dischargedGwh: number;
  /** Energy drawn from the grid, GWh. Includes round-trip losses. Tooltip only. */
  chargedGwh: number;
  powerMw: number;
  energyMwh: number;
  rte: number;
};

function residualMw(slot: ResidualSlot): number {
  return slot.loadMw - slot.windMw - slot.solarMw;
}

export function dayIsUsable(day: ResidualDay | null | undefined): day is ResidualDay {
  return Boolean(day && day.slots.length >= MIN_SLOTS);
}

export function chooseDispatchDay(
  today: ResidualDay | null,
  yesterday: ResidualDay | null
): { day: ResidualDay; fallback: boolean } | null {
  if (dayIsUsable(today)) {
    return { day: today, fallback: false };
  }
  if (dayIsUsable(yesterday)) {
    return { day: yesterday, fallback: true };
  }
  return null;
}

export function toDispatchDay(day: ResidualDay): BessDispatchDayInput {
  return {
    dateBerlin: day.dateBerlin,
    timestampsIso: day.slots.map((slot) => slot.timestampIso),
    hourBerlin: day.slots.map((slot) => slot.hourBerlin + slot.minuteBerlin / 60),
    loadMw: day.slots.map((slot) => slot.loadMw),
    totalGenerationMw: day.slots.map((slot) => slot.windMw + slot.solarMw),
    residualLoadMw: day.slots.map(residualMw),
    renewableShareOfLoadPct: day.slots.map((slot) =>
      slot.loadMw > 0 ? ((slot.windMw + slot.solarMw) / slot.loadMw) * 100 : null
    ),
  };
}

function eveningPeakMw(points: LiveDispatchPoint[], key: "ohneMw" | "mitMw"): number | null {
  const evening = points.filter((point) => point.hour >= 17 && point.hour < 21);
  if (evening.length === 0) {
    return null;
  }
  return evening.reduce((max, point) => Math.max(max, point[key]), Number.NEGATIVE_INFINITY);
}

export function buildLiveDispatchStory(input: {
  day: ResidualDay;
  fallback: boolean;
  powerMw: number;
  energyMwh: number;
  factor: LiveDispatchFactor;
  rte?: number;
}): LiveDispatchStory {
  const rte = input.rte ?? LIVE_DISPATCH_RTE;
  const scaled = scaleFleet(input.powerMw, input.energyMwh, input.factor);
  const result = simulateBessDispatch({
    powerMW: scaled.powerMw,
    energyMWh: scaled.energyMwh,
    efficiency: rte,
    strategy: "arbitrage_gap",
    day: toDispatchDay(input.day),
  });
  const points: LiveDispatchPoint[] = result.quarters.map((quarter) => {
    const chargeMw = Math.max(0, -quarter.powerMw);
    const dischargeMw = Math.max(0, quarter.powerMw);
    return {
      hour: quarter.hourBerlin,
      ohneMw: quarter.residualLoadMw,
      mitMw: quarter.residualLoadMw + chargeMw - dischargeMw,
      chargeMw,
      dischargeMw,
      soc: quarter.socPct / 100,
    };
  });
  const before = eveningPeakMw(points, "ohneMw");
  const after = eveningPeakMw(points, "mitMw");
  return {
    factor: input.factor,
    dateBerlin: input.day.dateBerlin,
    fallback: input.fallback,
    eveningPublished: before !== null,
    points,
    eveningPeakBeforeGw: before === null ? null : before / 1000,
    eveningPeakAfterGw: after === null ? null : after / 1000,
    dischargedGwh: result.economics.energyDischargedToGridMwh / 1000,
    chargedGwh: result.economics.energyChargedFromGridMwh / 1000,
    powerMw: scaled.powerMw,
    energyMwh: scaled.energyMwh,
    rte,
  };
}

/** SoC at the engine floor (10 %) or ceiling (90 %). */
export function socEdge(socPct: number): "empty" | "full" | "between" {
  if (socPct <= 10.05) {
    return "empty";
  }
  if (socPct >= 89.95) {
    return "full";
  }
  return "between";
}
