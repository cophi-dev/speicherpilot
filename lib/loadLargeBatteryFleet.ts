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

export type FleetDataProvenance = "battery-charts-live" | "committed-snapshot" | "energy-charts-fallback" | "last-good-cache";

let lastFleetProvenance: FleetDataProvenance = "battery-charts-live";

export function lastFleetDataProvenance(): FleetDataProvenance {
  return lastFleetProvenance;
}

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
      lastFleetProvenance = "battery-charts-live";
      return live;
    }
  } catch {
    // Battery Charts did not answer. The committed stand is next.
  }
  const snapshot = readFleetSnapshot(now);
  if (snapshot) {
    lastFleetProvenance = "committed-snapshot";
    return snapshot;
  }
  const ec = await loadEnergyChartsFleet();
  if (ec) {
    lastFleetProvenance = "energy-charts-fallback";
  }
  return ec;
}

export function clearLargeBatteryFleetCache(): void {
  lastGood = null;
}

export async function loadLargeBatteryFleet(now: Date = new Date()): Promise<LargeBatteryFleet | null> {
  try {
    const fleet = await loadFreshFleet(now);
    if (!fleet) {
      lastFleetProvenance = "last-good-cache";
      return lastGood;
    }
    lastGood = fleet;
    return fleet;
  } catch {
    lastFleetProvenance = "last-good-cache";
    return lastGood;
  }
}
