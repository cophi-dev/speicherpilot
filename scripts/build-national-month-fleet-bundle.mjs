#!/usr/bin/env node
/**
 * Import Run9 fleet_factor timeseries into product bundle (columnar JSON).
 * Source: Agent store Run9 or RUN9_FLEET_ROOT env.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse } from "csv-parse/sync";

const RUN9 =
  process.env.RUN9_FLEET_ROOT ??
  "/cursor/stores/self/october-fleet-factor-run9-20261107/fleet_factor";
const OUT = join(process.cwd(), "data/national-fleet/2026-10");
const FACTORS = [1, 2, 5, 10];
const STRATEGIES = {
  ueberschuss: "surplus_wind_solar_over_load",
  spitze: "min_peak_perfect_foresight",
  markt: "price_oriented_da_arbitrage",
};

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

mkdirSync(OUT, { recursive: true });
const summary = JSON.parse(readFileSync(join(RUN9, "summary_fleet_factors.json"), "utf8"));
const provenance = JSON.parse(readFileSync(join(RUN9, "provenance.json"), "utf8"));
const runs = {};

for (const faktor of FACTORS) {
  for (const [slug, strategy] of Object.entries(STRATEGIES)) {
    const file = join(RUN9, "timeseries", `x${faktor}_${strategy}.csv`);
    if (!existsSync(file)) {
      throw new Error(`missing ${file}`);
    }
    const raw = readFileSync(file);
    const rows = parse(raw, { columns: true, skip_empty_lines: true });
    runs[`x${faktor}_${strategy}`] = {
      factor: faktor,
      strategySlug: strategy,
      strategyUi: slug,
      sourceSha256: sha256(raw),
      intervalCount: rows.length,
      timestamp_berlin: rows.map((r) => r.timestamp_berlin),
      c_mw: rows.map((r) => Number(r.c_mw)),
      d_mw: rows.map((r) => Number(r.d_mw)),
      e_start_mwh: rows.map((r) => Number(r.e_start_mwh)),
      e_end_mwh: rows.map((r) => Number(r.e_end_mwh)),
      r_mw: rows.map((r) => Number(r.R_residual_mw)),
      r_prime_mw: rows.map((r) => Number(r.R_prime_mw)),
      day_ahead_eur_mwh: rows.map((r) => Number(r.day_ahead_eur_mwh)),
    };
  }
}

const bundle = {
  bundleId: "run9-national-fleet-2026-10",
  monthKey: "2026-10",
  importedAt: new Date().toISOString(),
  run9Path: RUN9,
  provenance,
  summary: summary.scenarios,
  marginal: summary.marginal_capture_surplus_strategy,
  physics: summary.physics,
  strategies: STRATEGIES,
  factors: FACTORS,
  runs,
};

const outPath = join(OUT, "fleet-month-bundle.json");
writeFileSync(outPath, JSON.stringify(bundle));
writeFileSync(
  join(OUT, "manifest.json"),
  JSON.stringify({
    bundleFile: "fleet-month-bundle.json",
    sha256: sha256(readFileSync(outPath)),
    monthKey: "2026-10",
    quarters: 2980,
    hours: 745,
    dstOct25Quarters: 100,
    inputCsvSha256: provenance.input_sha256?.csv,
    run9SummarySha256: sha256(readFileSync(join(RUN9, "summary_fleet_factors.json"))),
  }, null, 2),
);

const designSrc = process.env.DESIGN_DATEN_R9;
if (designSrc && existsSync(designSrc)) {
  cpSync(designSrc, join(OUT, "design-daten-r9.csv"));
} else {
  const upload = "/home/ubuntu/.cursor/projects/agent-repos-speicherpilot/uploads/design-daten-r9_427e.csv";
  if (existsSync(upload)) {
    cpSync(upload, join(OUT, "design-daten-r9.csv"));
  }
}

console.log(`Wrote ${outPath} (${(readFileSync(outPath).length / 1e6).toFixed(2)} MB)`);
