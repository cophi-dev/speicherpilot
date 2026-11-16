#!/usr/bin/env node
/**
 * Nachtlauf-Orchestrierung: Vortag (TAGESHORIZONT) + optional Monat.
 * Usage:
 *   node scripts/national-fleet-nachtlauf.mjs --yesterday
 *   node scripts/national-fleet-nachtlauf.mjs --from 2026-11-01 --to 2026-11-15
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const py = join(process.cwd(), "scripts/national_fleet_nachtlauf.py");
const req = join(process.cwd(), "scripts/requirements-fleet-solver.txt");

function ensureDeps() {
  const probe = spawnSync("python3", ["-c", "import highspy, scipy, numpy"], { encoding: "utf8" });
  if (probe.status !== 0) {
    console.error("Installiere Solver-Abhängigkeiten:", req);
    const pip = spawnSync("pip", ["install", "-r", req], { encoding: "utf8", stdio: "inherit" });
    if (pip.status !== 0) process.exit(pip.status ?? 1);
  }
}

if (!existsSync(py)) {
  console.error("fehlend:", py);
  process.exit(2);
}

ensureDeps();
const args = ["python3", py, ...process.argv.slice(2)];
if (!args.includes("--yesterday") && !args.some((a) => a === "--day" || a === "--from")) {
  args.push("--yesterday");
}
const started = Date.now();
const run = spawnSync(args[0], args.slice(1), { encoding: "utf8", stdio: "inherit" });
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
if (run.status !== 0) {
  console.error(`Nachtlauf fehlgeschlagen nach ${elapsed}s`);
  process.exit(run.status ?? 1);
}
console.error(`Nachtlauf ok (${elapsed}s)`);