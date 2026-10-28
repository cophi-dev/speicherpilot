import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

const QUARTER_HOUR_H = 0.25;

/** Same hour and round-trip as `MORE_STORAGE_DISCHARGE_HOUR` and `MORE_STORAGE_ROUND_TRIP`. */
const DISCHARGE_HOUR = 17;
const ROUND_TRIP = 0.85;

/** Usable window of nameplate energy. The chain starts at the bottom of this window. */
export const CHAIN_SOC_MIN = 0.1;
export const CHAIN_SOC_MAX = 0.9;

export type ChainPoint = {
  timestampIso: string;
  unixSeconds: number;
  dateBerlin: string;
  /** Share of nameplate after this quarter-hour, 0–1. */
  soc: number;
  socMwh: number;
  chargeMw: number;
  dischargeMw: number;
};

export type ChainRun = {
  points: ChainPoint[];
  startSocMwh: number;
  endSocMwh: number;
  chargedMwh: number;
  dischargedMwh: number;
};

function eveningDischarge(slots: ResidualSlot[], powerMw: number, deliverableMwh: number): number[] {
  const dischargeMw = slots.map(() => 0);
  const evening = slots
    .map((slot, index) => ({
      index,
      residual: slot.loadMw - slot.windMw - slot.solarMw,
    }))
    .filter((slot) => slots[slot.index].hourBerlin >= DISCHARGE_HOUR && slot.residual > 0);
  if (evening.length === 0 || deliverableMwh <= 1e-9) {
    return dischargeMw;
  }
  const peakMw = Math.max(...evening.map((slot) => slot.residual));
  let lo = 0;
  let hi = peakMw;
  const feasible = (levelMw: number) => {
    let needMwh = 0;
    for (const slot of evening) {
      const cutMw = Math.max(0, slot.residual - levelMw);
      if (cutMw > powerMw + 1e-6) {
        return false;
      }
      needMwh += cutMw * QUARTER_HOUR_H;
    }
    return needMwh <= deliverableMwh + 1e-6;
  };
  if (feasible(hi)) {
    for (let step = 0; step < 48; step += 1) {
      const mid = (lo + hi) / 2;
      if (feasible(mid)) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    for (const slot of evening) {
      dischargeMw[slot.index] = Math.max(0, slot.residual - hi);
    }
  }
  return dischargeMw;
}

/**
 * The surplus model, chained across days.
 * Charging is only before 17:00 and only from wind plus solar above load.
 * Discharge from 17:00 shaves the evening peak. Losses are taken on discharge (85 %).
 * State of charge stays inside 10–90 % of nameplate and carries into the next day.
 * The period starts at 10 %.
 */
export function chainFleetSoc(days: ResidualDay[], powerMw: number, energyMwh: number): ChainRun {
  const minMwh = CHAIN_SOC_MIN * energyMwh;
  const maxMwh = CHAIN_SOC_MAX * energyMwh;
  let socMwh = minMwh;
  const startSocMwh = socMwh;
  const points: ChainPoint[] = [];
  let chargedMwh = 0;
  let dischargedMwh = 0;
  const ordered = [...days].sort((left, right) => (left.dateBerlin < right.dateBerlin ? -1 : 1));

  for (const day of ordered) {
    const slots = [...day.slots].sort((left, right) => left.timestampIso.localeCompare(right.timestampIso));
    const chargeMw = slots.map(() => 0);
    const socAtSlot = slots.map(() => socMwh);
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      if (slot.hourBerlin < DISCHARGE_HOUR) {
        const surplusMw = Math.max(0, slot.windMw + slot.solarMw - slot.loadMw);
        const roomMw = Math.max(0, maxMwh - socMwh) / QUARTER_HOUR_H;
        const charge = Math.min(surplusMw, Math.max(0, powerMw), roomMw);
        chargeMw[index] = charge;
        socMwh += charge * QUARTER_HOUR_H;
        chargedMwh += charge * QUARTER_HOUR_H;
      }
      socAtSlot[index] = socMwh;
    }
    const deliverableMwh = Math.max(0, socMwh - minMwh) * ROUND_TRIP;
    const dischargeMw = eveningDischarge(slots, Math.max(0, powerMw), deliverableMwh);
    const dayStart = points.length === 0 ? minMwh : points[points.length - 1].socMwh;
    socMwh = dayStart;
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      let used = 0;
      if (slot.hourBerlin < DISCHARGE_HOUR) {
        socMwh = socAtSlot[index];
      } else {
        const roomMw = (Math.max(0, socMwh - minMwh) * ROUND_TRIP) / QUARTER_HOUR_H;
        used = Math.min(dischargeMw[index], Math.max(0, powerMw), roomMw);
        if (used > 0) {
          socMwh -= (used * QUARTER_HOUR_H) / ROUND_TRIP;
          dischargedMwh += used * QUARTER_HOUR_H;
        }
      }
      socMwh = Math.min(maxMwh, Math.max(minMwh, socMwh));
      const unixSeconds = Math.floor(Date.parse(slot.timestampIso) / 1000);
      points.push({
        timestampIso: slot.timestampIso,
        unixSeconds: Number.isFinite(unixSeconds) ? unixSeconds : 0,
        dateBerlin: day.dateBerlin,
        soc: energyMwh > 0 ? socMwh / energyMwh : CHAIN_SOC_MIN,
        socMwh,
        chargeMw: chargeMw[index],
        dischargeMw: used,
      });
    }
  }

  return {
    points,
    startSocMwh,
    endSocMwh: socMwh,
    chargedMwh,
    dischargedMwh,
  };
}
