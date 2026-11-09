import { formatQuantity } from "@/lib/formatQuantity";
import {
  monthStatsForRun,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import type { ThreeGoalsCompareModel } from "@/lib/nationalFleetThreeGoals";
import { buildThreeGoalsCompare } from "@/lib/nationalFleetThreeGoals";

export type ArbeitWirkungPoint = {
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  chargeGwh: number;
  wirkungGw: number;
  peakAfterGw: number;
  peakTs: string | null;
  priceEurMwh: number | null;
};

export type ArbeitWirkungModel = {
  monthKey: string;
  refPeakGw: number;
  refPeakTs: string | null;
  surplusPoolGwh: number;
  points: ArbeitWirkungPoint[];
  marktX10: ArbeitWirkungPoint | null;
  compare: ThreeGoalsCompareModel;
};

const STRATEGIES: NationalFleetStrategyUi[] = ["spitze", "ueberschuss", "markt"];

function strategyFileKey(strategy: NationalFleetStrategyUi): string {
  const map = {
    ueberschuss: "surplus_wind_solar_over_load",
    spitze: "min_peak_perfect_foresight",
    markt: "price_oriented_da_arbitrage",
  } as const;
  return map[strategy];
}

function summaryRow(bundle: NationalFleetMonthBundle, factor: NationalFleetFactor, strategy: NationalFleetStrategyUi) {
  return bundle.summary[String(factor)]?.[strategyFileKey(strategy)] as Record<string, unknown> | undefined;
}

export function buildArbeitWirkungModel(bundle: NationalFleetMonthBundle): ArbeitWirkungModel {
  const compare = buildThreeGoalsCompare(bundle);
  const refRow = summaryRow(bundle, 1, "ueberschuss");
  const refPeakTs =
    typeof refRow?.baseline_max_residual_ts === "string" ? refRow.baseline_max_residual_ts : null;
  const surplusPoolGwh = (bundle.provenance?.month_surplus_pool_gwh as number | undefined) ?? 0;

  const points: ArbeitWirkungPoint[] = [];
  for (const strategy of STRATEGIES) {
    for (const factor of NATIONAL_FLEET_FACTORS) {
      const st = monthStatsForRun(bundle, factor, strategy);
      const row = summaryRow(bundle, factor, strategy);
      const peakTs = typeof row?.after_max_residual_ts === "string" ? row.after_max_residual_ts : null;
      const price =
        typeof row?.after_max_residual_price_eur_mwh === "number"
          ? row.after_max_residual_price_eur_mwh
          : null;
      points.push({
        factor,
        strategy,
        chargeGwh: st.chargeGwh,
        wirkungGw: st.peakReductionGw,
        peakAfterGw: st.peakAfterGw,
        peakTs,
        priceEurMwh: price,
      });
    }
  }

  const marktX10 = points.find((p) => p.strategy === "markt" && p.factor === 10) ?? null;

  return {
    monthKey: compare.monthKey,
    refPeakGw: compare.refPeakGw,
    refPeakTs,
    surplusPoolGwh,
    points,
    marktX10,
    compare,
  };
}

export function arbeitWirkungHref(
  monthKey: string,
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): string {
  return `/monat/${monthKey}?faktor=${factor}&fahrweise=${strategy}`;
}

export function formatKonzeptPeakInstant(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const match = ts.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return ts;
  return `${Number(match[3])}.${Number(match[2])}., ${match[4]}:${match[5]}`;
}

export function strategyColorClass(strategy: NationalFleetStrategyUi): string {
  if (strategy === "spitze") return "spitze";
  if (strategy === "ueberschuss") return "ueberschuss";
  return "markt";
}

export function factorLabel(factor: NationalFleetFactor): string {
  return `×${factor}`;
}

export function logTickGwh(maxGwh: number): number[] {
  const ticks = [10, 100, 1000, 10000];
  return ticks.filter((t) => t <= maxGwh * 1.05);
}

export function formatGwhTick(v: number): string {
  if (v >= 1000) {
    return formatQuantity(v, "de", v % 1000 === 0 ? 0 : 1);
  }
  return formatQuantity(v, "de", 0);
}
