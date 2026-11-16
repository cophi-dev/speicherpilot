import "server-only";

import type { MarktInsight } from "@/lib/marktInsights";
import { loadGermanyViewForTag } from "@/lib/germanyViewTag.server";
import { marktInsightsForRoute } from "@/lib/marktInsightsPage.server";
import { resolveNavShortcuts } from "@/lib/navShortcuts.server";

/** Markt-Kontext auf /beitraege: gleiche Daten und Regeln wie /tag, Fokus Vortag (Berlin). */
export async function loadBeitraegeMarktInsights(): Promise<{
  marktInsights: MarktInsight[];
  focusDayKey: string;
}> {
  const { lastCompleteDayKey } = await resolveNavShortcuts();
  const view = await loadGermanyViewForTag(lastCompleteDayKey);
  const records = view.auffaelligkeitRecords ?? [];
  const fleet = view.dispatch.fleet;
  const focusDayKey = view.lastCompleteDayKey;

  const marktInsights = marktInsightsForRoute({
    route: "beitraege",
    records,
    fleetPowerGw: fleet?.powerGw ?? 0,
    fleetEnergyGwh: fleet?.energyGwh ?? 0,
    focusDayKey,
    overview30: view.dayOverview,
  });

  return { marktInsights, focusDayKey };
}