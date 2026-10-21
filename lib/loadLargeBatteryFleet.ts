import "server-only";

import {
  BATTERY_CHARTS_ENERGY_QUERY,
  BATTERY_CHARTS_POWER_QUERY,
  LARGE_BATTERY_FLEET_URL,
  batteryChartsDataUrl,
  parseBatteryChartsFleet,
  parseLargeBatteryFleet,
  type LargeBatteryFleet,
} from "@/lib/largeBatteryFleet";

const CACHE_MS = 5 * 60 * 1000;

let cache: { at: number; fleet: LargeBatteryFleet } | null = null;

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
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

export async function loadLargeBatteryFleet(): Promise<LargeBatteryFleet | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.fleet;
  }
  try {
    const fleet = (await loadBatteryChartsFleet()) ?? (await loadEnergyChartsFleet());
    if (!fleet) {
      return cache?.fleet ?? null;
    }
    cache = { at: Date.now(), fleet };
    return fleet;
  } catch {
    try {
      const fleet = await loadEnergyChartsFleet();
      if (!fleet) {
        return cache?.fleet ?? null;
      }
      cache = { at: Date.now(), fleet };
      return fleet;
    } catch {
      return cache?.fleet ?? null;
    }
  }
}
