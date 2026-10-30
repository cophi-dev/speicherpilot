import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";

export type ConnectionGridBadgeId = "netzdienlich" | "belastend" | "neutral";

export type ConnectionGridBadge = {
  id: ConnectionGridBadgeId;
  dischargeShareInPeaks: number;
  createsNewPeak: boolean;
  exceedsLimit: boolean;
};

/**
 * Rule v1 for one connection point (simulator).
 * belastend: new import peak from charge/discharge or power above the allowed connection.
 * netzdienlich: ≥60 % discharge energy in intervals with ≥90 % connection use and no new peak from charging.
 */
export function assessConnectionGridBadge(args: {
  netKw: number[];
  chargeKw: number[];
  dischargeKw: number[];
  limitKw: number;
  intervalHours?: number;
}): ConnectionGridBadge {
  const intervalHours = args.intervalHours ?? 0.25;
  const limit = Math.max(0, args.limitKw);
  const threshold = limit * GRID_SUPPORT_CONFIG.peakUtilisation;
  let peakBefore = 0;
  for (const net of args.netKw) {
    if (net > peakBefore) {
      peakBefore = net;
    }
  }
  let dischargeKwh = 0;
  let dischargeInPeakKwh = 0;
  let createsNewPeak = false;
  let exceedsLimit = false;
  const n = args.netKw.length;
  for (let i = 0; i < n; i += 1) {
    const charge = Math.max(0, args.chargeKw[i] ?? 0);
    const discharge = Math.max(0, args.dischargeKw[i] ?? 0);
    const net = args.netKw[i] ?? 0;
    if (limit > 0 && (net > limit + 0.05 || (charge > 0 && net + charge > limit + 0.05))) {
      exceedsLimit = true;
    }
    const delivered = discharge * intervalHours;
    dischargeKwh += delivered;
    if (net >= threshold) {
      dischargeInPeakKwh += delivered;
    }
    if (charge > 1e-6 && net + charge > peakBefore + 0.05) {
      createsNewPeak = true;
    }
  }
  const dischargeShareInPeaks = dischargeKwh > 0 ? dischargeInPeakKwh / dischargeKwh : 0;
  if (createsNewPeak || exceedsLimit) {
    return { id: "belastend", dischargeShareInPeaks, createsNewPeak, exceedsLimit };
  }
  if (dischargeShareInPeaks >= GRID_SUPPORT_CONFIG.supportiveMinShare) {
    return { id: "netzdienlich", dischargeShareInPeaks, createsNewPeak, exceedsLimit };
  }
  return { id: "neutral", dischargeShareInPeaks, createsNewPeak, exceedsLimit };
}
