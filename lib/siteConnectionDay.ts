import { supermarketTeachingDay } from "@/lib/peakShavingExplain";
import {
  assessGridSupport,
  GRID_SUPPORT_CONFIG,
  type GridSupportAssessment,
  type SitePlan,
} from "@/lib/sitePlanner";

export type ConnectionPoint = {
  hour: number;
  /** Grid position before storage, kW. Positive is import. */
  ohneKw: number;
  /** Grid position after storage, kW. */
  mitKw: number;
  chargeKw: number;
  dischargeKw: number;
  /** 0–1 of the example battery. */
  soc: number;
};

export type ConnectionBadge = {
  met: boolean;
  /** Neutral wording. Failure is not a red state. */
  label: "netzdienlich" | "nicht erfüllt";
  dischargeShare: number;
  createsNewPeak: boolean;
};

export function connectionBadge(assessment: GridSupportAssessment): ConnectionBadge {
  const met = assessment.status === "supportive";
  return {
    met,
    label: met ? "netzdienlich" : "nicht erfüllt",
    dischargeShare: assessment.dischargeShareInPeaks,
    createsNewPeak: assessment.createsNewPeak,
  };
}

export type SiteConnectionStory = {
  limitKw: number;
  powerKw: number;
  energyKwh: number;
  rte: number;
  points: ConnectionPoint[];
  peakBeforeKw: number;
  peakAfterKw: number;
  /** Hours on this day when the pre-storage import exceeds the connection. */
  hoursOverLimit: number;
  dischargedKwh: number;
  /** Grid energy taken while charging. Includes round-trip losses relative to discharge. */
  chargedKwh: number;
  badge: ConnectionBadge;
};

function walkSoc(chargeKw: number[], dischargeKw: number[], energyKwh: number, rte: number): number[] {
  const eta = Math.sqrt(Math.min(1, Math.max(0.1, rte)));
  const needed = dischargeKw.reduce((sum, value) => sum + Math.max(0, value) * 0.25 / eta, 0);
  let soc = Math.min(energyKwh * 0.95, Math.max(energyKwh * 0.1, needed));
  return chargeKw.map((charge, index) => {
    const discharge = dischargeKw[index] ?? 0;
    soc += Math.max(0, charge) * eta * 0.25;
    soc -= Math.max(0, discharge) / eta * 0.25;
    soc = Math.max(0, Math.min(energyKwh, soc));
    return energyKwh > 0 ? soc / energyKwh : 0;
  });
}

export function storyFromPlan(plan: SitePlan, limitKw: number, rte: number): SiteConnectionStory {
  const day = plan.peakDay;
  const soc = walkSoc(day.chargeKw, day.dischargeKw, plan.energyKwh, rte);
  const points: ConnectionPoint[] = day.loadKw.map((load, index) => {
    const ohneKw = load - (day.pvKw[index] ?? 0);
    return {
      hour: index / 4,
      ohneKw,
      mitKw: day.gridKw[index] ?? ohneKw,
      chargeKw: Math.max(0, day.chargeKw[index] ?? 0),
      dischargeKw: Math.max(0, day.dischargeKw[index] ?? 0),
      soc: soc[index] ?? 0,
    };
  });
  let hoursOver = 0;
  let dischargedKwh = 0;
  let chargedKwh = 0;
  let peakBefore = Number.NEGATIVE_INFINITY;
  let peakAfter = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    peakBefore = Math.max(peakBefore, point.ohneKw);
    peakAfter = Math.max(peakAfter, point.mitKw);
    dischargedKwh += point.dischargeKw * 0.25;
    chargedKwh += point.chargeKw * 0.25;
    if (point.ohneKw > limitKw) {
      hoursOver += 0.25;
    }
  }
  return {
    limitKw,
    powerKw: plan.powerKw,
    energyKwh: plan.energyKwh,
    rte,
    points,
    peakBeforeKw: Number.isFinite(peakBefore) ? peakBefore : 0,
    peakAfterKw: Number.isFinite(peakAfter) ? peakAfter : 0,
    hoursOverLimit: hoursOver,
    dischargedKwh,
    chargedKwh,
    badge: connectionBadge(plan.gridSupport),
  };
}

/**
 * Same day as the homepage peak-shaving story: full at midnight, 40 kW / 40 kWh,
 * recharge from 19:30 at most 15 kW, √round-trip efficiency. Not the year planner.
 */
export function supermarketConnectionStory(): SiteConnectionStory {
  const day = supermarketTeachingDay();
  const points: ConnectionPoint[] = day.quarters.map((quarter) => ({
    hour: quarter.hour,
    ohneKw: quarter.loadKw,
    mitKw: quarter.netKw,
    chargeKw: Math.max(0, -quarter.batteryKw),
    dischargeKw: Math.max(0, quarter.batteryKw),
    soc: day.energyKwh > 0 ? quarter.socKwh / day.energyKwh : 0,
  }));
  let hoursOver = 0;
  let dischargedKwh = 0;
  let chargedKwh = 0;
  for (const point of points) {
    dischargedKwh += point.dischargeKw * 0.25;
    chargedKwh += point.chargeKw * 0.25;
    if (point.ohneKw > day.limitKw) {
      hoursOver += 0.25;
    }
  }
  const assessment = assessGridSupport({
    loadKw: points.map((point) => point.ohneKw),
    chargeKw: points.map((point) => point.chargeKw),
    dischargeKw: points.map((point) => point.dischargeKw),
    gridKw: points.map((point) => point.mitKw),
    netKw: points.map((point) => point.ohneKw),
    limitKw: day.limitKw,
    intervalHours: 0.25,
  });
  return {
    limitKw: day.limitKw,
    powerKw: day.powerKw,
    energyKwh: day.energyKwh,
    rte: day.roundTripEfficiency,
    points,
    peakBeforeKw: day.peakBeforeKw,
    peakAfterKw: day.peakAfterKw,
    hoursOverLimit: hoursOver,
    dischargedKwh,
    chargedKwh,
    badge: connectionBadge(assessment),
  };
}

/** Mean import from 12:00 inclusive to 14:00 exclusive. Null when that window is empty. */
export function middayMeanKw(points: ConnectionPoint[]): number | null {
  const window = points.filter((point) => point.hour >= 12 && point.hour < 14);
  if (window.length === 0) {
    return null;
  }
  return window.reduce((sum, point) => sum + point.ohneKw, 0) / window.length;
}

/** 0 % of discharge sits in a peak window when the connection is never that full. */
export function zeroUtilisationAssessment(): GridSupportAssessment {
  return assessGridSupport({
    loadKw: [10, 10, 10, 10],
    chargeKw: [0, 0, 0, 0],
    dischargeKw: [4, 4, 4, 4],
    gridKw: [6, 6, 6, 6],
    netKw: [10, 10, 10, 10],
    limitKw: 100,
    intervalHours: 0.25,
    config: GRID_SUPPORT_CONFIG,
  });
}

/** Every discharge interval is at or above 90 % of the connection, and charging adds no peak. */
export function fullUtilisationAssessment(): GridSupportAssessment {
  return assessGridSupport({
    loadKw: [100, 100, 95, 20],
    chargeKw: [0, 0, 0, 5],
    dischargeKw: [10, 10, 8, 0],
    gridKw: [90, 90, 87, 25],
    netKw: [100, 100, 95, 20],
    limitKw: 100,
    intervalHours: 0.25,
    config: GRID_SUPPORT_CONFIG,
  });
}
