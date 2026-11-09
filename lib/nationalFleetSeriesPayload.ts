import type { NationalFleetFactor, NationalFleetRunSeries, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

export type FleetChartSeriesPayload = {
  timestamp_berlin: string[];
  r_mw: number[];
  r_prime_mw: number[];
  c_mw: number[];
  d_mw: number[];
  e_start_mwh: number[];
};

export type FleetChartSeriesBundle = {
  selected: FleetChartSeriesPayload;
  compareRp: number[] | null;
};

function pickRunArrays(run: NationalFleetRunSeries, indices: number[]): FleetChartSeriesPayload {
  return {
    timestamp_berlin: indices.map((i) => run.timestamp_berlin[i]!),
    r_mw: indices.map((i) => run.r_mw[i]!),
    r_prime_mw: indices.map((i) => run.r_prime_mw[i]!),
    c_mw: indices.map((i) => run.c_mw[i]!),
    d_mw: indices.map((i) => run.d_mw[i]!),
    e_start_mwh: indices.map((i) => run.e_start_mwh[i]!),
  };
}

export function fleetChartSeriesForDay(
  run: NationalFleetRunSeries,
  compareRun: NationalFleetRunSeries | null,
  indices: number[],
  factor: NationalFleetFactor,
): FleetChartSeriesBundle {
  return {
    selected: pickRunArrays(run, indices),
    compareRp:
      factor !== 1 && compareRun
        ? indices.map((i) => compareRun.r_prime_mw[i]!)
        : null,
  };
}

export function fleetChartSeriesForMonth(
  run: NationalFleetRunSeries,
  compareRun: NationalFleetRunSeries | null,
  factor: NationalFleetFactor,
): FleetChartSeriesBundle {
  return {
    selected: {
      timestamp_berlin: run.timestamp_berlin,
      r_mw: run.r_mw,
      r_prime_mw: run.r_prime_mw,
      c_mw: run.c_mw,
      d_mw: run.d_mw,
      e_start_mwh: run.e_start_mwh,
    },
    compareRp: factor !== 1 && compareRun ? compareRun.r_prime_mw : null,
  };
}

export function fleetSeriesJsonResponse(args: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  dateKey?: string;
  intervalCount: number;
  bundle: FleetChartSeriesBundle;
}) {
  const { monthKey, factor, strategy, dateKey, intervalCount, bundle } = args;
  return dateKey
    ? {
        monthKey,
        dateKey,
        factor,
        strategy,
        selected: bundle.selected,
        compare: bundle.compareRp ? { r_prime_mw: bundle.compareRp } : null,
      }
    : {
        monthKey,
        factor,
        strategy,
        intervalCount,
        selected: bundle.selected,
        compare: bundle.compareRp ? { r_prime_mw: bundle.compareRp } : null,
      };
}
