import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";

export type ConnectionGridBadgeId = "netzdienlich" | "belastend" | "neutral";

export type ConnectionGridBadge = {
  id: ConnectionGridBadgeId;
  dischargeShareInPeaks: number;
  createsNewPeak: boolean;
  exceedsLimit: boolean;
  neutralHint: string | null;
};

const EPS = 0.05;
const PEAK_UTIL_EPS = 1e-9;
const SUPPORT_EPS = 1e-9;

/**
 * Rule v1: grid position after storage is mitKw = ohneKw + charge − discharge.
 */
export function assessConnectionGridBadge(args: {
  netKw: number[];
  chargeKw: number[];
  dischargeKw: number[];
  limitKw: number;
  feedInLimitKw?: number;
  intervalHours?: number;
}): ConnectionGridBadge {
  const intervalHours = args.intervalHours ?? 0.25;
  const limit = args.limitKw;
  if (!(limit > 0)) {
    return {
      id: "neutral",
      dischargeShareInPeaks: 0,
      createsNewPeak: false,
      exceedsLimit: false,
      neutralHint: "keine Anschlussleistung angegeben",
    };
  }
  const feedInLimit = args.feedInLimitKw ?? limit;
  const peakThreshold = limit * GRID_SUPPORT_CONFIG.peakUtilisation - PEAK_UTIL_EPS;
  const n = args.netKw.length;
  const ohneKw: number[] = [];
  const mitKw: number[] = [];
  let peakBeforeMax = 0;
  let peakAfterMax = 0;
  for (let i = 0; i < n; i += 1) {
    const ohne = args.netKw[i] ?? 0;
    const charge = Math.max(0, args.chargeKw[i] ?? 0);
    const discharge = Math.max(0, args.dischargeKw[i] ?? 0);
    const mit = ohne + charge - discharge;
    ohneKw.push(ohne);
    mitKw.push(mit);
    peakBeforeMax = Math.max(peakBeforeMax, ohne);
    peakAfterMax = Math.max(peakAfterMax, mit);
  }

  let exceedsLimit = false;
  for (let i = 0; i < n; i += 1) {
    if (mitKw[i] > limit + EPS && mitKw[i] > ohneKw[i] + EPS) {
      exceedsLimit = true;
    }
    if (mitKw[i] < -feedInLimit - EPS) {
      exceedsLimit = true;
    }
  }

  let createsNewPeak = false;
  if (peakAfterMax > peakBeforeMax + EPS) {
    for (let i = 0; i < n; i += 1) {
      const charge = Math.max(0, args.chargeKw[i] ?? 0);
      if (charge > 1e-6 && mitKw[i] > peakBeforeMax + EPS) {
        createsNewPeak = true;
        break;
      }
    }
  }

  let dischargeKwh = 0;
  let dischargeInPeakKwh = 0;
  for (let i = 0; i < n; i += 1) {
    const discharge = Math.max(0, args.dischargeKw[i] ?? 0);
    const delivered = discharge * intervalHours;
    dischargeKwh += delivered;
    if (ohneKw[i] >= peakThreshold) {
      dischargeInPeakKwh += delivered;
    }
  }
  const dischargeShareInPeaks = dischargeKwh > 0 ? dischargeInPeakKwh / dischargeKwh : 0;

  if (createsNewPeak || exceedsLimit) {
    return { id: "belastend", dischargeShareInPeaks, createsNewPeak, exceedsLimit, neutralHint: null };
  }
  if (dischargeShareInPeaks >= GRID_SUPPORT_CONFIG.supportiveMinShare - SUPPORT_EPS) {
    return { id: "netzdienlich", dischargeShareInPeaks, createsNewPeak, exceedsLimit, neutralHint: null };
  }
  return { id: "neutral", dischargeShareInPeaks, createsNewPeak, exceedsLimit, neutralHint: null };
}
