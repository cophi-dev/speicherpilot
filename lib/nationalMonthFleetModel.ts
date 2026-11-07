import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

export type MarginalCaptureRow = {
  from_factor: number;
  to_factor: number;
  delta_factor_units: number;
  delta_capture_gwh: number;
  delta_peak_reduction_mw: number;
  delta_capture_per_added_gw_power_gwh_per_gw: number;
  delta_capture_per_added_gwh_nameplate?: number;
  note?: string;
};

export const NATIONAL_FLEET_MONTH_KEY = "2026-10";
export const NATIONAL_FLEET_FACTORS = [1, 2, 5, 10] as const;
export type NationalFleetFactor = (typeof NATIONAL_FLEET_FACTORS)[number];

export const NATIONAL_FLEET_STRATEGY_UI = {
  ueberschuss: {
    id: "ueberschuss",
    labelDe: "Wind-Solar-Differenz aufnehmen",
    fileKey: "surplus_wind_solar_over_load",
    shortDe: "Differenz aufnehmen",
  },
  spitze: {
    id: "spitze",
    labelDe: "Restlastspitze senken (Vollvoraussicht)",
    fileKey: "min_peak_perfect_foresight",
    shortDe: "Spitze senken",
  },
  markt: {
    id: "markt",
    labelDe: "Day-Ahead (Taker, ohne Preisrückwirkung)",
    fileKey: "price_oriented_da_arbitrage",
    shortDe: "Marktorientiert",
  },
} as const;

export type NationalFleetStrategyUi = keyof typeof NATIONAL_FLEET_STRATEGY_UI;

export const NATIONAL_FLEET_DEFAULT_STRATEGY: NationalFleetStrategyUi = "ueberschuss";
export const NATIONAL_FLEET_DEFAULT_FACTOR: NationalFleetFactor = 1;

const DT_H = 0.25;
const ETA = Math.sqrt(ROUND_TRIP_EFFICIENCY);

export type NationalFleetRunSeries = {
  factor: NationalFleetFactor;
  strategySlug: string;
  strategyUi: NationalFleetStrategyUi;
  sourceSha256: string;
  intervalCount: number;
  timestamp_berlin: string[];
  c_mw: number[];
  d_mw: number[];
  e_start_mwh: number[];
  e_end_mwh: number[];
  r_mw: number[];
  r_prime_mw: number[];
  day_ahead_eur_mwh: number[];
};

export type NationalFleetMonthBundle = {
  monthKey: string;
  bundleId: string;
  provenance: Record<string, unknown>;
  summary: Record<string, Record<string, Record<string, unknown>>>;
  marginal: MarginalCaptureRow[];
  physics: Record<string, unknown>;
  runs: Record<string, NationalFleetRunSeries>;
};

export function nationalFleetMonthAvailable(monthKey: string): boolean {
  return monthKey === NATIONAL_FLEET_MONTH_KEY;
}

export function parseFleetMarginal(bundle: NationalFleetMonthBundle): MarginalCaptureRow[] {
  return bundle.marginal ?? [];
}

export function parseFleetFactor(raw: string | undefined): NationalFleetFactor {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 5 || n === 10) {
    return n;
  }
  return NATIONAL_FLEET_DEFAULT_FACTOR;
}

export function parseFleetStrategy(raw: string | undefined): NationalFleetStrategyUi {
  if (raw && raw in NATIONAL_FLEET_STRATEGY_UI) {
    return raw as NationalFleetStrategyUi;
  }
  return NATIONAL_FLEET_DEFAULT_STRATEGY;
}

export function runKey(factor: NationalFleetFactor, strategy: NationalFleetStrategyUi): string {
  const file = NATIONAL_FLEET_STRATEGY_UI[strategy].fileKey;
  return `x${factor}_${file}`;
}

export function getFleetRun(
  bundle: NationalFleetMonthBundle,
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): NationalFleetRunSeries {
  const key = runKey(factor, strategy);
  const run = bundle.runs[key];
  if (!run) {
    throw new Error(`fehlender Lauf ${key}`);
  }
  return run;
}

export type NationalFleetDaySlice = {
  dateKey: string;
  indices: number[];
  socStartMwh: number;
  socEndMwh: number;
  chargeMwh: number;
  dischargeMwh: number;
  maxRMw: number;
  maxRPrimeMw: number;
};

export function sliceFleetDay(run: NationalFleetRunSeries, dateKey: string): NationalFleetDaySlice | null {
  const indices: number[] = [];
  for (let i = 0; i < run.timestamp_berlin.length; i += 1) {
    if (run.timestamp_berlin[i].startsWith(dateKey)) {
      indices.push(i);
    }
  }
  if (indices.length === 0) {
    return null;
  }
  const i0 = indices[0];
  const i1 = indices[indices.length - 1];
  let charge = 0;
  let discharge = 0;
  let maxR = -Infinity;
  let maxRp = -Infinity;
  for (const i of indices) {
    charge += run.c_mw[i] * DT_H;
    discharge += run.d_mw[i] * DT_H;
    maxR = Math.max(maxR, run.r_mw[i]);
    maxRp = Math.max(maxRp, run.r_prime_mw[i]);
  }
  return {
    dateKey,
    indices,
    socStartMwh: run.e_start_mwh[i0],
    socEndMwh: run.e_end_mwh[i1],
    chargeMwh: charge,
    dischargeMwh: discharge,
    maxRMw: maxR,
    maxRPrimeMw: maxRp,
  };
}

export type NationalFleetMonthStats = {
  chargeGwh: number;
  dischargeGwh: number;
  lossGwh: number;
  peakAfterGw: number;
  peakReductionGw: number;
  peakReductionPct: number;
  surplusCaptureGwh: number | null;
  surplusCaptureSharePct: number | null;
  socStartGwh: number;
  socEndGwh: number;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
};

export function monthStatsForRun(
  bundle: NationalFleetMonthBundle,
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): NationalFleetMonthStats {
  const stats = bundle.summary[String(factor)]?.[NATIONAL_FLEET_STRATEGY_UI[strategy].fileKey] as
    | Record<string, number>
    | undefined;
  if (!stats) {
    throw new Error("fehlende Summary");
  }
  const charge =
    (stats.grid_charge_energy_gwh as number) ??
    (stats.surplus_pool_capture_grid_gwh as number) ??
    (stats.model_capture_grid_gwh as number);
  const discharge = stats.grid_discharge_energy_gwh as number;
  const loss = stats.grid_side_roundtrip_loss_gwh as number;
  const capture =
    strategy === "ueberschuss"
      ? (stats.surplus_pool_capture_grid_gwh as number | undefined) ?? charge
      : null;
  const share =
    strategy === "ueberschuss"
      ? (stats.surplus_pool_capture_share_of_134_241975_gwh as number | undefined) ?? null
      : null;
  return {
    chargeGwh: charge,
    dischargeGwh: discharge,
    lossGwh: loss,
    peakAfterGw: (stats.after_max_residual_mw as number) / 1000,
    peakReductionGw: (stats.peak_reduction_mw as number) / 1000,
    peakReductionPct: stats.peak_reduction_pct_of_ref_64405_9 as number,
    surplusCaptureGwh: capture,
    surplusCaptureSharePct: share != null ? share * 100 : null,
    socStartGwh: (stats.soc_start_mwh as number) / 1000,
    socEndGwh: (stats.soc_end_mwh as number) / 1000,
    fleetPowerGw: (NATIONAL_BASE_FLEET.powerMw * factor) / 1000,
    fleetEnergyGwh: (NATIONAL_BASE_FLEET.energyMwh * factor) / 1000,
  };
}

export function verifyFleetRunSocPhysics(run: NationalFleetRunSeries, eMin: number, eMax: number): number {
  let maxResidual = 0;
  const epsMw = 1e-3;
  for (let t = 0; t < run.intervalCount; t += 1) {
    const expect = run.e_start_mwh[t] + ETA * run.c_mw[t] * DT_H - (run.d_mw[t] * DT_H) / ETA;
    maxResidual = Math.max(maxResidual, Math.abs(expect - run.e_end_mwh[t]));
    if (run.c_mw[t] > epsMw && run.e_end_mwh[t] <= run.e_start_mwh[t] + 1e-6) {
      throw new Error(`SoC charge sign qh ${t}`);
    }
    if (run.d_mw[t] > epsMw && run.e_end_mwh[t] >= run.e_start_mwh[t] - 1e-6) {
      throw new Error(`SoC discharge sign qh ${t}`);
    }
    if (run.e_start_mwh[t] < eMin - 1e-3 || run.e_start_mwh[t] > eMax + 1e-3) {
      throw new Error(`SoC band qh ${t}`);
    }
  }
  if (Math.abs(run.e_start_mwh[0] - run.e_end_mwh[run.intervalCount - 1]) > 1e-2) {
    throw new Error("month soc terminal drift");
  }
  return maxResidual;
}

/** Asymmetric e0 fixtures: forward integration should match exported e_end chain. */
export function replaySocFromAsymmetricStart(
  run: Pick<NationalFleetRunSeries, "c_mw" | "d_mw">,
  e0: number,
): number[] {
  const e: number[] = [e0];
  let cur = e0;
  for (let t = 0; t < run.c_mw.length; t += 1) {
    cur = cur + ETA * run.c_mw[t] * DT_H - (run.d_mw[t] * DT_H) / ETA;
    e.push(cur);
  }
  return e;
}

export function fleetMonatQuery(factor: NationalFleetFactor, strategy: NationalFleetStrategyUi): string {
  return `faktor=${factor}&fahrweise=${strategy}`;
}

export function fleetTagHref(dateKey: string, factor: NationalFleetFactor, strategy: NationalFleetStrategyUi): string {
  return `/tag/${dateKey}?${fleetMonatQuery(factor, strategy)}`;
}

export function fleetMonatHref(monthKey: string, factor: NationalFleetFactor, strategy: NationalFleetStrategyUi): string {
  return `/monat/${monthKey}?${fleetMonatQuery(factor, strategy)}`;
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
