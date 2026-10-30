import { chainFleetSoc, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { buildQuarterPriceMap, priceForQuarterIso } from "@/lib/quarterPrices";
import { LIVE_DISPATCH_FACTORS, scaleFleet, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { MORE_STORAGE_DISCHARGE_HOUR, MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import {
  periodFigures,
  slotsInRange,
  SURPLUS_DAY_GWH,
  type PowerSlot,
  windMw,
  solarMw,
} from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";
import type { OverviewBounds } from "@/lib/overviewRange";

const QUARTER_H = 0.25;
const SATURATION = 0.995;

export type OverviewQuarterPoint = {
  timestampIso: string;
  hour: number;
  surplusMw: number;
  residualMw: number;
  tradeMw: number | null;
  chargeMw: number;
  dischargeMw: number;
  residualMitMw: number;
  socFraction: number;
};

export type OverviewDayRow = {
  dateBerlin: string;
  surplusGwh: number;
  absorbedGwh: number;
  netImportGwh: number | null;
  socEndFraction: number;
};

export type OverviewFactorResult = {
  absorbedGwh: number;
  absorbedShare: number | null;
  dischargedGwh: number;
  dischargedDuringImportGwh: number;
  eveningPeakBeforeGw: number | null;
  eveningPeakAfterGw: number | null;
  endSocDeltaGwh: number;
  startSocGwh: number;
  endSocGwh: number;
  saturated: boolean;
  eurModelX1: number | null;
  zeroReason: string | null;
  dayRows: OverviewDayRow[];
  quarterPoints: OverviewQuarterPoint[];
  socSeries: Array<{ dateBerlin: string; socFraction: number }>;
};

export type OverviewObserved = {
  surplusGwh: number | null;
  surplusDays: number;
  dayCount: number;
  importGwh: number | null;
  exportGwh: number | null;
  netImportGwh: number | null;
  peakSurplusMw: number | null;
  peakSurplusIso: string | null;
  missingQuarters: number;
  totalQuarters: number;
  lastSurplusDateBerlin: string | null;
  openDay: boolean;
};

export type OverviewEvaluation = {
  bounds: OverviewBounds;
  observed: OverviewObserved;
  factors: Record<LiveDispatchFactor, OverviewFactorResult>;
};

function residualDaysInRange(days: ResidualDay[], startKey: string, endKey: string): ResidualDay[] {
  return days.filter((day) => day.dateBerlin >= startKey && day.dateBerlin <= endKey);
}

function filterSlotsForBounds(slots: PowerSlot[], bounds: OverviewBounds, lastIso: string | null): PowerSlot[] {
  let filtered = slotsInRange(slots, bounds.startKey, bounds.endKey);
  if (bounds.capEndAtLastSlot && lastIso) {
    filtered = filtered.filter((slot) => slot.timestampIso <= lastIso);
  }
  return filtered;
}

function eveningPeaksForDay(
  day: ResidualDay,
  chargeMw: Map<string, number>,
  dischargeMw: Map<string, number>
): { beforeGw: number | null; afterGw: number | null } {
  const evening = day.slots.filter((slot) => slot.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR);
  if (evening.length === 0) {
    return { beforeGw: null, afterGw: null };
  }
  let before = Number.NEGATIVE_INFINITY;
  let after = Number.NEGATIVE_INFINITY;
  for (const slot of evening) {
    const residual = slot.loadMw - slot.windMw - slot.solarMw;
    before = Math.max(before, residual);
    const dis = dischargeMw.get(slot.timestampIso) ?? 0;
    after = Math.max(after, residual - dis);
  }
  return {
    beforeGw: Number.isFinite(before) ? before / 1000 : null,
    afterGw: Number.isFinite(after) ? after / 1000 : null,
  };
}

function evaluateFactor(args: {
  days: ResidualDay[];
  slots: PowerSlot[];
  offshorePresent: boolean;
  powerMw: number;
  energyMwh: number;
  factor: LiveDispatchFactor;
  observedSurplusGwh: number | null;
  prices: DayAheadPricePoint[];
}): OverviewFactorResult {
  const scaled = scaleFleet(args.powerMw, args.energyMwh, args.factor);
  const run = chainFleetSoc(args.days, scaled.powerMw, scaled.energyMwh);
  const chargeByIso = new Map(run.points.map((point) => [point.timestampIso, point.chargeMw]));
  const dischargeByIso = new Map(run.points.map((point) => [point.timestampIso, point.dischargeMw]));
  const socByIso = new Map(run.points.map((point) => [point.timestampIso, point.soc]));

  const tradeByIso = new Map(args.slots.map((slot) => [slot.timestampIso, slot.tradeMw]));

  let dischargedDuringImportMwh = 0;
  const priceMap = buildQuarterPriceMap(args.prices);
  let eurSum = 0;
  let eurComplete = args.factor === 1;

  for (const point of run.points) {
    const trade = tradeByIso.get(point.timestampIso);
    const importMw = trade !== null && trade !== undefined && trade > 0 ? trade : 0;
    dischargedDuringImportMwh += Math.min(point.dischargeMw, importMw) * QUARTER_H;
    if (args.factor === 1 && eurComplete) {
      if (point.chargeMw <= 1e-6 && point.dischargeMw <= 1e-6) {
        continue;
      }
      const price = priceForQuarterIso(priceMap, point.timestampIso);
      if (price === null) {
        eurComplete = false;
        continue;
      }
      eurSum += (point.dischargeMw - point.chargeMw) * QUARTER_H * price;
    }
  }

  const absorbedGwh = run.chargedMwh / 1000;
  const dischargedGwh = run.dischargedMwh / 1000;
  const absorbedShare =
    args.observedSurplusGwh !== null && args.observedSurplusGwh > 1e-9
      ? absorbedGwh / args.observedSurplusGwh
      : null;
  const saturated =
    (args.observedSurplusGwh ?? 0) > 1e-9 &&
    absorbedGwh >= (args.observedSurplusGwh as number) * SATURATION - 1e-6;

  const eveningBefore: number[] = [];
  const eveningAfter: number[] = [];
  const dayRows: OverviewDayRow[] = [];
  const socSeries: OverviewFactorResult["socSeries"] = [];

  for (const day of args.days) {
    const daySlots = args.slots.filter((slot) => slot.dateBerlin === day.dateBerlin);
    const figures = periodFigures(daySlots, args.offshorePresent);
    let absorbedDayMwh = 0;
    for (const slot of day.slots) {
      absorbedDayMwh += (chargeByIso.get(slot.timestampIso) ?? 0) * QUARTER_H;
    }
    const peaks = eveningPeaksForDay(day, chargeByIso, dischargeByIso);
    if (peaks.beforeGw !== null) {
      eveningBefore.push(peaks.beforeGw);
    }
    if (peaks.afterGw !== null) {
      eveningAfter.push(peaks.afterGw);
    }
    const lastSlot = day.slots[day.slots.length - 1];
    const socEnd = lastSlot ? socByIso.get(lastSlot.timestampIso) ?? CHAIN_SOC_MIN : CHAIN_SOC_MIN;
    dayRows.push({
      dateBerlin: day.dateBerlin,
      surplusGwh: figures.surplusGwh ?? 0,
      absorbedGwh: absorbedDayMwh / 1000,
      netImportGwh: figures.tradeGwh,
      socEndFraction: socEnd,
    });
    socSeries.push({ dateBerlin: day.dateBerlin, socFraction: socEnd });
  }

  const avg = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  const quarterPoints: OverviewQuarterPoint[] = [];
  const slotByIso = new Map(args.slots.map((item) => [item.timestampIso, item]));
  if (args.days.length === 1) {
    const day = args.days[0];
    for (const slot of day.slots) {
      const powerSlot = slotByIso.get(slot.timestampIso);
      const wind = powerSlot ? windMw(powerSlot, args.offshorePresent) ?? slot.windMw : slot.windMw;
      const solar = powerSlot ? solarMw(powerSlot) ?? slot.solarMw : slot.solarMw;
      const surplusMw = Math.max(0, wind + solar - slot.loadMw);
      const residualMw = slot.loadMw - wind - solar;
      const charge = chargeByIso.get(slot.timestampIso) ?? 0;
      const discharge = dischargeByIso.get(slot.timestampIso) ?? 0;
      quarterPoints.push({
        timestampIso: slot.timestampIso,
        hour: slot.hourBerlin + slot.minuteBerlin / 60,
        surplusMw,
        residualMw,
        tradeMw: tradeByIso.get(slot.timestampIso) ?? null,
        chargeMw: charge,
        dischargeMw: discharge,
        residualMitMw: residualMw + charge - discharge,
        socFraction: socByIso.get(slot.timestampIso) ?? CHAIN_SOC_MIN,
      });
    }
  }

  let zeroReason: string | null = null;
  if ((args.observedSurplusGwh ?? 0) <= 1e-9) {
    zeroReason = "no_surplus";
  } else if (absorbedGwh <= 1e-9) {
    zeroReason = "no_charge_window";
  }

  return {
    absorbedGwh,
    absorbedShare,
    dischargedGwh,
    dischargedDuringImportGwh: dischargedDuringImportMwh / 1000,
    eveningPeakBeforeGw: avg(eveningBefore),
    eveningPeakAfterGw: avg(eveningAfter),
    endSocDeltaGwh: (run.endSocMwh - run.startSocMwh) / 1000,
    startSocGwh: run.startSocMwh / 1000,
    endSocGwh: run.endSocMwh / 1000,
    saturated,
    eurModelX1: args.factor === 1 && eurComplete ? eurSum : null,
    zeroReason,
    dayRows,
    quarterPoints,
    socSeries,
  };
}

export function evaluateOverview(args: {
  bounds: OverviewBounds;
  slots: PowerSlot[];
  offshorePresent: boolean;
  days: ResidualDay[];
  powerMw: number;
  energyMwh: number;
  prices: DayAheadPricePoint[];
  lastSurplusDateBerlin: string | null;
  todayKey: string;
}): OverviewEvaluation {
  const scopedSlots = filterSlotsForBounds(args.slots, args.bounds, args.slots.at(-1)?.timestampIso ?? null);
  const scopedDays = residualDaysInRange(args.days, args.bounds.startKey, args.bounds.endKey);
  const figures = periodFigures(scopedSlots, args.offshorePresent);

  let importGwh = 0;
  let exportGwh = 0;
  let hasTrade = false;
  let missingQuarters = 0;
  const totalQuarters = scopedSlots.length;
  for (const slot of scopedSlots) {
    const wind = windMw(slot, args.offshorePresent);
    const solar = solarMw(slot);
    if (slot.tradeMw === null || slot.loadMw === null || wind === null || solar === null) {
      missingQuarters += 1;
    }
    if (slot.tradeMw === null) {
      continue;
    }
    hasTrade = true;
    const gwh = (slot.tradeMw * QUARTER_H) / 1000;
    if (gwh > 0) {
      importGwh += gwh;
    } else {
      exportGwh += -gwh;
    }
  }

  let surplusDays = 0;
  const byDay = new Map<string, PowerSlot[]>();
  for (const slot of scopedSlots) {
    const group = byDay.get(slot.dateBerlin);
    if (group) {
      group.push(slot);
    } else {
      byDay.set(slot.dateBerlin, [slot]);
    }
  }
  for (const daySlots of byDay.values()) {
    const daySurplus = periodFigures(daySlots, args.offshorePresent).surplusGwh ?? 0;
    if (daySurplus >= SURPLUS_DAY_GWH) {
      surplusDays += 1;
    }
  }

  const observed: OverviewObserved = {
    surplusGwh: figures.surplusGwh,
    surplusDays,
    dayCount: args.bounds.dayCount,
    importGwh: hasTrade ? importGwh : null,
    exportGwh: hasTrade ? exportGwh : null,
    netImportGwh: hasTrade ? importGwh - exportGwh : null,
    peakSurplusMw: null,
    peakSurplusIso: null,
    missingQuarters,
    totalQuarters,
    lastSurplusDateBerlin: args.lastSurplusDateBerlin,
    openDay: args.bounds.blick === "heute" && args.bounds.endKey === args.todayKey,
  };

  for (const slot of scopedSlots) {
    const wind = windMw(slot, args.offshorePresent);
    const solar = solarMw(slot);
    if (wind === null || solar === null || slot.loadMw === null) {
      continue;
    }
    const surplusMw = wind + solar - slot.loadMw;
    if (surplusMw > (observed.peakSurplusMw ?? 0)) {
      observed.peakSurplusMw = surplusMw;
      observed.peakSurplusIso = slot.timestampIso;
    }
  }

  const factors = {} as Record<LiveDispatchFactor, OverviewFactorResult>;
  for (const factor of LIVE_DISPATCH_FACTORS) {
    factors[factor] = evaluateFactor({
      days: scopedDays,
      slots: scopedSlots,
      offshorePresent: args.offshorePresent,
      powerMw: args.powerMw,
      energyMwh: args.energyMwh,
      factor,
      observedSurplusGwh: figures.surplusGwh,
      prices: args.prices,
    });
  }

  return { bounds: args.bounds, observed, factors };
}

export const OVERVIEW_RTE = MORE_STORAGE_ROUND_TRIP;
