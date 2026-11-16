#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { ensureArtifactDir, extractHrefs, getBaseUrl, isInternalHref, probeUrl, writeReport } from "./common.mjs";

const MAX_ROUTES = Number(process.env.SMOKE_MAX_ROUTES ?? 80);
const MAX_CLICKS_PER_PAGE = Number(process.env.SMOKE_MAX_CLICKS ?? 25);

async function sitemapPaths(base) {
  const res = await probeUrl(base, "/sitemap.xml");
  const paths = ["/"];
  for (const m of res.text.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    paths.push(new URL(m[1]).pathname);
  }
  return [...new Set(paths)].slice(0, MAX_ROUTES);
}

async function main() {
  const base = getBaseUrl();
  const origin = new URL(base).origin;
  const issues = [];
  const pagesVisited = [];
  const paths = await sitemapPaths(base);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      issues.push({ kind: "console-error", text: msg.text() });
    }
  });
  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && url.startsWith(origin)) {
      issues.push({ kind: "http-error", status, url });
    }
  });

  for (const path of paths) {
    try {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
      pagesVisited.push(path);
      const html = await page.content();
      const { hrefs } = extractHrefs(html, origin);
      const clickables = await page.$$eval(
        "a[href], button:not([disabled])",
        (els, limit) =>
          els.slice(0, limit).map((el) => ({
            tag: el.tagName,
            href: el.getAttribute("href"),
            text: (el.textContent ?? "").trim().slice(0, 40),
          })),
        MAX_CLICKS_PER_PAGE,
      );

      for (const item of clickables) {
        if (item.tag === "A" && item.href && isInternalHref(item.href, origin)) {
          const target = item.href.startsWith("/") ? `${base}${item.href}` : item.href;
          try {
            const popup = await page.context().waitForEvent("page", { timeout: 2000 }).catch(() => null);
            await page.click(`a[href="${item.href.replace(/"/g, '\\"')}"]`, { timeout: 5000 }).catch(() => {});
            if (popup) await popup.close();
          } catch (error) {
            issues.push({ kind: "click-failed", path, href: item.href, error: String(error) });
          }
        }
      }

      for (const { href } of hrefs.slice(0, 30)) {
        if (href && isInternalHref(href, origin)) {
          const p = href.startsWith("/") ? href : new URL(href).pathname;
          const check = await probeUrl(base, p);
          if (check.status >= 400) {
            issues.push({ kind: "dead-link", from: path, target: p, status: check.status });
          }
        }
      }
    } catch (error) {
      issues.push({ kind: "navigation-failed", path, error: String(error) });
    }
  }

  await browser.close();

  const ok = issues.length === 0;
  const report = {
    ok,
    base,
    pagesVisited,
    issueCount: issues.length,
    issues,
    summary: ok ? `OK — ${pagesVisited.length} Routen ohne Fund` : `FAIL — ${issues.length} Fund(e)`,
  };
  const dir = ensureArtifactDir("smoke");
  writeFileSync(join(dir, "smoke-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const reportPath = writeReport("smoke-report.json", report);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});