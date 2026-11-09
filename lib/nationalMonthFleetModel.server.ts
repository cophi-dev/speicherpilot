import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  runKey,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

const ROOT = join(process.cwd(), "data/national-fleet/2026-10");

export type NationalFleetBundleMeta = Omit<NationalFleetMonthBundle, "runs">;

let cachedMeta: NationalFleetBundleMeta | null = null;
const runCache = new Map<string, NationalFleetRunSeries>();
let cachedMonolith: NationalFleetMonthBundle | null = null;

export function loadNationalFleetBundleMeta(): NationalFleetBundleMeta {
  if (cachedMeta) {
    return cachedMeta;
  }
  const path = join(ROOT, "fleet-month-meta.json");
  cachedMeta = JSON.parse(readFileSync(path, "utf8")) as NationalFleetBundleMeta;
  return cachedMeta;
}

export function loadNationalFleetRunSeries(
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): NationalFleetRunSeries {
  const key = runKey(factor, strategy);
  const hit = runCache.get(key);
  if (hit) {
    return hit;
  }
  const path = join(ROOT, "runs", `${key}.json`);
  const run = JSON.parse(readFileSync(path, "utf8")) as NationalFleetRunSeries;
  runCache.set(key, run);
  return run;
}

/** Parity / tests: assemble all shards (cold ~12× single-run read). */
export function loadNationalFleetMonthBundle(): NationalFleetMonthBundle {
  if (cachedMonolith) {
    return cachedMonolith;
  }
  const meta = loadNationalFleetBundleMeta();
  const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8")) as {
    runShards: Record<string, unknown>;
  };
  const runs = {} as NationalFleetMonthBundle["runs"];
  for (const rk of Object.keys(manifest.runShards ?? {})) {
    runs[rk] = JSON.parse(readFileSync(join(ROOT, "runs", `${rk}.json`), "utf8")) as NationalFleetRunSeries;
  }
  cachedMonolith = { ...meta, runs };
  return cachedMonolith;
}

export function fleetRunShardSha256(factor: NationalFleetFactor, strategy: NationalFleetStrategyUi): string {
  const key = runKey(factor, strategy);
  const buf = readFileSync(join(ROOT, "runs", `${key}.json`));
  return createHash("sha256").update(buf).digest("hex");
}

/** Summary + ein Lauf — für KPI/Marginal ohne 2,7-MB-Bundle. */
export function nationalFleetContext(
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): NationalFleetMonthBundle {
  const meta = loadNationalFleetBundleMeta();
  const run = loadNationalFleetRunSeries(factor, strategy);
  return {
    ...meta,
    runs: { [runKey(factor, strategy)]: run },
  };
}
