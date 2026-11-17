import "server-only";

import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import {
  buildMarktInsights,
  pickMarktInsightsForRoute,
  type MarktInsight,
  type MarktInsightsRoute,
} from "@/lib/marktInsights";
import {
  loadNationalFleetBundleMeta,
  loadNationalFleetMonthBundle,
} from "@/lib/nationalMonthFleetModel.server";
import { nationalFleetMonthAvailable } from "@/lib/nationalMonthFleetModel";

export function marktInsightsForRoute(args: {
  route: MarktInsightsRoute;
  records: TagesKennzahlRecord[];
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  focusDayKey?: string;
  overview30?: OverviewEvaluation | null;
  monthKey?: string;
  max?: number;
}): MarktInsight[] {
  const metaMonth =
    args.monthKey && nationalFleetMonthAvailable(args.monthKey)
      ? args.monthKey
      : args.route === "monat" || args.route === "ort"
        ? args.monthKey
        : args.focusDayKey?.slice(0, 7);
  const fleetBundle =
    metaMonth && nationalFleetMonthAvailable(metaMonth)
      ? args.route === "monat" || args.route === "ort" || args.route === "tag" || args.route === "beitraege"
        ? loadNationalFleetMonthBundle(metaMonth)
        : loadNationalFleetBundleMeta(metaMonth)
      : null;

  const all = buildMarktInsights({
    records: args.records,
    fleetPowerGw: args.fleetPowerGw,
    fleetEnergyGwh: args.fleetEnergyGwh,
    focusDayKey: args.focusDayKey,
    overview30: args.overview30,
    fleetBundle: fleetBundle as never,
  });

  return pickMarktInsightsForRoute(args.route, all, args.max ?? 4);
}
