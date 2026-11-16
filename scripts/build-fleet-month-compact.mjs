#!/usr/bin/env node
/**
 * Kompaktes Client-Asset für /monat Regler (Paket A).
 * Zeitstempel und r_mw einmal; je aktiver Lauf rp/c/d/e als gerundete MW/MWh.
 */
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "data/national-fleet/2026-10");
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

/** Minuten seit 2026-10-01T00:00:00+02:00 (Berlin), DST-Offsets in den Roh-Timestamps. */
function minuteOffsets(timestamps) {
  const t0 = Date.parse("2026-10-01T00:00:00+02:00");
  return timestamps.map((s) => Math.round((Date.parse(s) - t0) / 60_000));
}

const compact = {
  v: 1,
  monthKey: "2026-10",
  n,
  t0: "2026-10-01T00:00:00+02:00",
  tm: minuteOffsets(base.timestamp_berlin),
  r: base.r_mw.map((v) => Math.round(v)),
  refPeakMw: 64405.9,
  refPeakTs: "2026-10-29T18:15:00+01:00",
  surplusPoolGwh: 134.241975,
  marketKipppunktFactor: 3.9,
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