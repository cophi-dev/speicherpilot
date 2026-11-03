#!/usr/bin/env node
/** R4 gate measurements for PR 64. Requires production server on SITE_E2E_BASE_URL. */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/v4-r4-gates.json";

const WIDTHS = [375, 1024, 1440];
const SCROLL_ROUTES = [
  { path: "/", label: "start" },
  { path: "/tag/2026-10-29", label: "preisspanne" },
  { path: "/tag/2026-10-22", label: "flotte-voll" },
];

const SCREENSHOT_ROUTES = [
  { path: "/tag/2026-10-29", name: "tag-2026-10-29" },
  { path: "/tag/2026-10-22", name: "tag-2026-10-22" },
];

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), scrollWidth: [], methodikClsDesktop: null, screenshots: [] };

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const { path, label } of [
      ...SCROLL_ROUTES,
      { path: "/tag/2026-10-06", label: "abend-hoch" },
      { path: "/tag/2026-10-25", label: "abend-tief" },
      { path: "/tag/2026-10-31", label: "ws" },
      { path: "/tag/2026-10-08", label: "serie" },
      { path: "/tag/2026-10-04", label: "keine" },
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120_000 });
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      report.scrollWidth.push({ width, path, label, scrollWidth: m.sw, clientWidth: m.cw, ok: m.sw <= m.cw + 1 });
      console.log(width, label, m.sw, m.cw, m.sw <= m.cw + 1 ? "ok" : "FAIL");
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/methodik`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(5000);
  report.methodikClsDesktop = await page.evaluate(() => {
    let cls = 0;
    for (const entry of performance.getEntriesByType("layout-shift")) {
      if (!entry.hadRecentInput) cls += entry.value;
    }
    return Math.round(cls * 1000) / 1000;
  });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 500 ? 740 : 900 });
    for (const { path, name } of SCREENSHOT_ROUTES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120_000 });
      const file = `/opt/cursor/artifacts/r4-${name}-${width}.png`;
      await page.screenshot({ path: file, fullPage: width >= 1024 });
      report.screenshots.push(file);
    }
  }

  await browser.close();

  try {
    const lh = execSync(
      `npx --yes lighthouse@12.8.2 "${BASE}/methodik" --only-categories=performance --form-factor=desktop --screenEmulation.disabled --quiet --output=json --chrome-flags="--headless --no-sandbox"`,
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
    );
    const j = JSON.parse(lh);
    report.methodikClsLighthouseDesktop =
      Math.round((j.audits["cumulative-layout-shift"]?.numericValue ?? 0) * 1000) / 1000;
  } catch {
    /* optional */
  }

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
