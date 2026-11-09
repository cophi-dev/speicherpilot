import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NATIONAL_FLEET_FACTORS, NATIONAL_FLEET_STRATEGY_UI, runKey } from "@/lib/nationalMonthFleetModel";
import {
  fleetRunShardSha256,
  loadNationalFleetMonthBundle,
  loadNationalFleetRunSeries,
} from "@/lib/nationalMonthFleetModel.server";
import { fleetChartSeriesForMonth } from "@/lib/nationalFleetSeriesPayload";

const ROOT = join(process.cwd(), "data/national-fleet/2026-10");

describe("fleet run shards vs monolith bundle", () => {
  const bundle = loadNationalFleetMonthBundle();

  it.each(
    NATIONAL_FLEET_FACTORS.flatMap((factor) =>
      (Object.keys(NATIONAL_FLEET_STRATEGY_UI) as (keyof typeof NATIONAL_FLEET_STRATEGY_UI)[]).map(
        (strategy) => [factor, strategy] as const,
      ),
    ),
  )("×%i %s: Run-JSON byte-identisch zwischen Bundle und Shard", (factor, strategy) => {
    const key = runKey(factor, strategy);
    const fromBundle = JSON.stringify(bundle.runs[key]);
    const fromShard = readFileSync(join(ROOT, "runs", `${key}.json`), "utf8");
    expect(fromShard).toBe(fromBundle);
    expect(fleetRunShardSha256(factor, strategy)).toBe(createHash("sha256").update(fromShard).digest("hex"));
  });

  it("Zeitreihen-Payload für ×1 spitze unverändert", () => {
    const key = runKey(1, "spitze");
    const runMono = bundle.runs[key]!;
    const runShard = loadNationalFleetRunSeries(1, "spitze");
    const monoSeries = fleetChartSeriesForMonth(runMono, null, 1);
    const shardSeries = fleetChartSeriesForMonth(runShard, null, 1);
    expect(JSON.stringify(shardSeries)).toBe(JSON.stringify(monoSeries));
  });
});
