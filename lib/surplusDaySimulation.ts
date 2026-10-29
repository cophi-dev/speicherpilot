import type { GermanyDispatchSlot, GermanyDispatchSlotsResponse } from "@/lib/energyChartsApi";
import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import {
  borderCoupledBatteryChargeMw,
  simulatePracticalDispatchAtCapacity,
} from "@/lib/optimalBessCapacity";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

const QUARTER_HOUR_H = 0.25;

export type SurplusDayObserved = {
  dateBerlin: string;
  /** Wind plus solar above load (GWh), when the feed allows it. */
  renewableSurplusGwh: number;
  /** Structural generation minus load surplus (GWh). */
  structuralSurplusGwh: number;
  observedExportGwh: number | null;
  curtailmentGwh: number | null;
  curtailmentStatus: GermanyDispatchSlotsResponse["curtailmentStatus"];
  hasCrossBorder: boolean;
};

export type SurplusDayFactorResult = {
  factor: LiveDispatchFactor;
  nameplateEnergyMwh: number;
  nameplatePowerMw: number;
  /** Energy taken from surplus and curtailment (MWh). */
  absorbedMwh: number;
  absorbedGwh: number;
  remainingSurplusMwh: number;
  remainingSurplusGwh: number;
  observedExportGwh: number | null;
  simulatedExportGwh: number | null;
  exportDeltaGwh: number | null;
  remainingCurtailmentGwh: number | null;
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

function renewableSurplusMwh(slot: GermanyDispatchSlot): number {
  if (slot.renewableGenerationMw !== null && Number.isFinite(slot.renewableGenerationMw)) {
    return Math.max(0, slot.renewableGenerationMw - slot.loadMw) * QUARTER_HOUR_H;
  }
  return Math.max(0, slot.totalGenerationMw - slot.loadMw) * QUARTER_HOUR_H;
}

function structuralSurplusMwh(slot: GermanyDispatchSlot): number {
  return Math.max(0, slot.totalGenerationMw - slot.loadMw) * QUARTER_HOUR_H;
}

function curtailedMwh(slot: GermanyDispatchSlot): number {
  const mw = slot.curtailmentMw;
  if (mw === null || mw === undefined || !Number.isFinite(mw) || mw <= 0) {
    return 0;
  }
  return mw * QUARTER_HOUR_H;
}

export function sumRenewableSurplusGwh(slots: GermanyDispatchSlot[]): number {
  return slots.reduce((sum, slot) => sum + renewableSurplusMwh(slot), 0) / 1000;
}

export function sumStructuralSurplusGwh(slots: GermanyDispatchSlot[]): number {
  return slots.reduce((sum, slot) => sum + structuralSurplusMwh(slot), 0) / 1000;
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

export function sumCurtailmentGwh(
  slots: GermanyDispatchSlot[],
  status: GermanyDispatchSlotsResponse["curtailmentStatus"]
): number | null {
  if (status !== "loaded") {
    return null;
  }
  const mwh = slots.reduce((sum, slot) => sum + curtailedMwh(slot), 0);
  return mwh / 1000;
}

type BorderTotals = {
  observedExportMwh: number;
  simulatedExportMwh: number;
  exportDeltaMwh: number;
};

function borderTotalsForDispatch(
  slots: GermanyDispatchSlot[],
  dispatch: ReturnType<typeof simulatePracticalDispatchAtCapacity>
): BorderTotals | null {
  let has = false;
  let observedExportMwh = 0;
  let simulatedExportMwh = 0;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]!;
    const observedMw = slot.crossBorderElectricityTradingMw;
    if (observedMw === null || observedMw === undefined || !Number.isFinite(observedMw)) {
      continue;
    }
    has = true;
    const chargeMw = dispatch[i]?.chargeMw ?? 0;
    const dischargeMw = dispatch[i]?.dischargeMw ?? 0;
    const borderChargeMw = borderCoupledBatteryChargeMw(slot, chargeMw);
    const simulatedMw = observedMw + borderChargeMw - dischargeMw;
    observedExportMwh += Math.max(0, -observedMw) * QUARTER_HOUR_H;
    simulatedExportMwh += Math.max(0, -simulatedMw) * QUARTER_HOUR_H;
  }
  if (!has) {
    return null;
  }
  return {
    observedExportMwh,
    simulatedExportMwh,
    exportDeltaMwh: simulatedExportMwh - observedExportMwh,
  };
}

function usableEnergyMwh(nameplateMwh: number): number {
  return Math.max(0, nameplateMwh * (CHAIN_SOC_MAX - CHAIN_SOC_MIN));
}

function initialSocMwh(nameplateMwh: number): number {
  return Math.max(0, nameplateMwh * CHAIN_SOC_MIN);
}

export function evaluateSurplusDayFactor(
  slots: GermanyDispatchSlot[],
  fleet: FleetNameplate,
  factor: LiveDispatchFactor,
  options?: { initialSocMwh?: number }
): SurplusDayFactorResult {
  const nameplateEnergyMwh = fleet.energyMwh * factor;
  const nameplatePowerMw = fleet.powerMw * factor;
  const usableCapMwh = usableEnergyMwh(nameplateEnergyMwh);
  const startSoc =
    options?.initialSocMwh !== undefined ? Math.min(usableCapMwh, Math.max(0, options.initialSocMwh)) : initialSocMwh(nameplateEnergyMwh);

  const dispatch =
    usableCapMwh > 0 && nameplatePowerMw > 0
      ? simulatePracticalDispatchAtCapacity(slots, usableCapMwh, {
          maxPowerMw: nameplatePowerMw,
          initialSocMwh: startSoc,
          resetDailyByBerlin: true,
        })
      : [];

  let absorbedMwh = 0;
  let absorbedCurtailmentMwh = 0;
  let totalCurtailmentMwh = 0;

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]!;
    const structural = structuralSurplusMwh(slot);
    const curt = curtailedMwh(slot);
    totalCurtailmentMwh += curt;
    const chargeMwh = (dispatch[i]?.chargeMw ?? 0) * QUARTER_HOUR_H;
    absorbedMwh += chargeMwh;
    if (chargeMwh > 0 && structural + curt > 0 && curt > 0) {
      absorbedCurtailmentMwh += Math.min(curt, chargeMwh * (curt / (structural + curt)));
    }
  }

  const structuralSurplusMwhTotal = slots.reduce((sum, slot) => sum + structuralSurplusMwh(slot), 0);
  const structuralAbsorbedMwh = Math.max(0, absorbedMwh - absorbedCurtailmentMwh);
  const remainingSurplusMwh = Math.max(0, structuralSurplusMwhTotal - structuralAbsorbedMwh);
  const border = borderTotalsForDispatch(slots, dispatch);
  const remainingCurtailmentMwh = Math.max(0, totalCurtailmentMwh - absorbedCurtailmentMwh);

  return {
    factor,
    nameplateEnergyMwh,
    nameplatePowerMw,
    absorbedMwh,
    absorbedGwh: absorbedMwh / 1000,
    remainingSurplusMwh,
    remainingSurplusGwh: remainingSurplusMwh / 1000,
    observedExportGwh: border ? border.observedExportMwh / 1000 : null,
    simulatedExportGwh: border ? border.simulatedExportMwh / 1000 : null,
    exportDeltaGwh: border ? border.exportDeltaMwh / 1000 : null,
    remainingCurtailmentGwh: totalCurtailmentMwh > 0 ? remainingCurtailmentMwh / 1000 : null,
    saturationNote: factor >= 5,
  };
}

export function buildSurplusDayReport(
  flow: GermanyDispatchSlotsResponse,
  fleet: FleetNameplate | null
): SurplusDayReport | null {
  if (!flow.slots.length) {
    return null;
  }
  const status = flow.curtailmentStatus ?? "unavailable_upstream";
  const observed: SurplusDayObserved = {
    dateBerlin: flow.dateBerlin,
    renewableSurplusGwh: sumRenewableSurplusGwh(flow.slots),
    structuralSurplusGwh: sumStructuralSurplusGwh(flow.slots),
    observedExportGwh: sumObservedExportGwh(flow.slots),
    curtailmentGwh: sumCurtailmentGwh(flow.slots, status),
    curtailmentStatus: status,
    hasCrossBorder: sumObservedExportGwh(flow.slots) !== null,
  };

  const emptyFactor = (factor: LiveDispatchFactor): SurplusDayFactorResult => ({
    factor,
    nameplateEnergyMwh: 0,
    nameplatePowerMw: 0,
    absorbedMwh: 0,
    absorbedGwh: 0,
    remainingSurplusMwh: observed.structuralSurplusGwh * 1000,
    remainingSurplusGwh: observed.structuralSurplusGwh,
    observedExportGwh: observed.observedExportGwh,
    simulatedExportGwh: observed.observedExportGwh,
    exportDeltaGwh: 0,
    remainingCurtailmentGwh: observed.curtailmentGwh,
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
