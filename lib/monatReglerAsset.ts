import { z } from "zod";

import {
  NATIONAL_FLEET_FACTORS,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

const runSeriesSchema = z.object({
  rp: z.array(z.number()),
  c: z.array(z.number()),
  d: z.array(z.number()),
  e: z.array(z.number()),
});

export const monatReglerCompactSchema = z.object({
  v: z.literal(1),
  monthKey: z.string(),
  n: z.number().int().positive(),
  t0: z.string(),
  tm: z.array(z.number().int()),
  r: z.array(z.number()),
  refPeakMw: z.number(),
  refPeakTs: z.string(),
  surplusPoolGwh: z.number(),
  marketKipppunktFactor: z.number(),
  runs: z.record(z.string(), runSeriesSchema),
});

export type MonatReglerCompact = z.infer<typeof monatReglerCompactSchema>;

export function parseMonatReglerCompact(raw: unknown): MonatReglerCompact {
  return monatReglerCompactSchema.parse(raw);
}

export function reglerRunKey(factor: NationalFleetFactor, strategy: NationalFleetStrategyUi): string | null {
  if (factor === 1) {
    return null;
  }
  return `${factor}_${strategy}`;
}

export function timestampBerlinAt(compact: MonatReglerCompact, index: number): string {
  const t0 = Date.parse(compact.t0);
  const ms = t0 + compact.tm[index]! * 60_000;
  return new Date(ms).toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).replace(" ", "T") + "+02:00";
}

export function dateKeyAt(compact: MonatReglerCompact, index: number): string {
  const t0 = Date.parse(compact.t0);
  const ms = t0 + compact.tm[index]! * 60_000;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export type ReglerActiveSeries = {
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  rMw: number[];
  rPrimeMw: number[];
  cMw: number[];
  dMw: number[];
  eEndMwh: number[];
};

export function activeSeries(
  compact: MonatReglerCompact,
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): ReglerActiveSeries {
  const rMw = compact.r;
  if (factor === 1) {
    return {
      factor,
      strategy,
      rMw,
      rPrimeMw: rMw,
      cMw: rMw.map(() => 0),
      dMw: rMw.map(() => 0),
      eEndMwh: rMw.map(() => 0),
    };
  }
  const key = reglerRunKey(factor, strategy);
  const run = key ? compact.runs[key] : undefined;
  if (!run) {
    throw new Error(`fehlender Lauf ${key}`);
  }
  return {
    factor,
    strategy,
    rMw,
    rPrimeMw: run.rp,
    cMw: run.c,
    dMw: run.d,
    eEndMwh: run.e,
  };
}

export type ReglerDayPoint = {
  dateKey: string;
  startIndex: number;
  endIndex: number;
  maxObservedGw: number;
  maxFleetGw: number;
};

export function dailyPeaks(compact: MonatReglerCompact, series: ReglerActiveSeries): ReglerDayPoint[] {
  const days: ReglerDayPoint[] = [];
  let curKey: string | null = null;
  let start = 0;
  let maxR = -Infinity;
  let maxRp = -Infinity;
  const flush = (end: number) => {
    if (curKey == null) return;
    days.push({
      dateKey: curKey,
      startIndex: start,
      endIndex: end,
      maxObservedGw: maxR / 1000,
      maxFleetGw: maxRp / 1000,
    });
  };
  for (let i = 0; i < compact.n; i += 1) {
    const dk = dateKeyAt(compact, i);
    if (dk !== curKey) {
      if (curKey != null) flush(i - 1);
      curKey = dk;
      start = i;
      maxR = series.rMw[i]!;
      maxRp = series.rPrimeMw[i]!;
    } else {
      maxR = Math.max(maxR, series.rMw[i]!);
      maxRp = Math.max(maxRp, series.rPrimeMw[i]!);
    }
  }
  if (curKey != null) flush(compact.n - 1);
  return days;
}

export function monthPeakGw(series: ReglerActiveSeries): number {
  let max = -Infinity;
  for (const v of series.rPrimeMw) {
    max = Math.max(max, v);
  }
  return max / 1000;
}

export function assertCompactRunKeys(compact: MonatReglerCompact): void {
  for (const f of NATIONAL_FLEET_FACTORS) {
    if (f === 1) continue;
    for (const s of ["spitze", "ueberschuss", "markt"] as const) {
      const key = reglerRunKey(f, s);
      if (!key || !compact.runs[key]) {
        throw new Error(`fehlender Schlüssel ${key}`);
      }
    }
  }
}