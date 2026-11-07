import {
  monthStatsForRun,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type MarginalCaptureRow,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export type StrategyMarginalStep = {
  from_factor: NationalFleetFactor;
  to_factor: NationalFleetFactor;
  delta_factor_units: number;
  delta_capture_gwh: number;
  delta_peak_reduction_mw: number;
};

const STEP_DELTAS: Array<{ from: NationalFleetFactor; to: NationalFleetFactor; units: number }> = [
  { from: 1, to: 2, units: 1 },
  { from: 2, to: 5, units: 3 },
  { from: 5, to: 10, units: 5 },
];

export function surplusMarginalFromBundle(bundle: NationalFleetMonthBundle): MarginalCaptureRow[] {
  return bundle.marginal ?? [];
}

export function strategyMarginalSteps(
  bundle: NationalFleetMonthBundle,
  strategy: NationalFleetStrategyUi,
): StrategyMarginalStep[] {
  const fileKey = NATIONAL_FLEET_STRATEGY_UI[strategy].fileKey;
  return STEP_DELTAS.map(({ from, to, units }) => {
    const a = bundle.summary[String(from)]?.[fileKey] as Record<string, number> | undefined;
    const b = bundle.summary[String(to)]?.[fileKey] as Record<string, number> | undefined;
    if (!a || !b) {
      throw new Error(`fehlende Summary ${from}→${to} ${fileKey}`);
    }
    const chargeA =
      (a.grid_charge_energy_gwh as number) ??
      (a.surplus_pool_capture_grid_gwh as number) ??
      (a.model_capture_grid_gwh as number);
    const chargeB =
      (b.grid_charge_energy_gwh as number) ??
      (b.surplus_pool_capture_grid_gwh as number) ??
      (b.model_capture_grid_gwh as number);
    return {
      from_factor: from,
      to_factor: to,
      delta_factor_units: units,
      delta_capture_gwh: chargeB - chargeA,
      delta_peak_reduction_mw: (b.peak_reduction_mw as number) - (a.peak_reduction_mw as number),
    };
  });
}

export function strategyMarginalForUi(
  bundle: NationalFleetMonthBundle,
  strategy: NationalFleetStrategyUi,
): { steps: StrategyMarginalStep[]; surplusPoolOnly: boolean } {
  if (strategy === "ueberschuss") {
    return {
      steps: surplusMarginalFromBundle(bundle).map((m) => ({
        from_factor: m.from_factor as NationalFleetFactor,
        to_factor: m.to_factor as NationalFleetFactor,
        delta_factor_units: m.delta_factor_units,
        delta_capture_gwh: m.delta_capture_gwh,
        delta_peak_reduction_mw: m.delta_peak_reduction_mw,
      })),
      surplusPoolOnly: true,
    };
  }
  return { steps: strategyMarginalSteps(bundle, strategy), surplusPoolOnly: false };
}

export type NationalFleetFactorCompareRow = {
  factor: NationalFleetFactor;
  chargeGwh: number;
  peakAfterGw: number;
  peakReductionGw: number;
};

export function factorCompareRowsForStrategy(
  bundle: NationalFleetMonthBundle,
  strategy: NationalFleetStrategyUi,
): NationalFleetFactorCompareRow[] {
  return NATIONAL_FLEET_FACTORS.map((factor) => {
    const st = monthStatsForRun(bundle, factor, strategy);
    return {
      factor,
      chargeGwh: st.chargeGwh,
      peakAfterGw: st.peakAfterGw,
      peakReductionGw: st.peakReductionGw,
    };
  });
}
