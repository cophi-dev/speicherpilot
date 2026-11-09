#!/usr/bin/env node
/**
 * Split fleet-month-bundle.json into meta + per-run shards (byte-stable runs).
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "data/national-fleet/2026-10");
const bundlePath = join(ROOT, "fleet-month-bundle.json");
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));

const runsDir = join(ROOT, "runs");
mkdirSync(runsDir, { recursive: true });

const meta = {
  bundleId: bundle.bundleId,
  monthKey: bundle.monthKey,
  importedAt: bundle.importedAt,
  run9Path: bundle.run9Path,
  provenance: bundle.provenance,
  summary: bundle.summary,
  marginal: bundle.marginal,
  physics: bundle.physics,
  strategies: bundle.strategies,
  factors: bundle.factors,
  runKeys: Object.keys(bundle.runs),
  parentSha256: createHash("sha256").update(readFileSync(bundlePath)).digest("hex"),
};

writeFileSync(join(ROOT, "fleet-month-meta.json"), JSON.stringify(meta));

const manifestRuns = {};
for (const [key, run] of Object.entries(bundle.runs)) {
  const payload = JSON.stringify(run);
  const sha = createHash("sha256").update(payload).digest("hex");
  const out = join(runsDir, `${key}.json`);
  writeFileSync(out, payload);
  manifestRuns[key] = { file: `runs/${key}.json`, sha256: sha, bytes: payload.length };
}

const manifest = {
  ...JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8")),
  metaFile: "fleet-month-meta.json",
  metaSha256: createHash("sha256").update(readFileSync(join(ROOT, "fleet-month-meta.json"))).digest("hex"),
  runShards: manifestRuns,
};
writeFileSync(join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Wrote meta +", Object.keys(manifestRuns).length, "run shards");
