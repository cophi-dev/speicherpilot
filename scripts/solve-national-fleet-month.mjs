#!/usr/bin/env node
/**
 * Öffentlicher Monats-Solver-Pfad (Batch, nicht Render):
 * - validate: prüft eingefrorene Energy-Charts-Eingangs-CSV im Repo (2980 Intervalle)
 * - smoke:    validiert Inputs; voller 12×-Solve nur mit python3 + highspy (siehe Hinweis)
 *
 * Oktober-Produkt-Bundle wird hier NICHT neu geschrieben.
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "artifacts/october-storage-counterfactual-20261107");
const PY = join(ROOT, "run_fleet_factor_month.py");
const INPUT = join(ROOT, "inputs/beobachtungen-viertelstunden-202610-berlin.csv");

const mode = process.argv[2] ?? "validate";

function runValidate() {
  if (!existsSync(INPUT)) {
    console.error("Fehlende Eingangs-CSV", INPUT);
    process.exit(2);
  }
  const r = spawnSync("python3", [PY, "--validate-inputs"], { encoding: "utf8", cwd: ROOT });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  console.log(r.stdout.trim());
}

if (mode === "validate") {
  runValidate();
  process.exit(0);
}

if (mode === "solve") {
  runValidate();
  console.error(
    "Hinweis: Voller 12×2980-Solve benötigt python3 highspy, Laufzeit bis ca. 15 min/CPU. Ergebnis landet nur unter",
    join(ROOT, "fleet_factor"),
    "— nicht im Oktober-Produktbundle.",
  );
  const r = spawnSync("python3", [PY], { encoding: "utf8", cwd: ROOT, timeout: 3_600_000 });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  console.log(r.stdout.trim());
  process.exit(0);
}

console.error("Usage: node scripts/solve-national-fleet-month.mjs [validate|solve]");
process.exit(1);
