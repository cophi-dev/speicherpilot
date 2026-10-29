import type { GermanyDispatchSlot, GermanyDispatchSlotsResponse } from "@/lib/energyChartsApi";
import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import type { ResidualSlot } from "@/lib/windSolarResidual";

const QUARTER_HOUR_H = 0.25;
const DISCHARGE_HOUR = 17;
const SATURATION_SHARE = 0.995;

export type SurplusDayObserved = {
  dateBerlin: string;
  /** Sum of max(0, wind on land + offshore + solar − load) · ¼ h (GWh). */
  windSolarSurplusGwh: number;
  observedExportGwh: number | null;
  /** Berlin calendar day with wind+solar surplus for empty-state link. */
  lastSurplusDateBerlin: string | null;
};

export type SurplusDayFactorResult = {
  factor: LiveDispatchFactor;
  nameplateEnergyMwh: number;
  nameplatePowerMw: number;
  absorbedMwh: number;
  absorbedGwh: number;
  remainingSurplusMwh: number;
  remainingSurplusGwh: number;
  dischargedMwh: number;
  dischargedGwh: number;
  observedExportGwh: number | null;
  simulatedExportGwh: number | null;
  exportDeltaGwh: number | null;
  saturationNote: boolean;
};

export type SurplusDayReport = {
  observed: SurplusDayObserved;
  factors: Record<LiveDispatchFactor, SurplusDayFactorResult>;
};

export type FleetNameplate = {
  powerMw: number;
  energyMwh: number;
};

export function windSolarSurplusMwhForSlot(slot: GermanyDispatchSlot): number {
  const windSolarMw = slot.windSolarMw;
  if (windSolarMw === null || windSolarMw === undefined || !Number.isFinite(windSolarMw)) {
    return 0;
  }
  return Math.max(0, windSolarMw - slot.loadMw) * QUARTER_HOUR_H;
}

export function sumWindSolarSurplusGwh(slots: GermanyDispatchSlot[]): number {
  return slots.reduce((sum, slot) => sum + windSolarSurplusMwhForSlot(slot), 0) / 1000;
}

export function sumObservedExportGwh(slots: GermanyDispatchSlot[]): number | null {
  let has = false;
  let mwh = 0;
  for (const slot of slots) {
    const mw = slot.crossBorderElectricityTradingMw;
    if (mw === null || mw === undefined || !Number.isFinite(mw)) {
      continue;
    }
    has = true;
    mwh += Math.max(0, -mw) * QUARTER_HOUR_H;
  }
  return has ? mwh / 1000 : null;
}

export function isPublishedFullBerlinDay(flow: GermanyDispatchSlotsResponse): boolean {
  return flow.pointFractionOfDay >= 0.999 || flow.samplePoints >= 92;
}

function usableCapMwh(nameplateMwh: number): number {
  return Math.max(0, nameplateMwh * (CHAIN_SOC_MAX - CHAIN_SOC_MIN));
}

function toResidualSlots(slots: GermanyDispatchSlot[]): ResidualSlot[] {
  return slots
    .filter(
      (slot) =>
        slot.windOnshoreMw !== null &&
        slot.windOffshoreMw !== null &&
        slot.solarMw !== null &&
        Number.isFinite(slot.windOnshoreMw) &&
        Number.isFinite(slot.windOffshoreMw) &&
        Number.isFinite(slot.solarMw)
    )
    .map((slot) => ({
      timestampIso: slot.timestampIso,
      hourBerlin: slot.hourBerlin,
      minuteBerlin: 0,
      loadMw: slot.loadMw,
      windMw: (slot.windOnshoreMw ?? 0) + (slot.windOffshoreMw ?? 0),
      solarMw: slot.solarMw ?? 0,
    }));
}

function eveningDischargeMw(slots: ResidualSlot[], powerMw: number, deliverableMwh: number): number[] {
  const dischargeMw = slots.map(() => 0);
  const evening = slots
    .map((slot, index) => ({
      index,
      residual: slot.loadMw - slot.windMw - slot.solarMw,
    }))
    .filter((entry) => slots[entry.index].hourBerlin >= DISCHARGE_HOUR && entry.residual > 0);
  if (evening.length === 0 || deliverableMwh <= 1e-9) {
    return dischargeMw;
  }
  const peakMw = Math.max(...evening.map((entry) => entry.residual));
  let lo = 0;
  let hi = peakMw;
  const feasible = (levelMw: number) => {
    let needMwh = 0;
    for (const entry of evening) {
      const cutMw = Math.max(0, entry.residual - levelMw);
      if (cutMw > powerMw + 1e-6) {
        return false;
      }
      needMwh += cutMw * QUARTER_HOUR_H;
    }
    return needMwh <= deliverableMwh + 1e-6;
  };
  if (!feasible(hi)) {
    return dischargeMw;
  }
  for (let step = 0; step < 48; step += 1) {
    const mid = (lo + hi) / 2;
    if (feasible(mid)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  for (const entry of evening) {
    dischargeMw[entry.index] = Math.max(0, entry.residual - hi);
  }
  return dischargeMw;
}

export function evaluateSurplusDayFactor(
  slots: GermanyDispatchSlot[],
  fleet: FleetNameplate,
  factor: LiveDispatchFactor
): SurplusDayFactorResult {
  const nameplateEnergyMwh = fleet.energyMwh * factor;
  const powerMw = fleet.powerMw * factor;
  const capMwh = usableCapMwh(nameplateEnergyMwh);
  let socMwh = 0;
  let absorbedMwh = 0;
  let dischargedToGridMwh = 0;
  let observedExportMwh = 0;
  let simulatedExportMwh = 0;
  const totalSurplusMwh = slots.reduce((sum, slot) => sum + windSolarSurplusMwhForSlot(slot), 0);

  const residualSlots = toResidualSlots(slots);
  const dischargePlan =
    capMwh > 0 && powerMw > 0 && residualSlots.length > 0
      ? eveningDischargeMw(residualSlots, powerMw, capMwh * ROUND_TRIP_EFFICIENCY)
      : [];

  let residualIndex = 0;
  for (const slot of slots) {
    const exportObsMw =
      slot.crossBorderElectricityTradingMw !== null &&
      slot.crossBorderElectricityTradingMw !== undefined &&
      Number.isFinite(slot.crossBorderElectricityTradingMw)
        ? Math.max(0, -slot.crossBorderElectricityTradingMw)
        : 0;
    observedExportMwh += exportObsMw * QUARTER_HOUR_H;

    let chargeMw = 0;
    if (slot.hourBerlin < DISCHARGE_HOUR && capMwh > 0 && powerMw > 0) {
      const surplusMw = windSolarSurplusMwhForSlot(slot) / QUARTER_HOUR_H;
      const headroomMw = Math.max(0, capMwh - socMwh) / QUARTER_HOUR_H;
      chargeMw = Math.min(surplusMw, powerMw, headroomMw);
      const chargeMwh = chargeMw * QUARTER_HOUR_H;
      socMwh += chargeMwh;
      absorbedMwh += chargeMwh;
    }

    simulatedExportMwh += Math.max(0, exportObsMw - chargeMw) * QUARTER_HOUR_H;

    const residualSlot =
      slot.windOnshoreMw !== null &&
      slot.windOffshoreMw !== null &&
      slot.solarMw !== null &&
      residualIndex < residualSlots.length &&
      residualSlots[residualIndex]?.timestampIso === slot.timestampIso
        ? residualSlots[residualIndex]
        : null;
    if (residualSlot && slot.hourBerlin >= DISCHARGE_HOUR) {
      const plannedMw = dischargePlan[residualIndex] ?? 0;
      const roomMw = (Math.max(0, socMwh) * ROUND_TRIP_EFFICIENCY) / QUARTER_HOUR_H;
      const usedMw = Math.min(plannedMw, powerMw, roomMw);
      if (usedMw > 0) {
        const fromBatteryMwh = (usedMw * QUARTER_HOUR_H) / ROUND_TRIP_EFFICIENCY;
        socMwh = Math.max(0, socMwh - fromBatteryMwh);
        dischargedToGridMwh += usedMw * QUARTER_HOUR_H;
      }
    }
    if (residualSlot) {
      residualIndex += 1;
    }
  }

  absorbedMwh = Math.min(absorbedMwh, totalSurplusMwh + 1e-6);

  return {
    factor,
    nameplateEnergyMwh,
    nameplatePowerMw: powerMw,
    absorbedMwh,
    absorbedGwh: absorbedMwh / 1000,
    remainingSurplusMwh: Math.max(0, totalSurplusMwh - absorbedMwh),
    remainingSurplusGwh: Math.max(0, totalSurplusMwh - absorbedMwh) / 1000,
    dischargedMwh: dischargedToGridMwh,
    dischargedGwh: dischargedToGridMwh / 1000,
    observedExportGwh: observedExportMwh / 1000,
    simulatedExportGwh: simulatedExportMwh / 1000,
    exportDeltaGwh: (simulatedExportMwh - observedExportMwh) / 1000,
    saturationNote: factor >= 5,
  };
}

export function surplusSaturationFactor(report: SurplusDayReport): LiveDispatchFactor | null {
  const surplusGwh = report.observed.windSolarSurplusGwh;
  if (surplusGwh <= 0) {
    return null;
  }
  for (const factor of LIVE_DISPATCH_FACTORS) {
    if (report.factors[factor].absorbedGwh + 1e-6 >= surplusGwh * SATURATION_SHARE) {
      return factor;
    }
  }
  return null;
}

export function buildSurplusDayReport(
  flow: GermanyDispatchSlotsResponse,
  fleet: FleetNameplate | null,
  options?: { lastSurplusDateBerlin?: string | null }
): SurplusDayReport | null {
  if (!flow.slots.length) {
    return null;
  }
  const observed: SurplusDayObserved = {
    dateBerlin: flow.dateBerlin,
    windSolarSurplusGwh: sumWindSolarSurplusGwh(flow.slots),
    observedExportGwh: sumObservedExportGwh(flow.slots),
    lastSurplusDateBerlin: options?.lastSurplusDateBerlin ?? null,
  };

  const emptyFactor = (factor: LiveDispatchFactor): SurplusDayFactorResult => ({
    factor,
    nameplateEnergyMwh: 0,
    nameplatePowerMw: 0,
    absorbedMwh: 0,
    absorbedGwh: 0,
    remainingSurplusMwh: observed.windSolarSurplusGwh * 1000,
    remainingSurplusGwh: observed.windSolarSurplusGwh,
    dischargedMwh: 0,
    dischargedGwh: 0,
    observedExportGwh: observed.observedExportGwh,
    simulatedExportGwh: observed.observedExportGwh,
    exportDeltaGwh: 0,
    saturationNote: factor >= 5,
  });

  if (!fleet || fleet.powerMw <= 0 || fleet.energyMwh <= 0) {
    return {
      observed,
      factors: LIVE_DISPATCH_FACTORS.reduce(
        (acc, factor) => {
          acc[factor] = emptyFactor(factor);
          return acc;
        },
        {} as Record<LiveDispatchFactor, SurplusDayFactorResult>
      ),
    };
  }

  const factors = {} as Record<LiveDispatchFactor, SurplusDayFactorResult>;
  for (const factor of LIVE_DISPATCH_FACTORS) {
    factors[factor] = evaluateSurplusDayFactor(flow.slots, fleet, factor);
  }
  return { observed, factors };
}

export const SURPLUS_DAY_RTE = ROUND_TRIP_EFFICIENCY;
