#!/usr/bin/env node
/**
 * Begrenzter öffentlicher Monats-Rechenweg:
 * 1) Validiert eingefrorenes Oktober-Bundle im Repo (immer).
 * 2) Optional Neubau aus CSV-Zeitreihen (RUN9_FLEET_ROOT, kein Agent-Store Pflicht).
 *
 * RUN9_FLEET_ROOT muss enthalten: summary_fleet_factors.json, provenance.json, timeseries/x{1,2,5,10}_*.csv
 * (gleiche Struktur wie Run9-Export).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2] ?? "validate";
const run9 = process.env.RUN9_FLEET_ROOT;

if (mode === "validate") {
  execSync("node scripts/validate-national-month-fleet-bundle.mjs", { stdio: "inherit" });
  process.exit(0);
}

if (mode === "rebuild") {
  if (!run9 || !existsSync(join(run9, "summary_fleet_factors.json"))) {
    console.error(
      "RUN9_FLEET_ROOT fehlt oder enthält keine summary_fleet_factors.json — Neubau abgebrochen (Oktober-Produktdaten bleiben unverändert).",
    );
    process.exit(2);
  }
  execSync("node scripts/build-national-month-fleet-bundle.mjs", {
    stdio: "inherit",
    env: { ...process.env, RUN9_FLEET_ROOT: run9 },
  });
  execSync("node scripts/validate-national-month-fleet-bundle.mjs", { stdio: "inherit" });
  process.exit(0);
}

console.error("Usage: node scripts/repro-national-month-fleet.mjs [validate|rebuild]");
process.exit(1);
