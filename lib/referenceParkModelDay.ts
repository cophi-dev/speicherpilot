import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import {
  BESS_DISPATCH_INITIAL_SOC_FRAC,
  BESS_DISPATCH_SOC_MAX_FRAC,
  BESS_DISPATCH_SOC_MIN_FRAC,
  simulateBessDispatch,
  type DispatchResult,
} from "@/lib/bessDispatchSimulator";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { KW_K, KW_R0, socRingGeometry } from "@/lib/dayRingScale";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { REFERENCE_PARK } from "@/lib/referencePark";

/**
 * Gap outside the state-of-charge ring. The power band starts beyond it,
 * so the centre copy stays inside the hole.
 */
export const REFERENCE_BAND_GAP = 18;

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

/** Plain sentence under the ring. The score weights live on /methodik#modelltag. */
export const REFERENCE_PARK_DISPATCH_RULE = {
  de: "Modell: lädt mittags in den billigsten Viertelstunden und gibt abends (Vorrang 17–21 Uhr) in den teuersten ab, höchstens so viel, wie es an diesem Tag geladen hat.",
  en: "Model: it charges at midday in the cheapest quarter-hours and discharges in the evening (priority 17:00–21:00) in the most expensive ones, at most as much as it charged on this day.",
} as const;

/** Engine run for the reference park. Returns null when the price series is too short. */
export function dispatchReferencePark(input: ReferenceParkDispatchInput): DispatchResult | null {
  const slots = slotsFromPrices(input.prices, input.dateBerlin);
  if (!slots) {
    return null;
  }
  const powerMw = input.powerMw ?? REFERENCE_PARK.powerMw;
  const energyMwh = input.energyMwh ?? REFERENCE_PARK.energyMwh;
  const startMwh = (input.initialSocFrac ?? BESS_DISPATCH_INITIAL_SOC_FRAC) * energyMwh;
  const day = {
    dateBerlin: input.dateBerlin,
    timestampsIso: slots.map((slot) => new Date(slot.unixMs).toISOString()),
    hourBerlin: slots.map((slot) => slot.hour),
    loadMw: slots.map(() => null),
    totalGenerationMw: slots.map(() => null),
    residualLoadMw: slots.map(() => 0),
    renewableShareOfLoadPct: slots.map(() => null),
    spotPriceEurPerMwh: slots.map((slot) => slot.price),
  };
  const run = (maxDischargeSlots?: number) =>
    simulateBessDispatch({
      powerMW: powerMw,
      energyMWh: energyMwh,
      efficiency: ROUND_TRIP_EFFICIENCY,
      strategy: "arbitrage_gap",
      initialSocFrac: input.initialSocFrac,
      maxDischargeSlots,
      day,
    });

  // Same-day close: drop whole discharge quarter-hours until the day no longer
  // spends the opening inventory. A previous day's end would only move the gap.
  let cap: number | undefined;
  let result = run();
  for (let step = 0; step <= slots.length; step += 1) {
    const endMwh = result.quarters.at(-1)?.socMwh ?? startMwh;
    if (endMwh + 1e-6 >= startMwh) {
      return result;
    }
    const used = result.quarters.filter((quarter) => quarter.powerMw > 1e-6).length;
    const next = used - 1;
    if (next < 0 || (cap !== undefined && next >= cap)) {
      return result;
    }
    cap = next;
    result = run(cap);
  }
  return result;
}

/**
 * Radii for the reference ring. Full nameplate power reaches either end.
 * Nothing is drawn inside `center`, which is the state-of-charge ring's inner edge.
 */
export function referenceParkBandLimits(bold = false): { inner: number; zero: number; outer: number; center: number } {
  const soc = socRingGeometry("kW", bold);
  const center = soc.innerEdge;
  const inner = center + soc.width + REFERENCE_BAND_GAP;
  const zero = KW_R0;
  const outer = zero + (zero - inner);
  return { inner, zero, outer, center };
}

/** Drawing-units of one full nameplate swing. The utilisation scale uses this as its limit. */
export function referenceParkFullDrawKw(): number {
  const { zero, outer } = referenceParkBandLimits();
  return (outer - zero) / KW_K;
}

export function referenceParkRingKw(signedMw: number, nameplateMw: number): number {
  if (!Number.isFinite(signedMw) || !(nameplateMw > 0)) {
    return 0;
  }
  const share = Math.max(-1, Math.min(1, signedMw / nameplateMw));
  const { inner, zero, outer } = referenceParkBandLimits();
  const radius = share >= 0 ? zero + share * (outer - zero) : zero + share * (zero - inner);
  return (radius - zero) / KW_K;
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
