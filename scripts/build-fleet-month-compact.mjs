#!/usr/bin/env node
/**
 * Kompaktes Client-Asset für /monat Regler (Paket A).
 * Zeitstempel und r_mw einmal; je aktiver Lauf rp/c/d/e als gerundete MW/MWh.
 */
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const monthKey = process.argv[2] ?? "2026-10";
const ROOT = join(process.cwd(), "data/national-fleet", monthKey);
const OUT = join(ROOT, "fleet-month-compact.json");

const RUNS = [
  [2, "spitze", "min_peak_perfect_foresight"],
  [5, "spitze", "min_peak_perfect_foresight"],
  [10, "spitze", "min_peak_perfect_foresight"],
  [2, "ueberschuss", "surplus_wind_solar_over_load"],
  [5, "ueberschuss", "surplus_wind_solar_over_load"],
  [10, "ueberschuss", "surplus_wind_solar_over_load"],
  [2, "markt", "price_oriented_da_arbitrage"],
  [5, "markt", "price_oriented_da_arbitrage"],
  [10, "markt", "price_oriented_da_arbitrage"],
];

function loadRun(factor, fileKey) {
  const p = join(ROOT, "runs", `x${factor}_${fileKey}.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}

const base = loadRun(1, "min_peak_perfect_foresight");
const n = base.timestamp_berlin.length;

/** Minuten seit erster Viertelstunde des Monatslaufs (Berlin-ISO). */
function minuteOffsets(timestamps, t0Iso) {
  const t0 = Date.parse(t0Iso);
  return timestamps.map((s) => Math.round((Date.parse(s) - t0) / 60_000));
}

const t0Iso = base.timestamp_berlin[0];
let refPeakMw = 0;
let refPeakTs = t0Iso;
for (let i = 0; i < base.r_mw.length; i += 1) {
  if (base.r_mw[i] > refPeakMw) {
    refPeakMw = base.r_mw[i];
    refPeakTs = base.timestamp_berlin[i];
  }
}
let surplusPoolMwh = 0;
for (const r of base.r_mw) {
  surplusPoolMwh += Math.max(0, -r) * 0.25;
}
let marketKipppunktFactor = 3.9;
for (const factor of [2, 5, 10]) {
  const m = loadRun(factor, "price_oriented_da_arbitrage");
  const after = Math.max(...m.r_prime_mw);
  if (after > refPeakMw + 1) {
    marketKipppunktFactor = factor - 0.1;
    break;
  }
}

const compact = {
  v: 1,
  monthKey,
  n,
  t0: t0Iso,
  tm: minuteOffsets(base.timestamp_berlin, t0Iso),
  r: base.r_mw.map((v) => Math.round(v)),
  refPeakMw,
  refPeakTs,
  surplusPoolGwh: surplusPoolMwh / 1000,
  marketKipppunktFactor,
  runs: {},
};

for (const [factor, slug, fileKey] of RUNS) {
  const run = loadRun(factor, fileKey);
  if (run.timestamp_berlin.length !== n) {
    throw new Error(`Länge mismatch x${factor} ${fileKey}`);
  }
  compact.runs[`${factor}_${slug}`] = {
    rp: run.r_prime_mw.map((v) => Math.round(v)),
    c: run.c_mw.map((v) => Math.round(v)),
    d: run.d_mw.map((v) => Math.round(v)),
    e: run.e_end_mwh.map((v) => Math.round(v * 10) / 10),
  };
}

const json = JSON.stringify(compact);
const sha = createHash("sha256").update(json).digest("hex");
writeFileSync(OUT, json);
console.log(`wrote ${OUT} (${json.length} bytes, sha256 ${sha.slice(0, 12)}…)`);

const gz = gzipSync(Buffer.from(json));
console.log(`gzip ${gz.length} bytes`);