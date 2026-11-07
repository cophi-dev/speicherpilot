#!/usr/bin/env node
/**
 * Validiert das eingefrorene Oktober-Bundle (Bytes + SHA) ohne Agent-Store zur Laufzeit.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const bundlePath = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json");
const manifestPath = join(process.cwd(), "data/national-fleet/2026-10/manifest.json");

const raw = readFileSync(bundlePath);
const sha = createHash("sha256").update(raw).digest("hex");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const bundle = JSON.parse(raw.toString("utf8"));

let failed = false;
if (sha !== manifest.sha256) {
  console.error("SHA mismatch", sha, manifest.sha256);
  failed = true;
}
if (manifest.quarters !== 2980) {
  console.error("quarters", manifest.quarters);
  failed = true;
}
const runCount = Object.keys(bundle.runs ?? {}).length;
if (runCount !== 12) {
  console.error("runs", runCount);
  failed = true;
}
for (const key of Object.keys(bundle.runs ?? {})) {
  const run = bundle.runs[key];
  if (run.intervalCount !== 2980) {
    console.error("interval", key, run.intervalCount);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log(
  JSON.stringify({
    ok: true,
    bundlePath: "data/national-fleet/2026-10/fleet-month-bundle.json",
    bytes: raw.length,
    sha256: sha,
    runs: runCount,
    quarters: manifest.quarters,
  }),
);
