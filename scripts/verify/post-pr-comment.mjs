#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { ARTIFACT_DIR, REPO_ROOT } from "./common.mjs";

function readJson(name) {
  const p = join(ARTIFACT_DIR, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function main() {
  const summary = readJson("verify-summary.json");
  const shotsDir = join(ARTIFACT_DIR, "screenshots");
  const shotNames = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((f) => f.endsWith(".png")).slice(0, 8)
    : [];

  const lines = [
    "## Verifikation (Paket A)",
    "",
    `**Basis-URL:** ${summary?.baseUrl ?? process.env.VERIFY_BASE_URL ?? "—"}`,
    "",
  ];

  if (summary?.steps) {
    lines.push("### Jobs");
    for (const s of summary.steps) {
      lines.push(`- ${s.ok ? "✅" : "❌"} \`${s.cmd.split(" ").slice(-1)[0]}\``);
    }
    lines.push("");
  }

  const sm = readJson("sitemap-report.json");
  if (sm) {
    lines.push("### Sitemap", sm.summary, "");
    if (sm.missingInSitemap?.length) {
      lines.push("<details><summary>Fehlende Sitemap-Einträge</summary>", "", sm.missingInSitemap.map((p) => `- \`${p}\``).join("\n"), "</details>", "");
    }
  }

  const perf = readJson("performance-report.json");
  if (perf) {
    lines.push("### Performance (mobil)", perf.summary, "");
    for (const f of perf.failures ?? []) {
      lines.push(`- \`${f.path}\`: LCP **${f.lcpMs} ms** (max ${f.budgetLcpMs}), Transfer **${Math.round((f.totalBytes ?? 0) / 1024)} KiB** (max ${Math.round(f.budgetBytes / 1024)} KiB)`);
      for (const n of f.analysis?.notes ?? []) {
        lines.push(`  - ${n}`);
      }
    }
    lines.push("");
  }

  const links = readJson("links-report.json");
  if (links) {
    lines.push("### Links", links.summary, "");
  }

  if (shotNames.length) {
    lines.push("### Screenshots (Artefakt `verify-screenshots`)", "");
    for (const name of shotNames) {
      lines.push(`- \`${name}\``);
    }
  }

  const body = lines.join("\n");
  const outPath = join(REPO_ROOT, ".verify-artifacts", "pr-comment.md");
  mkdirSync(join(REPO_ROOT, ".verify-artifacts"), { recursive: true });
  writeFileSync(outPath, body);
  console.log(body);
}

main();