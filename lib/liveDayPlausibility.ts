import type { ResidualSlot } from "@/lib/windSolarResidual";

export const LIVE_DAY_LOAD_DROP_GW = 6;
export const LIVE_DAY_PROVISIONAL_HOURS = 3;

const DROP_MW = LIVE_DAY_LOAD_DROP_GW * 1000;

export type LiveResidualSegment = "solid" | "provisional" | "filtered" | "gap";

export type LiveResidualPoint = {
  slot: ResidualSlot;
  /** Hours from Berlin midnight at slot start. */
  hour: number;
  residualGw: number;
  segment: LiveResidualSegment;
};

export type LiveDayPlausibilityResult = {
  points: LiveResidualPoint[];
  /** End of the last plausible quarter (exclusive upper bound for solid metrics). */
  standEndUnixMs: number;
  standLabelHm: string;
  filteredCount: number;
};

function slotHour(slot: ResidualSlot): number {
  return slot.hourBerlin + slot.minuteBerlin / 60;
}

function residualGw(slot: ResidualSlot): number {
  return (slot.loadMw - slot.windMw - slot.solarMw) / 1000;
}

function hmFromSlot(slot: ResidualSlot): string {
  return `${String(slot.hourBerlin).padStart(2, "0")}:${String(slot.minuteBerlin).padStart(2, "0")}`;
}

function standEndHm(unixMs: number): string {
  const end = new Date(unixMs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(end);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Last-Einbruch > 6 GW unter dem letzten plausiblen Wert (Konzept H2, graphs.py `flag`). */
export function loadDropFlags(loadMw: number[]): boolean[] {
  const flags: boolean[] = [];
  let good: number | null = null;
  for (const value of loadMw) {
    if (good !== null && value < good - DROP_MW) {
      flags.push(true);
    } else {
      flags.push(false);
      good = value;
    }
  }
  return flags;
}

export function buildLiveDayPlausibility(slots: ResidualSlot[]): LiveDayPlausibilityResult {
  if (slots.length === 0) {
    return {
      points: [],
      standEndUnixMs: 0,
      standLabelHm: "–",
      filteredCount: 0,
    };
  }

  const flags = loadDropFlags(slots.map((s) => s.loadMw));
  let lastPlausibleIndex = -1;
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (!flags[index]) {
      lastPlausibleIndex = index;
      break;
    }
  }
  if (lastPlausibleIndex < 0) {
    lastPlausibleIndex = 0;
  }

  const standSlot = slots[lastPlausibleIndex]!;
  const standEndUnixMs = Date.parse(standSlot.timestampIso) + 15 * 60 * 1000;
  const provisionalStartMs = standEndUnixMs - LIVE_DAY_PROVISIONAL_HOURS * 60 * 60 * 1000;

  const points: LiveResidualPoint[] = [];
  let filteredCount = 0;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]!;
    const startMs = Date.parse(slot.timestampIso);
    let segment: LiveResidualSegment;
    if (flags[index]) {
      segment = "filtered";
      filteredCount += 1;
    } else if (startMs >= provisionalStartMs) {
      segment = "provisional";
    } else {
      segment = "solid";
    }
    points.push({
      slot,
      hour: slotHour(slot),
      residualGw: residualGw(slot),
      segment,
    });
  }

  return {
    points,
    standEndUnixMs,
    standLabelHm: standEndHm(standEndUnixMs),
    filteredCount,
  };
}

/** Residualwerte, die in der soliden Linie gezeichnet werden dürfen (kein Schein-Überschuss). */
export function solidResidualValues(result: LiveDayPlausibilityResult): number[] {
  return result.points
    .filter((point) => point.segment === "solid" || point.segment === "provisional")
    .map((point) => point.residualGw);
}

export function filteredHmLabels(slots: ResidualSlot[]): string[] {
  const flags = loadDropFlags(slots.map((s) => s.loadMw));
  return slots.filter((_, index) => flags[index]).map(hmFromSlot);
}