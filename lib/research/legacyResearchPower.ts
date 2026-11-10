import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";
import { parseWindSolarDays, type ResidualDay } from "@/lib/windSolarResidual";

/** v1 feed: `Load` series matches nachrechnung v3; v2 `load_incl_self_consumption` does not. */
export function legacyTotalPowerUrl(start: string, end: string): string {
  return `https://api.energy-charts.info/total_power?country=de&start=${start}&end=${end}`;
}

export function residualDaysFromEnergyChartsPayload(payload: unknown): ResidualDay[] {
  const parsed = parsePowerPayload(payload);
  if (parsed) {
    return residualDaysFromSlots(parsed);
  }
  return parseWindSolarDays(payload);
}
