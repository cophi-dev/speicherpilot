#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.LH_OUT ?? join(process.cwd(), "artifacts", process.env.LAUNCH_R4_STAMP ? `launch-r4-${process.env.LAUNCH_R4_STAMP}` : "lighthouse-a11y");

const ROUTES = ["/", "/monat/2026-10", "/tag/2026-10-24", "/ort?sicht=netz"];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const summary = { base: BASE, commit, at: new Date().toISOString(), routes: [] };
  for (const path of ROUTES) {
    const slug = path.replace(/[^\w-]+/g, "_").replace(/^_+/, "") || "root";
    const outFile = join(OUT, `a11y-${slug}.json`);
    execSync(
      `pnpm dlx lighthouse@12.6.1 ${BASE}${path} --only-categories=accessibility --output=json --output-path=${outFile} --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
      { stdio: "inherit", env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH } },
      { timeout: 240_000 },
    );
    const report = JSON.parse(readFileSync(outFile, "utf8"));
    const score = Math.round((report.categories?.accessibility?.score ?? 0) * 100);
    summary.routes.push({ path, score, outFile, audits: report.audits ? Object.keys(report.audits).length : 0 });
  }
  writeFileSync(join(OUT, "lighthouse-a11y-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  const min = Math.min(...summary.routes.map((r) => r.score));
  if (min < 100) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
