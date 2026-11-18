import "server-only";

import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { loadGermanyView } from "@/lib/germanyView";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import type { LiveTagView } from "@/lib/liveTagView.server";
import type { PreisTick } from "@/lib/preisFenster";
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

const LIVE_TAG_DAY_AHEAD_MIN_TICKS = 92;

function priceStatsFromDayAheadTicks(prices: PreisTick[]): Pick<
  TagesKennzahlRecord,
  "pmin" | "pminAt" | "pmax" | "pmaxAt" | "spread" | "negH"
> {
  let pmin = Number.POSITIVE_INFINITY;
  let pmax = Number.NEGATIVE_INFINITY;
  let pminAt: string | null = null;
  let pmaxAt: string | null = null;
  let negH = 0;
  for (const tick of prices) {
    const value = tick.eurPerMwh;
    if (value < pmin) {
      pmin = value;
      pminAt = tick.hm;
    }
    if (value > pmax) {
      pmax = value;
      pmaxAt = tick.hm;
    }
    if (value < 0) {
      negH += 0.25;
    }
  }
  if (!Number.isFinite(pmin) || !Number.isFinite(pmax)) {
    return {
      pmin: null,
      pminAt: null,
      pmax: null,
      pmaxAt: null,
      spread: null,
      negH: null,
    };
  }
  return {
    pmin,
    pminAt,
    pmax,
    pmaxAt,
    spread: pmax - pmin,
    negH: negH > 0 ? negH : 0,
  };
}

function stubFocusRecord(dayKey: string): TagesKennzahlRecord {
  return {
    dateKey: dayKey,
    surplusGwh: 1,
    surplusH: 0,
    spread: null,
    pmin: null,
    pminAt: null,
    pmax: null,
    pmaxAt: null,
    negH: null,
    eveningPeakGw: null,
    eveningPeakAt: null,
    peakCutGw: null,
    absorbedGwh: 0,
    fullAt: null,
    fullMin: null,
    wsShare: 0,
    dryStreak: 0,
  };
}

/** SSR Markt-Insights für den laufenden Tag: Day-Ahead vollständig, Restlast noch vorläufig. */
export async function marktInsightsForLiveTag(
  view: Pick<LiveTagView, "dayKey" | "preisToday" | "fleetPowerGw" | "fleetEnergyGwh">,
): Promise<MarktInsight[]> {
  if (view.preisToday.length < LIVE_TAG_DAY_AHEAD_MIN_TICKS) {
    return [];
  }

  const germanyView = await loadGermanyView(new Date(), "/tag", { tag: view.dayKey });
  const records = germanyView.auffaelligkeitRecords ?? [];
  if (records.length === 0) {
    return [];
  }

  const priceStats = priceStatsFromDayAheadTicks(view.preisToday);
  const existing = records.find((r) => r.dateKey === view.dayKey);
  const focusRecord: TagesKennzahlRecord = {
    ...(existing ?? stubFocusRecord(view.dayKey)),
    ...priceStats,
  };
  const merged = [...records.filter((r) => r.dateKey !== view.dayKey), focusRecord];

  return marktInsightsForRoute({
    route: "tag",
    records: merged,
    fleetPowerGw: view.fleetPowerGw,
    fleetEnergyGwh: view.fleetEnergyGwh,
    focusDayKey: view.dayKey,
    overview30: germanyView.dayOverview,
    monthKey: view.dayKey.slice(0, 7),
  });
}
