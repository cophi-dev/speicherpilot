import type { FleetDataProvenance } from "@/lib/loadLargeBatteryFleet";

export function fleetStandLabelDe(provenance: FleetDataProvenance, source: "battery-charts" | "energy-charts", standDe: string): string {
  const name = source === "battery-charts" ? "Battery Charts" : "Energy-Charts";
  if (provenance === "committed-snapshot") {
    return `${name}, gespeicherter Stand (Fallback), ${standDe}`;
  }
  if (provenance === "battery-charts-live") {
    return `${name}, Live-Stand ${standDe}`;
  }
  if (provenance === "energy-charts-fallback") {
    return `${name}, Energy-Charts-Fallback, ${standDe}`;
  }
  return `${name}, zwischengespeicherter Stand (Cache), ${standDe}`;
}
