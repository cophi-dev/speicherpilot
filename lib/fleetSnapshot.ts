import snapshot from "@/data/fleet-snapshot.json";
import { parseBatteryChartsFleet, type LargeBatteryFleet } from "@/lib/largeBatteryFleet";

/** Energy-Charts is used only once this committed stand is older than 30 days. */
export const FLEET_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Committed Battery Charts stand. Live Battery Charts is preferred.
 * A clock before the stand still counts as current.
 */
export function readFleetSnapshot(now: Date = new Date()): LargeBatteryFleet | null {
  if (snapshot.source !== "battery-charts.de") {
    return null;
  }
  const fleet = parseBatteryChartsFleet(
    [{ date: `${snapshot.stand} 00:00:00`, grossspeicher: snapshot.powerGw * 1_000_000 }],
    [{ date: `${snapshot.stand} 00:00:00`, grossspeicher: snapshot.energyGwh * 1_000_000 }]
  );
  if (!fleet) {
    return null;
  }
  const ageMs = now.getTime() - Date.parse(fleet.updatedAtIso);
  if (!Number.isFinite(ageMs) || ageMs > FLEET_SNAPSHOT_MAX_AGE_MS) {
    return null;
  }
  return fleet;
}
