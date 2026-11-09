import { formatQuantity } from "@/lib/formatQuantity";
import {
  monthStatsForRun,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_MONTH_KEY,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export type ThreeGoalsFactorCell = {
  factor: NationalFleetFactor;
  chargeGwh: number;
  peakAfterGw: number;
  peakReductionGw: number;
};

export type ThreeGoalsStrategyRow = {
  strategy: NationalFleetStrategyUi;
  label: string;
  shortLabel: string;
  cells: ThreeGoalsFactorCell[];
};

export type ThreeGoalsCompareModel = {
  monthKey: string;
  refPeakGw: number;
  rows: ThreeGoalsStrategyRow[];
  marktX10PeakTs: string | null;
};

const STRATEGIES: NationalFleetStrategyUi[] = ["ueberschuss", "spitze", "markt"];

export function buildThreeGoalsCompare(bundle: NationalFleetMonthBundle): ThreeGoalsCompareModel {
  const ref =
    (bundle.summary["1"]?.surplus_wind_solar_over_load?.baseline_max_residual_mw as number | undefined) ??
    (bundle.physics?.baseline_max_residual_mw as number | undefined) ??
    64405.9;
  const refPeakGw = ref / 1000;

  const rows = STRATEGIES.map((strategy) => {
    const cells = NATIONAL_FLEET_FACTORS.map((factor) => {
      const st = monthStatsForRun(bundle, factor, strategy);
      return {
        factor,
        chargeGwh: st.chargeGwh,
        peakAfterGw: st.peakAfterGw,
        peakReductionGw: st.peakReductionGw,
      };
    });
    const ui = NATIONAL_FLEET_STRATEGY_UI[strategy];
    return {
      strategy,
      label: ui.labelDe,
      shortLabel: ui.shortDe,
      cells,
    };
  });

  const marktX10 = bundle.summary["10"]?.price_oriented_da_arbitrage as Record<string, unknown> | undefined;
  const marktX10PeakTs = typeof marktX10?.after_max_residual_ts === "string" ? marktX10.after_max_residual_ts : null;

  return {
    monthKey: bundle.monthKey ?? NATIONAL_FLEET_MONTH_KEY,
    refPeakGw,
    rows,
    marktX10PeakTs,
  };
}

export type MarktPeakFootnoteDetail = {
  peakAfterGw: number;
  timestampBerlin: string;
  residualGw: number;
  chargeGw: number;
  priceEurMwh: number;
};

export function marktPeakFootnoteFromRun(
  timestampBerlin: string,
  rMw: number,
  rPrimeMw: number,
  cMw: number,
  price: number,
): MarktPeakFootnoteDetail {
  return {
    peakAfterGw: rPrimeMw / 1000,
    timestampBerlin,
    residualGw: rMw / 1000,
    chargeGw: cMw / 1000,
    priceEurMwh: price,
  };
}

function formatPeakInstantBerlin(ts: string): string {
  const match = ts.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return ts;
  }
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}, ${match[4]}:${match[5]} Uhr`;
}

export function formatMarktPeakFootnote(d: MarktPeakFootnoteDetail): string {
  const when = formatPeakInstantBerlin(d.timestampBerlin);
  return `Marktorientiert ×10 hebt die Monats-Restlastspitze auf ${formatQuantity(d.peakAfterGw, "de", 2)} GW (${when}: ${formatQuantity(d.residualGw, "de", 2)} GW Restlast + ${formatQuantity(d.chargeGw, "de", 1)} GW Laden bei ${formatQuantity(d.priceEurMwh, "de", 2)} €/MWh). Kein Preisrückwirkungsmodell — die Preise bleiben historisch.`;
}
