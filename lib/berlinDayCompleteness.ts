import { findFirstUnixSecondForBerlinDateKey, nextBerlinDateKey } from "@/lib/berlinCalendar";
import {
  CARRIER_IDS,
  type PowerSlot,
  slotsInRange,
  solarMw,
  windMw,
} from "@/lib/powerMix";

const GRID_STEP_S = 900;

export type BerlinDayCompleteness = {
  ok: boolean;
  expectedQuarters: number;
  actualQuarters: number;
  reason: "ok" | "count" | "grid" | "duplicate" | "load" | "wind_solar" | "generation";
  residualComplete: boolean;
  generationComplete: boolean;
};

/** Exact quarter-hour count for a Berlin calendar day (92 spring forward, 96 normal, 100 fall back). */
export function expectedBerlinQuarters(dateKey: string): number {
  const start = findFirstUnixSecondForBerlinDateKey(dateKey);
  const end = findFirstUnixSecondForBerlinDateKey(nextBerlinDateKey(dateKey));
  const count = Math.round((end - start) / GRID_STEP_S);
  if (count !== 92 && count !== 96 && count !== 100) {
    throw new Error(`Unexpected Berlin quarter count ${count} for ${dateKey}`);
  }
  return count;
}

export function auditBerlinPowerDay(
  daySlots: PowerSlot[],
  dateKey: string,
  offshorePresent: boolean
): BerlinDayCompleteness {
  const expectedQuarters = expectedBerlinQuarters(dateKey);
  if (daySlots.length !== expectedQuarters) {
    return {
      ok: false,
      expectedQuarters,
      actualQuarters: daySlots.length,
      reason: "count",
      residualComplete: false,
      generationComplete: false,
    };
  }
  const start = findFirstUnixSecondForBerlinDateKey(dateKey);
  const seen = new Set<number>();
  let residualComplete = true;
  let generationComplete = true;
  for (let i = 0; i < daySlots.length; i += 1) {
    const slot = daySlots[i];
    if (slot.dateBerlin !== dateKey) {
      return {
        ok: false,
        expectedQuarters,
        actualQuarters: daySlots.length,
        reason: "grid",
        residualComplete: false,
        generationComplete: false,
      };
    }
    const want = start + i * GRID_STEP_S;
    if (slot.unixSeconds !== want) {
      return {
        ok: false,
        expectedQuarters,
        actualQuarters: daySlots.length,
        reason: "grid",
        residualComplete: false,
        generationComplete: false,
      };
    }
    if (seen.has(slot.unixSeconds)) {
      return {
        ok: false,
        expectedQuarters,
        actualQuarters: daySlots.length,
        reason: "duplicate",
        residualComplete: false,
        generationComplete: false,
      };
    }
    seen.add(slot.unixSeconds);
    const wind = windMw(slot, offshorePresent);
    const solar = solarMw(slot);
    if (slot.loadMw === null || wind === null || solar === null) {
      residualComplete = false;
    }
    for (const id of CARRIER_IDS) {
      if (slot.carriers[id] === null) {
        generationComplete = false;
      }
    }
  }
  if (!residualComplete) {
    return {
      ok: false,
      expectedQuarters,
      actualQuarters: daySlots.length,
      reason: "wind_solar",
      residualComplete: false,
      generationComplete,
    };
  }
  if (!generationComplete) {
    return {
      ok: false,
      expectedQuarters,
      actualQuarters: daySlots.length,
      reason: "generation",
      residualComplete: true,
      generationComplete: false,
    };
  }
  return {
    ok: true,
    expectedQuarters,
    actualQuarters: daySlots.length,
    reason: "ok",
    residualComplete: true,
    generationComplete: true,
  };
}

/** Newest day with a full Berlin grid and complete load, wind, solar and generation carriers. */
export function pickNewestStrictCompletePowerDayKey(
  slots: PowerSlot[],
  offshorePresent: boolean,
  todayKey: string
): string | null {
  const keys = new Set<string>();
  for (const slot of slots) {
    if (slot.dateBerlin <= todayKey) {
      keys.add(slot.dateBerlin);
    }
  }
  const ordered = [...keys].sort((a, b) => (a < b ? 1 : -1));
  for (const key of ordered) {
    const daySlots = slotsInRange(slots, key, key);
    const audit = auditBerlinPowerDay(daySlots, key, offshorePresent);
    if (audit.ok) {
      return key;
    }
  }
  return null;
}

export function strictResidualPreludeComplete(
  slots: PowerSlot[],
  offshorePresent: boolean,
  endKey: string,
  dayKeys: string[]
): boolean {
  for (const key of dayKeys) {
    if (key > endKey) {
      continue;
    }
    const daySlots = slotsInRange(slots, key, key);
    const expected = expectedBerlinQuarters(key);
    if (daySlots.length !== expected) {
      return false;
    }
    const start = findFirstUnixSecondForBerlinDateKey(key);
    for (let i = 0; i < daySlots.length; i += 1) {
      const slot = daySlots[i];
      if (slot.unixSeconds !== start + i * GRID_STEP_S) {
        return false;
      }
      const wind = windMw(slot, offshorePresent);
      const solar = solarMw(slot);
      if (slot.loadMw === null || wind === null || solar === null) {
        return false;
      }
    }
  }
  return true;
}
