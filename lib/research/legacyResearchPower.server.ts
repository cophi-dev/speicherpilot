import "server-only";

import { dailySeriesFetchInit } from "@/lib/dailySeriesCache";
import { legacyTotalPowerUrl, residualDaysFromEnergyChartsPayload } from "@/lib/research/legacyResearchPower";
import type { ResidualDay } from "@/lib/windSolarResidual";

export { legacyTotalPowerUrl, residualDaysFromEnergyChartsPayload };

export async function fetchLegacyResearchDays(start: string, end: string): Promise<ResidualDay[]> {
  const url = legacyTotalPowerUrl(start, end);
  const res = await fetch(url, dailySeriesFetchInit(20_000));
  if (!res.ok) {
    return [];
  }
  return residualDaysFromEnergyChartsPayload(await res.json());
}
