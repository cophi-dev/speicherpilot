import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import {
  BESS_DISPATCH_INITIAL_SOC_FRAC,
  BESS_DISPATCH_ROUND_TRIP_EFFICIENCY,
  BESS_DISPATCH_SOC_MAX_FRAC,
  BESS_DISPATCH_SOC_MIN_FRAC,
  simulateBessDispatch,
  type DispatchResult,
} from "@/lib/bessDispatchSimulator";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { REFERENCE_PARK } from "@/lib/referencePark";

/**
 * Drawing scale for the site ring, not a second power rating.
 * Full discharge reaches 70 drawing-units. Full charge only dips to −16,
 * so the centre label keeps a clear hole. The table carries real MW.
 */
const DRAW_DISCHARGE = 70;
const DRAW_CHARGE = 16;

export type ReferenceParkModelDay = {
  dateBerlin: string;
  points: LiveDispatchPoint[];
  efficiency: number;
  socMinFrac: number;
  socMaxFrac: number;
  initialSocFrac: number;
  powerMw: number;
  energyMwh: number;
};

export type ReferenceParkDispatchInput = {
  prices: DayAheadPricePoint[];
  dateBerlin: string;
  powerMw?: number;
  energyMwh?: number;
  /** Share of nameplate. Omit it to keep the engine start at 50 %. */
  initialSocFrac?: number;
};

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function berlinClock(unixMs: number): { hour: number; minute: number } {
  const parts = clockFormatter.formatToParts(new Date(unixMs));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { hour, minute };
}

type Slot = { unixMs: number; hour: number; price: number };

function slotsFromPrices(prices: DayAheadPricePoint[], dateBerlin: string): Slot[] | null {
  const onDay = prices
    .filter((point) => Number.isFinite(point.unixMs) && Number.isFinite(point.eurPerMwh))
    .filter((point) => formatBerlinDateKeyFromUtcDate(new Date(point.unixMs)) === dateBerlin)
    .sort((a, b) => a.unixMs - b.unixMs);
  if (onDay.length < 4) {
    return null;
  }
  const gaps: number[] = [];
  for (let index = 1; index < onDay.length; index += 1) {
    gaps.push(onDay[index]!.unixMs - onDay[index - 1]!.unixMs);
  }
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? 0;
  const hourly = median > 30 * 60 * 1000;
  const slots: Slot[] = [];
  for (const point of onDay) {
    const copies = hourly ? 4 : 1;
    for (let quarter = 0; quarter < copies; quarter += 1) {
      const unixMs = point.unixMs + quarter * 15 * 60 * 1000;
      if (formatBerlinDateKeyFromUtcDate(new Date(unixMs)) !== dateBerlin) {
        continue;
      }
      const clock = berlinClock(unixMs);
      slots.push({ unixMs, hour: clock.hour + clock.minute / 60, price: point.eurPerMwh });
    }
  }
  return slots.length >= 4 ? slots : null;
}

/** Engine run for the reference park. Returns null when the price series is too short. */
export function dispatchReferencePark(input: ReferenceParkDispatchInput): DispatchResult | null {
  const slots = slotsFromPrices(input.prices, input.dateBerlin);
  if (!slots) {
    return null;
  }
  const powerMw = input.powerMw ?? REFERENCE_PARK.powerMw;
  const energyMwh = input.energyMwh ?? REFERENCE_PARK.energyMwh;
  return simulateBessDispatch({
    powerMW: powerMw,
    energyMWh: energyMwh,
    efficiency: BESS_DISPATCH_ROUND_TRIP_EFFICIENCY,
    strategy: "arbitrage_gap",
    initialSocFrac: input.initialSocFrac,
    day: {
      dateBerlin: input.dateBerlin,
      timestampsIso: slots.map((slot) => new Date(slot.unixMs).toISOString()),
      hourBerlin: slots.map((slot) => slot.hour),
      loadMw: slots.map(() => null),
      totalGenerationMw: slots.map(() => null),
      residualLoadMw: slots.map(() => 0),
      renewableShareOfLoadPct: slots.map(() => null),
      spotPriceEurPerMwh: slots.map((slot) => slot.price),
    },
  });
}

export function referenceParkRingKw(signedMw: number, nameplateMw: number): number {
  if (!Number.isFinite(signedMw) || !(nameplateMw > 0)) {
    return 0;
  }
  const share = Math.max(-1, Math.min(1, signedMw / nameplateMw));
  return share >= 0 ? share * DRAW_DISCHARGE : share * DRAW_CHARGE;
}

export function referenceParkModelDay(input: ReferenceParkDispatchInput): ReferenceParkModelDay | null {
  const powerMw = input.powerMw ?? REFERENCE_PARK.powerMw;
  const energyMwh = input.energyMwh ?? REFERENCE_PARK.energyMwh;
  const result = dispatchReferencePark({ ...input, powerMw, energyMwh });
  if (!result) {
    return null;
  }
  const points: LiveDispatchPoint[] = result.quarters.map((quarter) => {
    const draw = referenceParkRingKw(quarter.powerMw, powerMw);
    return {
      hour: quarter.hourBerlin,
      ohneMw: draw,
      mitMw: draw,
      chargeMw: quarter.powerMw < 0 ? -quarter.powerMw : 0,
      dischargeMw: quarter.powerMw > 0 ? quarter.powerMw : 0,
      soc: quarter.socPct / 100,
    };
  });
  return {
    dateBerlin: input.dateBerlin,
    points,
    efficiency: result.params.efficiency,
    socMinFrac: result.operational.socMinFrac,
    socMaxFrac: result.operational.socMaxFrac,
    initialSocFrac: input.initialSocFrac ?? BESS_DISPATCH_INITIAL_SOC_FRAC,
    powerMw,
    energyMwh,
  };
}

export { BESS_DISPATCH_SOC_MIN_FRAC, BESS_DISPATCH_SOC_MAX_FRAC };
