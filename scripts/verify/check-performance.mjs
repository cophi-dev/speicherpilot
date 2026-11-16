#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ensureArtifactDir, getBaseUrl, loadJson, writeReport } from "./common.mjs";

function auditNumeric(report, id) {
  return report.audits?.[id]?.numericValue ?? null;
}

function topScripts(report, limit = 8) {
  const items = report.audits?.["bootup-time"]?.details?.items ?? [];
  return items
    .slice()
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, limit)
    .map((i) => ({ url: i.url, totalMs: Math.round(i.total ?? 0) }));
}

function topNetwork(report, limit = 12) {
  const items = report.audits?.["network-requests"]?.details?.items ?? [];
  return items
    .slice()
    .sort((a, b) => (b.transferSize ?? 0) - (a.transferSize ?? 0))
    .slice(0, limit)
    .map((i) => ({
      url: i.url,
      transferBytes: i.transferSize ?? 0,
      resourceType: i.resourceType,
    }));
}

function analyzeMonatCause(report, path) {
  const lcpElement = report.audits?.["largest-contentful-paint-element"]?.displayValue ?? null;
  const tbt = auditNumeric(report, "total-blocking-time");
  const bootup = topScripts(report);
  const network = topNetwork(report);
  const notes = [];
  if (path.includes("/monat/2026-11")) {
    notes.push(
      "Erwarteter Ausreißer (Paket B): Server-TTFB ist typisch schnell; Lighthouse-LCP misst clientseitige Hydration, Chart-Rendering und große JSON-Bundles für Teilanalyse-Monate.",
    );
    const heavyJs = bootup.filter((b) => (b.totalMs ?? 0) > 500);
    if (heavyJs.length) {
      notes.push(`Schwere JS-Chunks: ${heavyJs.map((b) => `${b.url?.split("/").pop() ?? b.url} (${b.totalMs} ms)`).join(", ")}`);
    }
    const heavyData = network.filter((n) => (n.transferBytes ?? 0) > 100_000 && /\.json|\/api\//.test(n.url ?? ""));
    if (heavyData.length) {
      notes.push(
        `Große Daten-Requests: ${heavyData.map((n) => `${n.url?.split("/").pop() ?? n.url} (${Math.round(n.transferBytes / 1024)} KiB)`).join(", ")}`,
      );
    }
  }
  return { lcpElement, tbt, bootup, network, notes };
}

async function runLighthouse(base, path, budgets, outFile) {
  const version = budgets.lighthouse?.version ?? "12.6.1";
  const url = `${base}${path}`;
  mkdirSync(join(outFile, ".."), { recursive: true });
  execSync(
    `pnpm dlx lighthouse@${version} ${JSON.stringify(url)} --only-categories=performance --form-factor=mobile --screenEmulation.mobile=true --throttling.cpuSlowdownMultiplier=4 --output=json --output-path=${JSON.stringify(outFile)} --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
    { stdio: "inherit", timeout: 300_000, env: { ...process.env } },
  );
  return JSON.parse(readFileSync(outFile, "utf8"));
}

async function main() {
  const base = getBaseUrl();
  const budgets = loadJson("verify/performance-budgets.json");
  const { lcpMs, totalTransferBytes } = budgets.mobile;
  const dir = ensureArtifactDir("lighthouse");
  const results = [];
  const failures = [];

  for (const pageType of budgets.pageTypes) {
    for (const path of pageType.paths) {
      const slug = path.replace(/[^\w-]+/g, "_").replace(/^_+/, "") || "root";
      const outFile = join(dir, `${pageType.id}-${slug}.json`);
      const report = await runLighthouse(base, path, budgets, outFile);
      const lcp = auditNumeric(report, "largest-contentful-paint");
      const bytes = auditNumeric(report, "total-byte-weight");
      const analysis = analyzeMonatCause(report, path);
      const row = {
        pageType: pageType.id,
        path,
        lcpMs: lcp != null ? Math.round(lcp) : null,
        budgetLcpMs: lcpMs,
        totalBytes: bytes != null ? Math.round(bytes) : null,
        budgetBytes: totalTransferBytes,
        withinBudget: (lcp == null || lcp <= lcpMs) && (bytes == null || bytes <= totalTransferBytes),
        reportFile: outFile,
        analysis,
      };
      results.push(row);
      if (!row.withinBudget) {
        failures.push(row);
      }
    }
  }

  const ok = failures.length === 0;
  const summary = {
    ok,
    base,
    budgets: budgets.mobile,
    results,
    failures,
    summary: ok
      ? `OK — alle ${results.length} Budget-Stichproben grün`
      : `FAIL — ${failures.length} Seite(n) über Budget`,
  };
  writeFileSync(join(dir, "performance-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  const reportPath = writeReport("performance-report.json", summary);
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
  if (!ok && process.env.VERIFY_CONTINUE !== "1") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});