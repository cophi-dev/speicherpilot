import { HAMBURG_SUPERMARKET, hamburgSupermarketProfile } from "@/lib/hamburgSupermarket";
import { QUARTIER } from "@/lib/quartierExample";

export type PeakQuarter = {
  hour: number;
  loadKw: number;
  /** Positive when the battery discharges, negative when it charges. */
  batteryKw: number;
  netKw: number;
  socKwh: number;
};

export type PeakShavingExplain = {
  quarters: PeakQuarter[];
  peakBeforeKw: number;
  peakAfterKw: number;
  peakHour: number;
  shavedKwh: number;
  socMinKwh: number;
  socMinPct: number;
  /** Net import peak stays on or under the connection limit. */
  holdsLimit: boolean;
  /** (peak before − peak after) × €/kW·a. Null when no demand charge is passed. */
  demandChargeSavingEurPerYear: number | null;
  zoomFromHour: number;
  zoomToHour: number;
  rechargeFromHour: number;
  rechargeCapKw: number;
  limitKw: number;
  powerKw: number;
  energyKwh: number;
  roundTripEfficiency: number;
};

export type PeakShavingInput = {
  /** Quarter-hours from midnight. Index 0 is 00:00. */
  loadKw: readonly number[];
  limitKw: number;
  powerKw: number;
  energyKwh: number;
  roundTripEfficiency: number;
  rechargeFromHour?: number;
  /** Charge power cap. Still limited by headroom under the connection. */
  rechargeCapKw?: number;
  demandChargeEurPerKwYear?: number | null;
};

/**
 * Teaching dispatch for one day. Not `planSite`.
 * The battery starts full. It discharges only above the connection limit.
 * After `rechargeFromHour` it charges, capped by `rechargeCapKw` and by the
 * room left under the limit. Losses apply on both paths via √round-trip efficiency,
 * matching the python reference: discharge divides by √RTE, charge multiplies.
 */
export function explainPeakShaving(input: PeakShavingInput): PeakShavingExplain {
  const eta = Math.sqrt(Math.max(0, input.roundTripEfficiency));
  const rechargeFromHour = input.rechargeFromHour ?? 19.5;
  const rechargeCapKw = input.rechargeCapKw ?? 15;
  const energyKwh = Math.max(0, input.energyKwh);
  const limitKw = input.limitKw;
  const powerKw = Math.max(0, input.powerKw);
  let soc = energyKwh;
  const quarters: PeakQuarter[] = [];

  input.loadKw.forEach((loadKw, index) => {
    const hour = index / 4;
    let batteryKw = 0;
    if (eta > 0 && loadKw > limitKw) {
      const room = soc * eta * 4;
      const discharge = Math.max(0, Math.min(loadKw - limitKw, powerKw, room));
      batteryKw = discharge;
      soc = Math.max(0, soc - discharge / 4 / eta);
    } else if (eta > 0 && hour >= rechargeFromHour && soc < energyKwh) {
      const headroom = Math.max(0, limitKw - loadKw);
      const energyRoom = ((energyKwh - soc) * 4) / eta;
      const charge = Math.max(0, Math.min(rechargeCapKw, energyRoom, headroom));
      batteryKw = -charge;
      soc = Math.min(energyKwh, soc + (charge / 4) * eta);
    }
    quarters.push({
      hour,
      loadKw,
      batteryKw,
      netKw: loadKw - batteryKw,
      socKwh: soc,
    });
  });

  const peakBeforeKw = quarters.reduce((max, quarter) => Math.max(max, quarter.loadKw), 0);
  const peakAfterKw = quarters.reduce((max, quarter) => Math.max(max, quarter.netKw), 0);
  let peakIndex = 0;
  quarters.forEach((quarter, index) => {
    if (quarter.loadKw > quarters[peakIndex].loadKw) {
      peakIndex = index;
    }
  });
  const peakHour = quarters[peakIndex]?.hour ?? 0;
  const shavedKwh = quarters.reduce((sum, quarter) => sum + Math.max(0, quarter.batteryKw) / 4, 0);
  const socMinKwh = quarters.reduce((min, quarter) => Math.min(min, quarter.socKwh), energyKwh);
  const socMinPct = energyKwh > 0 ? (socMinKwh / energyKwh) * 100 : 0;
  const deltaKw = Math.max(0, peakBeforeKw - peakAfterKw);
  const rate = input.demandChargeEurPerKwYear;
  const demandChargeSavingEurPerYear = typeof rate === "number" && Number.isFinite(rate) ? deltaKw * rate : null;

  return {
    quarters,
    peakBeforeKw,
    peakAfterKw,
    peakHour,
    shavedKwh,
    socMinKwh,
    socMinPct,
    holdsLimit: quarters.length > 0 && peakAfterKw <= limitKw + 1e-6,
    demandChargeSavingEurPerYear,
    zoomFromHour: Math.max(0, Math.floor(peakHour - 5.5)),
    zoomToHour: Math.min(24, Math.ceil(peakHour + 4.5)),
    rechargeFromHour,
    rechargeCapKw,
    limitKw,
    powerKw,
    energyKwh,
    roundTripEfficiency: input.roundTripEfficiency,
  };
}

/** Grid import: site load minus on-site generation, never below zero. */
export function gridImportKw(loadKw: readonly number[], pvKw: readonly number[]): number[] {
  return loadKw.map((load, index) => Math.max(0, load - (pvKw[index] ?? 0)));
}

/**
 * Homepage teaching day: winter weekday of the fictional Hamburg supermarket, no rooftop PV.
 * Day 0 of `hamburgSupermarketProfile` is that shape. `/site` still plans the year with PV.
 */
export function supermarketTeachingDay(): PeakShavingExplain {
  const loadKw = hamburgSupermarketProfile().samplesKw.slice(0, 96);
  return explainPeakShaving({
    loadKw,
    limitKw: HAMBURG_SUPERMARKET.limitKw,
    powerKw: HAMBURG_SUPERMARKET.powerKw,
    energyKwh: HAMBURG_SUPERMARKET.energyKwh,
    roundTripEfficiency: HAMBURG_SUPERMARKET.roundTripEfficiency,
    rechargeFromHour: 19.5,
    rechargeCapKw: 15,
    demandChargeEurPerKwYear: HAMBURG_SUPERMARKET.demandChargeEurPerKwYear,
  });
}

/** Same teaching dispatch with the neighbourhood's connection, battery and charge cap. */
export function quartierTeachingDay(importKw: readonly number[]): PeakShavingExplain {
  return explainPeakShaving({
    loadKw: importKw,
    limitKw: QUARTIER.transformerKw,
    powerKw: QUARTIER.powerKw,
    energyKwh: QUARTIER.energyKwh,
    roundTripEfficiency: QUARTIER.roundTripEfficiency,
    rechargeFromHour: 19.5,
    rechargeCapKw: QUARTIER.powerKw,
    demandChargeEurPerKwYear: QUARTIER.demandChargeEurPerKwYear,
  });
}
