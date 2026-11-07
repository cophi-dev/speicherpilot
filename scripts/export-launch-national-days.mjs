#!/usr/bin/env node
/**
 * Export Energy-Charts dispatch slots + surplus sim for launch evidence (public upstream).
 * Usage: node scripts/export-launch-national-days.mjs <outDir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const OUT = process.argv[2] ?? join(process.cwd(), "artifacts", "national-intervals");
const DAYS = ["2026-10-24", "2026-10-02", "2026-10-25", "2025-03-30"];
const FACTORS = [1, 2, 5, 10];
const EC_V2 = "https://api.energy-charts.info/v2/total_power?country=de";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const manifest = {
    gitCommit: commit,
    generatedAt: new Date().toISOString(),
    days: DAYS,
    factors: FACTORS,
    upstream: {
      name: "Fraunhofer ISE Energy-Charts",
      license: "CC BY 4.0",
      apiBase: "https://api.energy-charts.info",
    },
  };

  const run = await import("../lib/exportLaunchNationalDays.ts");
  const results = [];
  for (const dayKey of DAYS) {
    const rawUrl = `${EC_V2}&start=${dayKey}&end=${dayKey}`;
    const rawRes = await fetch(rawUrl);
    if (!rawRes.ok) {
      throw new Error(`EC fetch failed ${dayKey}: ${rawRes.status}`);
    }
    const raw = await rawRes.json();
    writeFileSync(join(OUT, `total-power-raw-${dayKey}.json`), JSON.stringify({ url: rawUrl, retrievedAt: new Date().toISOString(), raw }, null, 2));
    const pack = await run.exportNationalDayEvidence(dayKey, FACTORS, raw);
    const file = `national-day-${dayKey}.json`;
    writeFileSync(join(OUT, file), JSON.stringify(pack, null, 2));
    results.push(file);
  }

  manifest.files = results;
  writeFileSync(join(OUT, "README-national.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
