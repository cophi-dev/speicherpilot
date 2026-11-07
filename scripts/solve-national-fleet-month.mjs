#!/usr/bin/env node
/**
 * Öffentlicher Monats-Solver-Pfad (Batch, nicht Render):
 * - validate: prüft eingefrorene Energy-Charts-Eingangs-CSV im Repo (2980 Intervalle)
 * - solve-spitze-x1: eine volle Oktober-Spitze×1-Optimierung in frischem OUT (nicht Produktbundle)
 * - solve:    voller 12×-Solve nur mit python3 + highspy
 *
 * Oktober-Produkt-Bundle wird hier NICHT neu geschrieben.
 */
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

if (mode === "solve-spitze-x1") {
  runValidate();
  const outDir =
    process.env.RUN15_SOLVE_OUT ??
    join(process.cwd(), "artifacts/run15-public-solve-20261107/spitze-x1");
  mkdirSync(outDir, { recursive: true });
  const logPath = join(outDir, "solver-cli.log");
  const cmd = [
    "python3",
    PY,
    "--solve-one",
    "--factor",
    "1",
    "--strategy",
    "min_peak_perfect_foresight",
    "--out-dir",
    outDir,
  ];
  const started = new Date().toISOString();
  const r = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8", cwd: process.cwd(), timeout: 3_600_000 });
  const log = [
    `# solve-spitze-x1`,
    `started: ${started}`,
    `finished: ${new Date().toISOString()}`,
    `exit: ${r.status}`,
    `command: ${cmd.join(" ")}`,
    "",
    "=== stdout ===",
    r.stdout ?? "",
    "",
    "=== stderr ===",
    r.stderr ?? "",
  ].join("\n");
  writeFileSync(logPath, log);
  if (r.status !== 0) {
    console.error(log);
    process.exit(r.status ?? 1);
  }
  const manifestPath = join(outDir, "solve_manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bundle = JSON.parse(
    readFileSync(join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json"), "utf8"),
  );
  const ref = bundle.summary["1"].min_peak_perfect_foresight;
  const got = manifest.stats;
  const tol = { peak_reduction_mw: 0.05, peak_after_mw: 0.05, grid_charge_energy_gwh: 0.02 };
  const cmp = {
    reference_bundle_sha256: "7ec0acf4320164d4a616f11c123d34d1903e8db9c22ac41788e80367dc95aa2f",
    reference: {
      peak_reduction_mw: ref.peak_reduction_mw,
      peak_after_mw: ref.peak_after_mw,
      grid_charge_energy_gwh: ref.grid_charge_energy_gwh ?? ref.surplus_pool_capture_grid_gwh,
    },
    solved: {
      peak_reduction_mw: got.peak_reduction_mw,
      peak_after_mw: got.peak_after_mw,
      grid_charge_energy_gwh: got.grid_charge_energy_gwh ?? got.surplus_pool_capture_grid_gwh,
    },
    mip: got.mip_report_ref ?? null,
  };
  cmp.within_tolerance = Object.keys(tol).every(
    (k) => Math.abs((cmp.reference[k] ?? 0) - (cmp.solved[k] ?? 0)) <= tol[k],
  );
  const report = { ok: true, outDir, manifestPath, manifest_sha256: createHash("sha256").update(readFileSync(manifestPath)).digest("hex"), cmp };
  writeFileSync(join(outDir, "bundle-compare.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
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
