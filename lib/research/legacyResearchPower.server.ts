import "server-only";

import { legacyTotalPowerUrl, residualDaysFromEnergyChartsPayload } from "@/lib/research/legacyResearchPower";
import type { ResidualDay } from "@/lib/windSolarResidual";

export { legacyTotalPowerUrl, residualDaysFromEnergyChartsPayload };

export async function fetchLegacyResearchDays(start: string, end: string): Promise<ResidualDay[]> {
  const url = legacyTotalPowerUrl(start, end);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    return [];
  }
  return residualDaysFromEnergyChartsPayload(await res.json());
}
