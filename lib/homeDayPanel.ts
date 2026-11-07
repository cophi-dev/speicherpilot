import { chainFleetSoc } from "@/lib/chainedFleetSoc";
import {
  auditBerlinPowerDay,
  expectedBerlinQuarters,
  loadedPowerSeriesStartKey,
  strictResidualPreludeComplete,
} from "@/lib/berlinDayCompleteness";
import { berlinCalendarKeysInclusive } from "@/lib/berlinCalendar";
import { fleetStandLabelDe } from "@/lib/fleetStandLabel";
import type { FleetDataProvenance } from "@/lib/loadLargeBatteryFleet";
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
  expectedQuarters: number;
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
    chargedGwh: number | null;
    dischargedGwh: number | null;
    simulationRunLabelDe: string;
    evaluationWindowLabelDe: string | null;
    fleetStandLabelDe: string;
    disclosureDe: string;
  };
};

export function formatGermanDateRange(startKey: string, endKey: string): string {
  const [sy, sm, sd] = startKey.split("-");
  const [ey, em, ed] = endKey.split("-");
  if (!sy || !ey) {
    return `${startKey}–${endKey}`;
  }
  if (sy === ey) {
    return `${sd}.${sm}.–${ed}.${em}.${ey}`;
  }
  return `${sd}.${sm}.${sy}–${ed}.${em}.${ey}`;
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
  slots: PowerSlot[];
  offshorePresent: boolean;
  allDays: ResidualDay[];
  day: ResidualDay | null;
  fleet: LiveFleetPublic | null;
  fetchStand: string;
  fleetProvenance: FleetDataProvenance;
  evaluationWindow: OverviewBounds | null;
}): HomeDayPanelData | null {
  if (!args.day || args.day.dateBerlin !== args.dateKey || !args.fleet) {
    return null;
  }
  const daySlots = slotsInRange(args.slots, args.dateKey, args.dateKey);
  const audit = auditBerlinPowerDay(daySlots, args.dateKey, args.offshorePresent);
  const referenceComplete = audit.ok;
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
      ? "Summe veröffentlichter Nettoerzeugungsträger je Viertelstunde (Energy-Charts total_power, inkl. Eigenversorgung; Pumpspeicher-Abgabe in Hydro, keine Importe)."
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

  const simulationStartKey = loadedPowerSeriesStartKey(args.slots, args.dateKey) ?? args.dateKey;
  const contiguousSpan = berlinCalendarKeysInclusive(simulationStartKey, args.dateKey);
  const simulationRunLabelDe = `${formatGermanDateRange(simulationStartKey, args.dateKey)} (${contiguousSpan.length} Kalendertage im Simulationsvorlauf)`;
  const evaluationWindowLabelDe = args.evaluationWindow
    ? `${formatGermanDateRange(args.evaluationWindow.startKey, args.evaluationWindow.endKey)} (30-Tage-Kennzahl Startseite, getrennt vom Simulationsvorlauf)`
    : null;

  const preludeOk = strictResidualPreludeComplete(
    args.slots,
    args.offshorePresent,
    simulationStartKey,
    args.dateKey
  );

  let modelAvailable = Boolean(referenceComplete && args.fleet && preludeOk);
  let chargedGwh: number | null = null;
  let dischargedGwh: number | null = null;
  let unavailableReasonDe: string | null = null;
  if (!preludeOk) {
    modelAvailable = false;
    unavailableReasonDe =
      "Modellwerte nicht verfügbar (fehlender oder unvollständiger Kalendertag im Simulationsvorlauf).";
  } else if (modelAvailable) {
    const energies = modelDayEnergyFromChain(args.allDays, args.dateKey, args.fleet!.powerMw, args.fleet!.energyMwh);
    if (energies) {
      chargedGwh = energies.chargedGwh;
      dischargedGwh = energies.dischargedGwh;
    } else {
      modelAvailable = false;
      unavailableReasonDe = "Für diesen Tag nicht berechnet";
    }
  } else {
    unavailableReasonDe = "Für diesen Tag nicht berechnet";
  }

  const fleetStandLabel = fleetStandLabelDe(
    args.fleetProvenance,
    args.fleet.source,
    args.fleet.updatedLabel.de
  );
  const disclosureDe = [
    `Hypothetisches ×1-Modell (Modellschätzung, nicht gemessen). Simulationsvorlauf durchgehender SoC, Start 10 %, ${simulationRunLabelDe}: chainFleetSoc wie 30-Tage-Kennzahl — Laden vor ${MORE_STORAGE_DISCHARGE_HOUR}:00 bei Wind+Sonne über Last, Abgabe ab ${MORE_STORAGE_DISCHARGE_HOUR}:00, ${Math.round(MORE_STORAGE_ROUND_TRIP * 100)} % RTE.`,
    evaluationWindowLabelDe,
    `Referenzflotte: ${args.fleet.powerGw} GW / ${args.fleet.energyGwh} GWh (${fleetStandLabel}).`,
    "Lokale Netzwirkung am Anschluss wird nicht aus nationalen Tageswerten abgeleitet.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    dateKey: args.dateKey,
    sourceLabel: "Energy-Charts · total_power (DE, Last inkl. Eigenversorgung)",
    fetchStand: args.fetchStand,
    referenceComplete,
    quarterCount: daySlots.length,
    expectedQuarters: expectedBerlinQuarters(args.dateKey),
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
      unavailableReasonDe,
      powerGw: args.fleet.powerGw,
      energyGwh: args.fleet.energyGwh,
      factor: 1,
      chargedGwh,
      dischargedGwh,
      simulationRunLabelDe,
      evaluationWindowLabelDe,
      fleetStandLabelDe: fleetStandLabel,
      disclosureDe,
    },
  };
}
