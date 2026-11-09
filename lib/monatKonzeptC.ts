import type { NationalFleetFactor, NationalFleetRunSeries, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import type { ResidualDay } from "@/lib/windSolarResidual";

export type DauerliniePoint = {
  chronIndex: number;
  sortRankObserved: number;
  sortRankStorage: number | null;
  observedGw: number;
  withStorageGw: number | null;
  timestampBerlin: string;
};

export type DauerlinieModel = {
  intervalCount: number;
  observedMinGw: number;
  observedMaxGw: number;
  withStorageMinGw: number | null;
  withStorageMaxGw: number | null;
  points: DauerliniePoint[];
  hoursAbove60Observed: number;
  hoursAbove60WithStorage: number | null;
};

const QH_H = 0.25;

export function observedSeriesFromResidualDays(days: ResidualDay[]): NationalFleetRunSeries {
  const ordered = [...days].sort((a, b) => a.dateBerlin.localeCompare(b.dateBerlin));
  const timestamp_berlin: string[] = [];
  const r_mw: number[] = [];
  for (const day of ordered) {
    for (const slot of day.slots) {
      timestamp_berlin.push(slot.timestampIso);
      r_mw.push(slot.loadMw - slot.windMw - slot.solarMw);
    }
  }
  const n = r_mw.length;
  return {
    factor: 1,
    strategySlug: "observed",
    strategyUi: "ueberschuss",
    sourceSha256: "",
    intervalCount: n,
    timestamp_berlin,
    c_mw: new Array(n).fill(0),
    d_mw: new Array(n).fill(0),
    e_start_mwh: new Array(n).fill(0),
    e_end_mwh: new Array(n).fill(0),
    r_mw,
    r_prime_mw: r_mw.slice(),
    day_ahead_eur_mwh: new Array(n).fill(0),
  };
}

export function buildDauerlinieFromResidualDays(days: ResidualDay[]): DauerlinieModel {
  if (days.length === 0) {
    return {
      intervalCount: 0,
      observedMinGw: 0,
      observedMaxGw: 0,
      withStorageMinGw: null,
      withStorageMaxGw: null,
      points: [],
      hoursAbove60Observed: 0,
      hoursAbove60WithStorage: null,
    };
  }
  return buildDauerlinieFromRun(observedSeriesFromResidualDays(days), null);
}

function rankByDescending(pairs: { idx: number; value: number }[]): Map<number, number> {
  const sorted = [...pairs].sort((a, b) => b.value - a.value);
  const rankOfIdx = new Map<number, number>();
  sorted.forEach((p, rank) => rankOfIdx.set(p.idx, rank));
  return rankOfIdx;
}

export function buildDauerlinieFromRun(observed: NationalFleetRunSeries, withStorage?: NationalFleetRunSeries | null): DauerlinieModel {
  const n = observed.intervalCount;
  const pairs: { idx: number; gw: number; ts: string; withGw: number | null }[] = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      idx: i,
      gw: observed.r_mw[i] / 1000,
      ts: observed.timestamp_berlin[i] ?? "",
      withGw: withStorage ? withStorage.r_prime_mw[i] / 1000 : null,
    });
  }

  const rankObserved = rankByDescending(pairs.map((p) => ({ idx: p.idx, value: p.gw })));
  const rankStorage = withStorage
    ? rankByDescending(
        pairs
          .map((p) => ({ idx: p.idx, value: p.withGw ?? Number.NEGATIVE_INFINITY }))
          .filter((p) => Number.isFinite(p.value)),
      )
    : null;

  const points: DauerliniePoint[] = pairs.map((p) => ({
    chronIndex: p.idx,
    sortRankObserved: rankObserved.get(p.idx) ?? p.idx,
    sortRankStorage: rankStorage ? (rankStorage.get(p.idx) ?? null) : null,
    observedGw: p.gw,
    withStorageGw: p.withGw,
    timestampBerlin: p.ts,
  }));

  const observedMax = Math.max(...pairs.map((p) => p.gw));
  const observedMin = Math.min(...pairs.map((p) => p.gw));
  let withMax: number | null = null;
  let withMin: number | null = null;
  if (withStorage) {
    const ws = pairs.map((p) => p.withGw).filter((v): v is number => v != null);
    withMax = Math.max(...ws);
    withMin = Math.min(...ws);
  }

  const hoursAbove = (values: number[]) => values.filter((v) => v > 60).length * QH_H;
  const hoursAbove60Observed = hoursAbove(pairs.map((p) => p.gw));
  const hoursAbove60WithStorage = withStorage
    ? hoursAbove(pairs.map((p) => p.withGw ?? p.gw))
    : null;

  return {
    intervalCount: n,
    observedMinGw: observedMin,
    observedMaxGw: observedMax,
    withStorageMinGw: withMin,
    withStorageMaxGw: withMax,
    points,
    hoursAbove60Observed,
    hoursAbove60WithStorage,
  };
}

export function morphX(chronIndex: number, sortRank: number, morphT: number, intervalCount: number): number {
  const t = Math.min(1, Math.max(0, morphT));
  const xChron = chronIndex;
  const xSort = sortRank;
  return xChron * (1 - t) + xSort * t;
}

export type DauerliniePathSample = { x: number; y: number };

export function dauerlinieSeriesSamples(
  model: DauerlinieModel,
  morphT: number,
  series: "observed" | "storage",
  maxPoints = 600,
): DauerliniePathSample[] {
  const n = model.intervalCount;
  const step = Math.max(1, Math.ceil(n / maxPoints));
  const samples: DauerliniePathSample[] = [];
  for (let i = 0; i < n; i += step) {
    const pt = model.points[i]!;
    const rank =
      series === "observed"
        ? pt.sortRankObserved
        : pt.sortRankStorage ?? pt.sortRankObserved;
    const y = series === "observed" ? pt.observedGw : pt.withStorageGw;
    if (y == null) continue;
    samples.push({
      x: morphX(pt.chronIndex, rank, morphT, n),
      y,
    });
  }
  return samples.sort((a, b) => a.x - b.x);
}

export function isMonotonicNonIncreasing(values: number[], epsilon = 1e-4): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i]! > values[i - 1]! + epsilon) {
      return false;
    }
  }
  return values.length > 0;
}

export type DauerlinieSelection = {
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
};
