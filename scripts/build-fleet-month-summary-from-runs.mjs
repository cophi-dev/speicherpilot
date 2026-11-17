#!/usr/bin/env node
/**
 * Erzeugt summary + marginal in fleet-month-meta.json aus runs/x{N}_*.json
 * (gleiche Schlüssel/Logik wie Run9 summary_fleet_factors / fleet-month-bundle).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const monthKey = process.argv[2] ?? "2026-11";
const ROOT = join(process.cwd(), "data/national-fleet", monthKey);
const META_PATH = join(ROOT, "fleet-month-meta.json");

const BASE_POWER_MW = 4644.09022;
const BASE_ENERGY_MWH = 8152.4588;
const DT_H = 0.25;
const ETA = Math.sqrt(0.85);
const FACTORS = [1, 2, 5, 10];
const FILE_KEYS = [
  "surplus_wind_solar_over_load",
  "min_peak_perfect_foresight",
  "price_oriented_da_arbitrage",
];

function loadRun(factor, fileKey) {
  const p = join(ROOT, "runs", `x${factor}_${fileKey}.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function additionalUnits(factor) {
  return Math.max(0, factor - 1);
}

function dispatchStats(run, factor, strategy, refPeakMw, monthSurplusPoolGwh) {
  const r = run.r_mw;
  const rp = run.r_prime_mw;
  const c = run.c_mw;
  const d = run.d_mw;
  const e = run.e_end_mwh;
  let absorbedMwh = 0;
  let dischargedMwh = 0;
  let surMwh = 0;
  for (let i = 0; i < run.intervalCount; i += 1) {
    absorbedMwh += c[i] * DT_H;
    dischargedMwh += d[i] * DT_H;
    surMwh += Math.max(0, -r[i]) * DT_H;
  }
  let sim = 0;
  for (let i = 0; i < run.intervalCount; i += 1) {
    if (c[i] > 1e-6 && d[i] > 1e-6) sim += 1;
  }
  const pMw = BASE_POWER_MW * additionalUnits(factor);
  const eNom = BASE_ENERGY_MWH * additionalUnits(factor);
  let idxB = 0;
  let idxA = 0;
  let maxR = -Infinity;
  let maxRp = -Infinity;
  for (let i = 0; i < r.length; i += 1) {
    if (r[i] > maxR) {
      maxR = r[i];
      idxB = i;
    }
    if (rp[i] > maxRp) {
      maxRp = rp[i];
      idxA = i;
    }
  }
  const captureRatio = monthSurplusPoolGwh > 0 ? absorbedMwh / 1000 / monthSurplusPoolGwh : 0;
  const utilSurplus = surMwh > 0 ? absorbedMwh / surMwh : 0;
  let binding = 0;
  let maxViol = 0;
  if (pMw > 0) {
    for (let i = 0; i < c.length; i += 1) {
      if (c[i] > 0.999 * pMw || d[i] > 0.999 * pMw) binding += 1;
      maxViol = Math.max(maxViol, Math.max(c[i] - pMw, d[i] - pMw, 0));
    }
    binding /= c.length;
  }
  let balance = 0;
  for (let i = 0; i < c.length; i += 1) {
    balance += ETA * c[i] * DT_H - (d[i] * DT_H) / ETA;
  }
  const stats = {
    baseline_max_residual_mw: maxR,
    baseline_max_residual_ts: run.timestamp_berlin[idxB],
    after_max_residual_mw: maxRp,
    after_max_residual_ts: run.timestamp_berlin[idxA],
    peak_reduction_mw: maxR - maxRp,
    peak_reduction_pct_of_ref_64405_9: refPeakMw !== 0 ? ((refPeakMw - maxRp) / refPeakMw) * 100 : 0,
    grid_charge_energy_mwh: absorbedMwh,
    grid_charge_energy_gwh: absorbedMwh / 1000,
    grid_discharge_energy_mwh: dischargedMwh,
    grid_discharge_energy_gwh: dischargedMwh / 1000,
    grid_side_roundtrip_loss_mwh: absorbedMwh - dischargedMwh,
    grid_side_roundtrip_loss_gwh: (absorbedMwh - dischargedMwh) / 1000,
    energy_balance_residue_mwh: balance,
    simultaneous_intervals: sim,
    max_power_violation_mw: maxViol,
    soc_start_mwh: run.e_start_mwh[0] ?? 0,
    soc_end_mwh: e[e.length - 1] ?? 0,
    soc_end_minus_start_mwh: (e[e.length - 1] ?? 0) - (run.e_start_mwh[0] ?? 0),
    soc_min_mwh: Math.min(...e),
    soc_max_mwh: Math.max(...e),
    binding_power_fraction: binding,
    surplus_pool_capture_grid_gwh: absorbedMwh / 1000,
    surplus_pool_capture_share_of_134_241975_gwh: captureRatio,
    surplus_pool_utilisation_of_positive_qh_energy: utilSurplus,
    model_capture_grid_gwh: absorbedMwh / 1000,
    model_capture_share_of_month_surplus_pool: captureRatio,
    factor,
    strategy,
    p_mw: pMw,
    e_nominal_mwh: eNom,
  };
  if (additionalUnits(factor) === 0) {
    stats.peak_reduction_mw = 0;
    stats.peak_reduction_pct_of_ref_64405_9 = 0;
    stats.surplus_pool_capture_share_of_134_241975_gwh = 0;
    stats.solver = { noop: "observed baseline ×1" };
  } else if (strategy === "surplus_wind_solar_over_load") {
    stats.solver = { imported: "shard" };
  } else {
    stats.solver = { solve: { status: "imported", solver: "shard" } };
  }
  return stats;
}

function marginalTable(byFactor) {
  const stages = [
    [1, 2, 1],
    [2, 5, 3],
    [5, 10, 5],
  ];
  return stages.map(([from, to, units]) => {
    const sa = byFactor[from].surplus_wind_solar_over_load;
    const sb = byFactor[to].surplus_wind_solar_over_load;
    const deltaCapture = sb.surplus_pool_capture_grid_gwh - sa.surplus_pool_capture_grid_gwh;
    const deltaPeak = sb.peak_reduction_mw - sa.peak_reduction_mw;
    const deltaPowerGw = (sb.p_mw - sa.p_mw) / 1000;
    const deltaEnergyGwh = (sb.e_nominal_mwh - sa.e_nominal_mwh) / 1000;
    return {
      from_factor: from,
      to_factor: to,
      delta_factor_units: units,
      delta_capture_gwh: deltaCapture,
      delta_capture_per_added_gw_power: deltaPowerGw > 0 ? deltaCapture / deltaPowerGw : 0,
      delta_capture_per_added_gwh_energy: deltaEnergyGwh > 0 ? deltaCapture / deltaEnergyGwh : 0,
      delta_peak_reduction_mw: deltaPeak,
      note: "Nicht-Stufen gleich groß: ×1→×2 (+1), ×2→×5 (+3), ×5→×10 (+5)",
    };
  });
}

const baseline = loadRun(1, "min_peak_perfect_foresight");
let refPeakMw = 0;
for (const v of baseline.r_mw) {
  refPeakMw = Math.max(refPeakMw, v);
}
let monthSurplusPoolMwh = 0;
for (const v of baseline.r_mw) {
  monthSurplusPoolMwh += Math.max(0, -v) * DT_H;
}
const monthSurplusPoolGwh = monthSurplusPoolMwh / 1000;

const summary = {};
const byFactor = {};
for (const factor of FACTORS) {
  summary[String(factor)] = {};
  byFactor[factor] = {};
  for (const fileKey of FILE_KEYS) {
    const run = loadRun(factor, fileKey);
    const stats = dispatchStats(run, factor, fileKey, refPeakMw, monthSurplusPoolGwh);
    summary[String(factor)][fileKey] = stats;
    byFactor[factor][fileKey] = stats;
  }
}

const meta = JSON.parse(readFileSync(META_PATH, "utf8"));
meta.summary = summary;
meta.marginal = marginalTable(byFactor);
meta.factors = FACTORS;
meta.runKeys = FACTORS.flatMap((f) => FILE_KEYS.map((k) => `x${f}_${k}`));
if (meta.provenance && typeof meta.provenance === "object") {
  meta.provenance.month_surplus_pool_gwh = monthSurplusPoolGwh;
}

writeFileSync(META_PATH, `${JSON.stringify(meta)}\n`);

let marketKipppunktFactor = 10;
for (const factor of [2, 5, 10]) {
  const m = loadRun(factor, "price_oriented_da_arbitrage");
  const after = Math.max(...m.r_prime_mw);
  if (after > refPeakMw + 1) {
    marketKipppunktFactor = factor - 0.1;
    break;
  }
}
const kipPath = join(ROOT, "market-kipppunkt.json");
writeFileSync(
  kipPath,
  `${JSON.stringify(
    {
      factor_approx: marketKipppunktFactor,
      reference_mw: refPeakMw,
      computed_at: new Date().toISOString().slice(0, 10),
      method: "erste Faktorstufe mit after_max_residual > Referenz (Preisnehmer, Monatslauf)",
    },
    null,
    2,
  )}\n`,
);

const sha = createHash("sha256").update(readFileSync(META_PATH)).digest("hex");
console.log(
  JSON.stringify({
    ok: true,
    monthKey,
    metaPath: META_PATH,
    metaSha256: sha,
    refPeakMw,
    monthSurplusPoolGwh,
    marketKipppunktFactor,
    scenarios: FACTORS.length * FILE_KEYS.length,
  }),
);