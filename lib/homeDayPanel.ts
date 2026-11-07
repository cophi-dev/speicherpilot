import { chainFleetSoc } from "@/lib/chainedFleetSoc";
import { isCompleteBerlinDay } from "@/lib/completeBerlinDay";
import type { LiveFleetPublic } from "@/lib/liveFleetDispatch";
import { MORE_STORAGE_DISCHARGE_HOUR, MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import type { OverviewBounds } from "@/lib/overviewRange";
import { CARRIER_IDS, periodFigures, slotsInRange, windMw, solarMw, type PowerSlot } from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";

const QUARTER_H = 0.25;

export type GenerationTotalStatus = "ok" | "partial" | "unavailable";

export type HomeDayPanelData = {
  dateKey: string;
  sourceLabel: string;
  fetchStand: string;
  referenceComplete: boolean;
  quarterCount: number;
  observed: {
    loadGwh: number | null;
    generationGwh: number | null;
    generationStatus: GenerationTotalStatus;
    generationDetailDe: string;
    windSolarGwh: number | null;
    surplusGwh: number | null;
    surplusQuarters: number;
  };
  model: {
    available: boolean;
    unavailableReasonDe: string | null;
    powerGw: number;
    energyGwh: number;
    factor: 1;
    drivingModeDe: string;
    rtePct: number;
    fleetSourceDe: string;
    windowNoteDe: string;
    chargedGwh: number | null;
    dischargedGwh: number | null;
  };
};

function utcMonotonicUnique(slots: PowerSlot[]): boolean {
  for (let i = 1; i < slots.length; i += 1) {
    if (slots[i].unixSeconds <= slots[i - 1].unixSeconds) {
      return false;
    }
  }
  const seen = new Set<number>();
  for (const slot of slots) {
    if (seen.has(slot.unixSeconds)) {
      return false;
    }
    seen.add(slot.unixSeconds);
  }
  return true;
}

/** Sum carrier MW on quarters where every mapped generation carrier is published (disjoint categories, no imports). */
export function totalGenerationGwhForDay(
  daySlots: PowerSlot[],
  offshorePresent: boolean
): { gwh: number | null; status: GenerationTotalStatus; completeQuarters: number } {
  if (daySlots.length === 0) {
    return { gwh: null, status: "unavailable", completeQuarters: 0 };
  }
  let sumGwh = 0;
  let completeQuarters = 0;
  for (const slot of daySlots) {
    let slotMw = 0;
    let slotComplete = true;
    for (const id of CARRIER_IDS) {
      const mw = slot.carriers[id];
      if (mw === null) {
        slotComplete = false;
        break;
      }
      slotMw += mw;
    }
    if (!slotComplete) {
      continue;
    }
    completeQuarters += 1;
    sumGwh += (slotMw * QUARTER_H) / 1000;
  }
  if (completeQuarters === 0) {
    return { gwh: null, status: "unavailable", completeQuarters: 0 };
  }
  if (completeQuarters < daySlots.length) {
    return { gwh: null, status: "partial", completeQuarters };
  }
  const figures = periodFigures(daySlots, offshorePresent);
  if (figures.loadGwh === null) {
    return { gwh: null, status: "partial", completeQuarters };
  }
  return { gwh: sumGwh, status: "ok", completeQuarters };
}

function modelDayEnergyFromChain(
  allDays: ResidualDay[],
  dateKey: string,
  powerMw: number,
  energyMwh: number
): { chargedGwh: number; dischargedGwh: number } | null {
  const chainDays = allDays.filter((d) => d.dateBerlin <= dateKey).sort((a, b) => (a.dateBerlin < b.dateBerlin ? -1 : 1));
  if (chainDays.length === 0) {
    return null;
  }
  const run = chainFleetSoc(chainDays, powerMw, energyMwh);
  let chargedMwh = 0;
  let dischargedMwh = 0;
  for (const point of run.points) {
    if (point.dateBerlin !== dateKey) {
      continue;
    }
    chargedMwh += point.chargeMw * QUARTER_H;
    dischargedMwh += point.dischargeMw * QUARTER_H;
  }
  return { chargedGwh: chargedMwh / 1000, dischargedGwh: dischargedMwh / 1000 };
}

export function buildHomeDayPanelData(args: {
  dateKey: string;
  todayKey: string;
  slots: PowerSlot[];
  offshorePresent: boolean;
  allDays: ResidualDay[];
  day: ResidualDay | null;
  fleet: LiveFleetPublic | null;
  fetchStand: string;
  modelWindow: OverviewBounds | null;
}): HomeDayPanelData | null {
  if (!args.day || args.day.dateBerlin !== args.dateKey || !args.fleet) {
    return null;
  }
  const daySlots = slotsInRange(args.slots, args.dateKey, args.dateKey);
  const referenceComplete =
    isCompleteBerlinDay(args.day, args.todayKey) && utcMonotonicUnique(daySlots) && daySlots.length >= 92;
  const figures = periodFigures(daySlots, args.offshorePresent);
  const gen = totalGenerationGwhForDay(daySlots, args.offshorePresent);

  let generationStatus = gen.status;
  let generationGwh = gen.gwh;
  if (!referenceComplete) {
    generationStatus = "unavailable";
    generationGwh = null;
  } else if (generationStatus === "ok") {
    generationGwh = gen.gwh;
  } else {
    generationGwh = null;
  }

  const generationDetailDe =
    generationStatus === "ok"
      ? "Summe veröffentlichter Erzeugerträger je Viertelstunde (Energy-Charts, netto, ohne Importe; Speicherentladung nur, soweit als Träger geführt)."
      : generationStatus === "partial"
        ? "Erzeugung gesamt: Datenabgrenzung offen — nicht alle Viertelstunden haben vollständige Trägerreihen."
        : "Erzeugung gesamt: für diesen Tag nicht vollständig veröffentlicht.";

  let surplusQuarters = 0;
  for (const slot of daySlots) {
    const wind = windMw(slot, args.offshorePresent);
    const solar = solarMw(slot);
    if (wind !== null && solar !== null && slot.loadMw !== null && wind + solar > slot.loadMw) {
      surplusQuarters += 1;
    }
  }

  const modelAvailable = Boolean(referenceComplete && args.fleet);
  let chargedGwh: number | null = null;
  let dischargedGwh: number | null = null;
  if (modelAvailable && args.fleet) {
    const energies = modelDayEnergyFromChain(args.allDays, args.dateKey, args.fleet.powerMw, args.fleet.energyMwh);
    if (energies) {
      chargedGwh = energies.chargedGwh;
      dischargedGwh = energies.dischargedGwh;
    }
  }

  const windowNoteDe = args.modelWindow
    ? `Rollierendes Modell · ${args.modelWindow.startKey}–${args.modelWindow.endKey} · durchgehender SoC, Start 10 %`
    : `Rollierendes Modell · SoC aus vorherigen Kalendertagen`;

  return {
    dateKey: args.dateKey,
    sourceLabel: "Energy-Charts · total_power (DE, Last inkl. Eigenversorgung)",
    fetchStand: args.fetchStand,
    referenceComplete,
    quarterCount: daySlots.length,
    observed: {
      loadGwh: referenceComplete ? figures.loadGwh : null,
      generationGwh,
      generationStatus,
      generationDetailDe,
      windSolarGwh: referenceComplete ? figures.windSolarGwh : null,
      surplusGwh: referenceComplete ? figures.surplusGwh : null,
      surplusQuarters,
    },
    model: {
      available: modelAvailable,
      unavailableReasonDe: modelAvailable ? null : "Für diesen Tag nicht berechnet",
      powerGw: args.fleet.powerGw,
      energyGwh: args.fleet.energyGwh,
      factor: 1,
      drivingModeDe: `Überschuss-Laden vor ${MORE_STORAGE_DISCHARGE_HOUR}:00, Abgabe ab ${MORE_STORAGE_DISCHARGE_HOUR}:00`,
      rtePct: Math.round(MORE_STORAGE_ROUND_TRIP * 100),
      fleetSourceDe:
        (args.fleet.source === "battery-charts" ? "Battery Charts" : "Energy-Charts") +
        (args.fleet.updatedLabel.de ? ` · Stand ${args.fleet.updatedLabel.de}` : ""),
      windowNoteDe,
      chargedGwh,
      dischargedGwh,
    },
  };
}
