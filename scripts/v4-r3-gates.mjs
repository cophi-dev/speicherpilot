#!/usr/bin/env node
/** R3 gate measurements for PR 64 (run against `pnpm start`). */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/v4-r3-gates.json";

function curlBytes(path) {
  const out = execSync(`curl -sS -o /tmp/sp-r3.html -w '%{size_download}' '${BASE}${path}'`, {
    encoding: "utf8",
  });
  return Number(out.trim());
}

function curlHead(path) {
  return execSync(`curl -sS -I '${BASE}${path}'`, { encoding: "utf8" });
}

function h1InServerHtml(path) {
  const html = execSync(`curl -sS '${BASE}${path}'`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return /<h1[\s>]/i.test(html) ? 1 : 0;
}

async function lighthouseScores(path, viewport) {
  try {
    const { default: lighthouse } = await import("lighthouse");
    const { default: chromeLauncher } = await import("chrome-launcher");
    const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });
    const opts = {
      logLevel: "error",
      output: "json",
      onlyCategories: ["accessibility", "performance"],
      port: chrome.port,
      formFactor: viewport.width < 500 ? "mobile" : "desktop",
      screenEmulation: {
        mobile: viewport.width < 500,
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        disabled: false,
      },
    };
    const result = await lighthouse(`${BASE}${path}`, opts);
    await chrome.kill();
    const cats = result.lhr.categories;
    return {
      a11y: Math.round((cats.accessibility?.score ?? 0) * 100),
      perf: Math.round((cats.performance?.score ?? 0) * 100),
      cls: result.lhr.audits["cumulative-layout-shift"]?.numericValue ?? null,
    };
  } catch (e) {
    console.warn("lighthouse skip", e.message);
    return null;
  }
}

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), routes: {}, redirects: [] };

  for (const [path, name] of [
    ["/", "home"],
    ["/ort?sicht=projekt", "ort-projekt"],
    ["/ort?sicht=netz", "ort-netz"],
    ["/methodik", "methodik"],
    ["/tag/2026-10-25", "tag-low-peak"],
    ["/tag/2026-11-02", "tag"],
  ]) {
    const bytes = curlBytes(path);
    report.routes[name] = {
      path,
      htmlKb: Math.round((bytes / 1024) * 10) / 10,
      h1ServerHtml: h1InServerHtml(path),
    };
    console.log(name, report.routes[name].htmlKb, "kB", "h1", report.routes[name].h1ServerHtml);
  }

  for (const path of ["/live", "/live?tag=2026-10-29", "/site"]) {
    const head = curlHead(path);
    const status = head.match(/^HTTP\/[\d.]+ (\d+)/m)?.[1];
    const location = head.match(/^location: (.+)$/im)?.[1]?.trim();
    report.redirects.push({ path, status, location });
    console.log("redirect", path, status, location);
  }

  const methodikHtml = execSync(`curl -sS '${BASE}/methodik'`, { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
  report.methodikDefaultOpenInHtml = /Entscheidungsspielraum|Open-Source-Lizenzen|CC BY 4\.0/.test(methodikHtml);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/ort?sicht=projekt`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(4000);
  const ortCls = await page.evaluate(() => {
    let cls = 0;
    for (const entry of performance.getEntriesByType("layout-shift")) {
      const e = entry;
      if (!e.hadRecentInput) cls += e.value;
    }
    return cls;
  });
  report.routes["ort-projekt"].clsDesktop1440 = Math.round(ortCls * 1000) / 1000;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/ort?sicht=projekt`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/r3-ort-projekt-1440.png", fullPage: false });
  await page.goto(`${BASE}/tag/2026-10-25`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/r3-tag-2026-10-25-kopf-1440.png", fullPage: false });

  const lhHome = await lighthouseScores("/", { width: 375, height: 740 });
  const lhOrt = await lighthouseScores("/ort?sicht=projekt", { width: 1440, height: 900 });
  report.lighthouse = { homeMobile375: lhHome, ortDesktop1440: lhOrt };

  await browser.close();
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
