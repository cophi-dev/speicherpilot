import "server-only";

import { dailySeriesFetchInit } from "@/lib/dailySeriesCache";
import { readFleetSnapshot } from "@/lib/fleetSnapshot";
import {
  BATTERY_CHARTS_ENERGY_QUERY,
  BATTERY_CHARTS_POWER_QUERY,
  LARGE_BATTERY_FLEET_URL,
  batteryChartsDataUrl,
  parseBatteryChartsFleet,
  parseLargeBatteryFleet,
  type LargeBatteryFleet,
} from "@/lib/largeBatteryFleet";

/** Last successful fleet. Returned only when a later load fails. The label keeps that stand's date. */
let lastGood: LargeBatteryFleet | null = null;

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, dailySeriesFetchInit(12_000));
  if (!response.ok) {
    throw new Error(`Fleet request failed with ${response.status}`);
  }
  return response.json();
}

async function loadBatteryChartsFleet(): Promise<LargeBatteryFleet | null> {
  const [power, energy] = await Promise.all([
    readJson(batteryChartsDataUrl(BATTERY_CHARTS_POWER_QUERY)),
    readJson(batteryChartsDataUrl(BATTERY_CHARTS_ENERGY_QUERY)),
  ]);
  return parseBatteryChartsFleet(power, energy);
}

async function loadEnergyChartsFleet(): Promise<LargeBatteryFleet | null> {
  const payload = await readJson(LARGE_BATTERY_FLEET_URL);
  return parseLargeBatteryFleet(payload);
}

async function loadFreshFleet(now: Date): Promise<LargeBatteryFleet | null> {
  try {
    const live = await loadBatteryChartsFleet();
    if (live) {
      return live;
    }
  } catch {
    // Battery Charts did not answer. The committed stand is next.
  }
  const snapshot = readFleetSnapshot(now);
  if (snapshot) {
    return snapshot;
  }
  return loadEnergyChartsFleet();
}

export function clearLargeBatteryFleetCache(): void {
  lastGood = null;
}

export async function loadLargeBatteryFleet(now: Date = new Date()): Promise<LargeBatteryFleet | null> {
  try {
    const fleet = await loadFreshFleet(now);
    if (!fleet) {
      return lastGood;
    }
    lastGood = fleet;
    return fleet;
  } catch {
    return lastGood;
  }
}
