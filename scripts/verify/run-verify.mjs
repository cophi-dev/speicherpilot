#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { REPO_ROOT, ensureArtifactDir, writeReport } from "./common.mjs";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, ...opts.env } });
  return { cmd: [cmd, ...args].join(" "), ok: res.status === 0, status: res.status ?? 1 };
}

function main() {
  const steps = [];
  steps.push(run("pnpm", ["exec", "tsx", "--tsconfig", "tsconfig.json", "scripts/verify/enumerate-indexable-routes.ts"]));
  const cont = { VERIFY_CONTINUE: "1" };
  steps.push(run("node", ["scripts/verify/crawl-links.mjs"], { env: cont }));
  steps.push(run("node", ["scripts/verify/check-sitemap.mjs"], { env: cont }));
  steps.push(run("node", ["scripts/verify/check-performance.mjs"], { env: cont }));
  steps.push(run("node", ["scripts/verify/pr-screenshots.mjs"], { env: cont }));

  const summary = {
    at: new Date().toISOString(),
    baseUrl: process.env.VERIFY_BASE_URL,
    steps,
    ok: steps.every((s) => s.ok),
  };

  const dir = ensureArtifactDir();
  for (const name of ["links-report.json", "sitemap-report.json", "performance-report.json", "screenshots-report.json"]) {
    try {
      summary[name.replace(".json", "")] = JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch {
      /* optional */
    }
  }
  const reportPath = writeReport("verify-summary.json", summary);
  writeFileSync(join(dir, "GITHUB_STEP_SUMMARY.md"), buildMarkdown(summary), "utf8");
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
  if (!summary.ok) process.exit(1);
}

function buildMarkdown(summary) {
  const lines = ["## verify — Zusammenfassung", "", `Basis: ${summary.baseUrl ?? "—"}`, ""];
  for (const s of summary.steps) {
    lines.push(`- ${s.ok ? "✅" : "❌"} \`${s.cmd}\``);
  }
  if (summary["sitemap-report"]) {
    const sm = summary["sitemap-report"];
    lines.push("", `### Sitemap`, sm.summary);
    if (sm.missingInSitemap?.length) {
      lines.push(`Fehlen in Sitemap (${sm.missingInSitemap.length}): ${sm.missingInSitemap.slice(0, 15).join(", ")}${sm.missingInSitemap.length > 15 ? "…" : ""}`);
    }
  }
  if (summary["performance-report"]) {
    const perf = summary["performance-report"];
    lines.push("", `### Performance`, perf.summary);
    for (const f of perf.failures ?? []) {
      lines.push(`- **${f.path}**: LCP ${f.lcpMs} ms (Budget ${f.budgetLcpMs}), ${Math.round((f.totalBytes ?? 0) / 1024)} KiB (Budget ${Math.round(f.budgetBytes / 1024)} KiB)`);
      for (const n of f.analysis?.notes ?? []) {
        lines.push(`  - ${n}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

main();