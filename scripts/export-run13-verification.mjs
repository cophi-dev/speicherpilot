#!/usr/bin/env node
/**
 * Numerische Render-Prüfdaten aus dem Oktober-Bundle (Run9-SHA unverändert).
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const OUT =
  process.env.RUN13_EXPORT_OUT ??
  "/cursor/stores/self/launch-run13-abnahme-20261107/EXPORTS/numeric";

const FACTORS = [1, 2, 5, 10];
const STRATEGIES = {
  ueberschuss: "surplus_wind_solar_over_load",
  spitze: "min_peak_perfect_foresight",
  markt: "price_oriented_da_arbitrage",
};

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function monthStats(bundle, factor, strategyUi) {
  const fileKey = STRATEGIES[strategyUi];
  const row = bundle.summary[String(factor)][fileKey];
  const chargeGwh =
    row.grid_charge_energy_gwh ??
    row.surplus_pool_capture_grid_gwh ??
    row.model_capture_grid_gwh;
  const peakAfterGw = row.peak_after_mw / 1000;
  const peakReductionGw = row.peak_reduction_mw / 1000;
  return {
    factor,
    strategyUi,
    chargeGwh,
    peakAfterGw,
    peakReductionGw,
    dischargeGwh: row.grid_discharge_energy_gwh,
    surplusPoolCaptureGwh: row.surplus_pool_capture_grid_gwh,
    peakBeforeGw: row.peak_before_mw / 1000,
  };
}

function marginalSteps(bundle, strategyUi) {
  if (strategyUi === "ueberschuss") {
    return bundle.marginal.map((m) => ({
      from_factor: m.from_factor,
      to_factor: m.to_factor,
      delta_factor_units: m.delta_factor_units,
      delta_capture_gwh: m.delta_capture_gwh,
      delta_peak_reduction_mw: m.delta_peak_reduction_mw,
      surplusPoolMarginal: true,
    }));
  }
  const deltas = [
    [1, 2, 1],
    [2, 5, 3],
    [5, 10, 5],
  ];
  return deltas.map(([from, to, units]) => {
    const a = bundle.summary[String(from)][STRATEGIES[strategyUi]];
    const b = bundle.summary[String(to)][STRATEGIES[strategyUi]];
    const chargeA = a.grid_charge_energy_gwh ?? a.surplus_pool_capture_grid_gwh ?? a.model_capture_grid_gwh;
    const chargeB = b.grid_charge_energy_gwh ?? b.surplus_pool_capture_grid_gwh ?? b.model_capture_grid_gwh;
    return {
      from_factor: from,
      to_factor: to,
      delta_factor_units: units,
      delta_capture_gwh: chargeB - chargeA,
      delta_peak_reduction_mw: b.peak_reduction_mw - a.peak_reduction_mw,
      surplusPoolMarginal: false,
    };
  });
}

function sliceDay(run, dateKey) {
  const indices = [];
  for (let i = 0; i < run.timestamp_berlin.length; i += 1) {
    if (run.timestamp_berlin[i].startsWith(dateKey)) {
      indices.push(i);
    }
  }
  return { indices, intervalCount: indices.length };
}

function chartSample(run, indices, every = 120) {
  const picks = [];
  for (let j = 0; j < indices.length; j += every) {
    const i = indices[j];
    picks.push({
      i,
      ts: run.timestamp_berlin[i],
      r_mw: run.r_mw[i],
      r_prime_mw: run.r_prime_mw[i],
      c_mw: run.c_mw[i],
      d_mw: run.d_mw[i],
      e_start_mwh: run.e_start_mwh[i],
    });
  }
  const last = indices[indices.length - 1];
  if (last !== undefined && (picks.length === 0 || picks[picks.length - 1].i !== last)) {
    picks.push({
      i: last,
      ts: run.timestamp_berlin[last],
      r_mw: run.r_mw[last],
      r_prime_mw: run.r_prime_mw[last],
      c_mw: run.c_mw[last],
      d_mw: run.d_mw[last],
      e_start_mwh: run.e_start_mwh[last],
    });
  }
  return picks;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: process.cwd() }).trim();
  const bundlePath = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json");
  const manifestPath = join(process.cwd(), "data/national-fleet/2026-10/manifest.json");
  const bundleRaw = readFileSync(bundlePath);
  const bundle = JSON.parse(bundleRaw.toString("utf8"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const provenance = {
    tested_source_sha: commit,
    buildId: process.env.BUILD_ID ?? null,
    exportedAt: new Date().toISOString(),
    bundlePath: "data/national-fleet/2026-10/fleet-month-bundle.json",
    bundleSha256: sha256(bundleRaw),
    manifestSha256FromRepo: manifest.sha256,
    bundleId: bundle.bundleId,
    monthKey: bundle.monthKey,
    intervalCountReference: 2980,
    noteDe:
      "bundle.marginal gilt nur für Überschuss (Surplus-Pool). Spitze/Markt: Grenznutzen aus summary-Feldern, nicht aus bundle.marginal.",
  };

  const monthKpis = {};
  for (const strategyUi of Object.keys(STRATEGIES)) {
    monthKpis[strategyUi] = FACTORS.map((f) => monthStats(bundle, f, strategyUi));
  }

  const marginalByStrategy = {};
  for (const strategyUi of Object.keys(STRATEGIES)) {
    marginalByStrategy[strategyUi] = marginalSteps(bundle, strategyUi);
  }

  const tagDays = [
    { key: "2026-10-29", label: "Tag 29.10" },
    { key: "2026-10-25", label: "DST 25.10" },
    { key: "2026-10-24", label: "Referenz 24.10" },
  ];
  const tagSlices = {};
  for (const day of tagDays) {
    tagSlices[day.key] = {};
    for (const strategyUi of Object.keys(STRATEGIES)) {
      tagSlices[day.key][strategyUi] = {};
      for (const factor of [1, 2, 5, 10]) {
        const run = bundle.runs[`x${factor}_${STRATEGIES[strategyUi]}`];
        const slice = sliceDay(run, day.key);
        tagSlices[day.key][strategyUi][`x${factor}`] = {
          intervalCount: slice.intervalCount,
          chartSample: chartSample(run, slice.indices),
        };
      }
    }
  }

  const x1Surplus = bundle.runs.x1_surplus_wind_solar_over_load;
  const monthChartTail = chartSample(x1Surplus, x1Surplus.timestamp_berlin.map((_, i) => i), 296);

  writeFileSync(join(OUT, "provenance.json"), JSON.stringify(provenance, null, 2));
  writeFileSync(join(OUT, "month-kpis-by-strategy.json"), JSON.stringify(monthKpis, null, 2));
  writeFileSync(join(OUT, "marginal-by-strategy.json"), JSON.stringify(marginalByStrategy, null, 2));
  writeFileSync(join(OUT, "tag-day-slices.json"), JSON.stringify(tagSlices, null, 2));
  writeFileSync(
    join(OUT, "month-chart-sample-x1-ueberschuss.json"),
    JSON.stringify({ everyNthQuarter: 296, samples: monthChartTail, totalIntervals: x1Surplus.intervalCount }, null, 2),
  );

  const spitzeMonth = FACTORS.map((f) => monthStats(bundle, f, "spitze"));
  writeFileSync(join(OUT, "spitze-month-kpi-table.json"), JSON.stringify(spitzeMonth, null, 2));

  if (provenance.bundleSha256 !== manifest.sha256) {
    console.error("Bundle-SHA weicht von manifest.json ab", provenance.bundleSha256, manifest.sha256);
    process.exitCode = 1;
  }
  if (x1Surplus.intervalCount !== 2980) {
    console.error("Erwartete 2980 Viertelstunden, got", x1Surplus.intervalCount);
    process.exitCode = 1;
  }
  console.log("Wrote numeric exports to", OUT);
}

main();
