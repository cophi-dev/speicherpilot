import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { REFERENCE_FLEET_REPO_FACTOR } from "@/lib/auffaelligkeitWoche";
import { auffaelligkeitWocheAvailable, loadWocheFleetRunSeries } from "@/lib/auffaelligkeitWoche.server";
import {
  NATIONAL_FLEET_MONTH_KEY,
  runKey,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export type NationalFleetBundleMeta = Omit<NationalFleetMonthBundle, "runs">;

export type NationalFleetLoadOpts = {
  monthKey?: string;
  /** Bevorzugt TAGESHORIZONT unter days/{dayKey}/, sonst Monatslauf. */
  dayKey?: string;
};

const metaCache = new Map<string, NationalFleetBundleMeta>();
const runCache = new Map<string, NationalFleetRunSeries>();
const monolithCache = new Map<string, NationalFleetMonthBundle>();

function fleetMonthRoot(monthKey: string): string {
  return join(process.cwd(), "data/national-fleet", monthKey);
}

export function discoverNationalFleetMonthKeys(): string[] {
  const base = join(process.cwd(), "data/national-fleet");
  try {
    return readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(base, d.name, "manifest.json")))
      .map((d) => d.name)
      .sort();
  } catch {
    return [NATIONAL_FLEET_MONTH_KEY];
  }
}

export function nationalFleetDataMonthAvailable(monthKey: string): boolean {
  return existsSync(join(fleetMonthRoot(monthKey), "manifest.json"));
}

function normalizeFleetRun(raw: Record<string, unknown>): NationalFleetRunSeries {
  const run = { ...raw } as NationalFleetRunSeries & Record<string, unknown>;
  delete run.horizon;
  delete run.dateBerlin;
  delete run.modelFleet;
  delete (run as { provenance?: unknown }).provenance;
  if (typeof run.sourceSha256 !== "string") {
    run.sourceSha256 = "";
  }
  return run;
}

export function loadNationalFleetBundleMeta(monthKey = NATIONAL_FLEET_MONTH_KEY): NationalFleetBundleMeta {
  const hit = metaCache.get(monthKey);
  if (hit) {
    return hit;
  }
  const root = fleetMonthRoot(monthKey);
  const metaPath = join(root, "fleet-month-meta.json");
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as NationalFleetBundleMeta;
    metaCache.set(monthKey, meta);
    return meta;
  }
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Record<string, unknown>;
  const stub: NationalFleetBundleMeta = {
    monthKey,
    bundleId: String(manifest.bundleId ?? monthKey),
    provenance: (manifest.provenance as Record<string, unknown>) ?? {},
    summary: {},
    marginal: [],
    physics: (manifest.physics as Record<string, unknown>) ?? {},
  };
  metaCache.set(monthKey, stub);
  return stub;
}

export function loadNationalFleetRunSeries(
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
  opts: NationalFleetLoadOpts = {},
): NationalFleetRunSeries {
  const monthKey = opts.monthKey ?? opts.dayKey?.slice(0, 7) ?? NATIONAL_FLEET_MONTH_KEY;
  const key = runKey(factor, strategy);
  const cacheId = `${monthKey}:${opts.dayKey ?? ""}:${key}`;
  const hit = runCache.get(cacheId);
  if (hit) {
    return hit;
  }

  if (opts.dayKey) {
    const dayPath = join(fleetMonthRoot(monthKey), "days", opts.dayKey, `${key}.json`);
    if (existsSync(dayPath)) {
      const run = normalizeFleetRun(JSON.parse(readFileSync(dayPath, "utf8")) as Record<string, unknown>);
      runCache.set(cacheId, run);
      return run;
    }
  }

  const path = join(fleetMonthRoot(monthKey), "runs", `${key}.json`);
  const run = JSON.parse(readFileSync(path, "utf8")) as NationalFleetRunSeries;
  runCache.set(cacheId, run);
  return run;
}

export type TagFleetRunSource = "woche" | "day" | "month";

export type TagFleetRunLoad = {
  run: NationalFleetRunSeries;
  source: TagFleetRunSource;
};

/**
 * Tag-Seite und Chart-API: Referenzflotte (Stufe ×2) nimmt den lexikografischen
 * Fahrplan aus data/auffaelligkeit-woche/tage/{datum}.json, wenn vorhanden.
 * Sonst Tagesdatei, sonst Monatslauf (source = "month", sichtbar markieren).
 */
export function loadTagFleetRunSeries(
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
  opts: { monthKey: string; dayKey: string },
): TagFleetRunLoad {
  const { monthKey, dayKey } = opts;
  if (factor === REFERENCE_FLEET_REPO_FACTOR) {
    const cacheId = `${monthKey}:${dayKey}:woche:${strategy}`;
    const hit = runCache.get(cacheId);
    if (hit) {
      return { run: hit, source: "woche" };
    }
    const woche = loadWocheFleetRunSeries(dayKey, strategy);
    if (woche) {
      runCache.set(cacheId, woche);
      return { run: woche, source: "woche" };
    }
  }

  const key = runKey(factor, strategy);
  const dayPath = join(fleetMonthRoot(monthKey), "days", dayKey, `${key}.json`);
  if (existsSync(dayPath)) {
    const run = normalizeFleetRun(JSON.parse(readFileSync(dayPath, "utf8")) as Record<string, unknown>);
    return { run, source: "day" };
  }

  const path = join(fleetMonthRoot(monthKey), "runs", `${key}.json`);
  const run = JSON.parse(readFileSync(path, "utf8")) as NationalFleetRunSeries;
  return { run, source: "month" };
}

export function tagIsolierterTageshorizont(factor: NationalFleetFactor, dayKey: string): boolean {
  if (factor === REFERENCE_FLEET_REPO_FACTOR && auffaelligkeitWocheAvailable(dayKey)) {
    return true;
  }
  const monthKey = dayKey.slice(0, 7);
  const dayPath = join(fleetMonthRoot(monthKey), "days", dayKey, `${runKey(factor, "spitze")}.json`);
  if (!existsSync(dayPath)) {
    return false;
  }
  const raw = JSON.parse(readFileSync(dayPath, "utf8")) as { horizon?: string };
  return raw.horizon === "day";
}

/** Parity / tests: assemble all shards (cold ~12× single-run read). */
export function loadNationalFleetMonthBundle(monthKey = NATIONAL_FLEET_MONTH_KEY): NationalFleetMonthBundle {
  const hit = monolithCache.get(monthKey);
  if (hit) {
    return hit;
  }
  const root = fleetMonthRoot(monthKey);
  const meta = loadNationalFleetBundleMeta(monthKey);
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as {
    runShards: Record<string, unknown>;
  };
  const runs = {} as NationalFleetMonthBundle["runs"];
  for (const rk of Object.keys(manifest.runShards ?? {})) {
    const fileName = rk.endsWith(".json") ? rk : `${rk}.json`;
    const storeKey = rk.replace(/\.json$/, "");
    runs[storeKey] = JSON.parse(readFileSync(join(root, "runs", fileName), "utf8")) as NationalFleetRunSeries;
  }
  const monolith = { ...meta, runs };
  monolithCache.set(monthKey, monolith);
  return monolith;
}

export function fleetRunShardSha256(
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
  monthKey = NATIONAL_FLEET_MONTH_KEY,
): string {
  const key = runKey(factor, strategy);
  const buf = readFileSync(join(fleetMonthRoot(monthKey), "runs", `${key}.json`));
  return createHash("sha256").update(buf).digest("hex");
}

/** Summary + ein Lauf — für KPI/Marginal ohne 2,7-MB-Bundle. */
export function nationalFleetContext(
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
  opts: NationalFleetLoadOpts = {},
): NationalFleetMonthBundle {
  const monthKey = opts.monthKey ?? opts.dayKey?.slice(0, 7) ?? NATIONAL_FLEET_MONTH_KEY;
  const meta = loadNationalFleetBundleMeta(monthKey);
  const run = loadNationalFleetRunSeries(factor, strategy, { ...opts, monthKey });
  return {
    ...meta,
    runs: { [runKey(factor, strategy)]: run },
  };
}

const DAY_AHEAD_REVENUE_FIELD = "dayAheadRevenueEur" as const;

export function nationalFleetIsolatedDayAvailable(monthKey: string, dayKey: string): boolean {
  const dir = join(fleetMonthRoot(monthKey), "days", dayKey);
  const keys = [
    "x1_min_peak_perfect_foresight.json",
    "x1_price_oriented_da_arbitrage.json",
    "x1_surplus_wind_solar_over_load.json",
  ];
  return keys.every((name) => existsSync(join(dir, name)));
}

/** Liest das von speicherpilot zu liefernde Feld dayAheadRevenueEur (nur ×1-Tagesdatei). */
export function loadDayAheadRevenueEur(
  monthKey: string,
  dayKey: string,
  strategy: NationalFleetStrategyUi,
): number | null {
  const key = runKey(1, strategy);
  const path = join(fleetMonthRoot(monthKey), "days", dayKey, `${key}.json`);
  if (!existsSync(path)) {
    return null;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const value = raw[DAY_AHEAD_REVENUE_FIELD];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const TAG_DAY_AHEAD_REVENUE_FIELD = DAY_AHEAD_REVENUE_FIELD;
