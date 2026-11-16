#!/usr/bin/env node
/**
 * RUN: SITE_E2E_BASE_URL=http://127.0.0.1:3000 node scripts/restliste-124-artifacts.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = join(process.cwd(), "review-artifacts", "restliste-124");
const ROUTES = ["/", "/tag/2026-11-15", "/monat", "/monat/2026-10"];
const WIDTHS = [1280, 390, 1024];

async function measure(page) {
  return page.evaluate(() => {
    let minPx = 999;
    for (const el of document.querySelectorAll("svg text")) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (Number.isFinite(fs) && fs > 0) minPx = Math.min(minPx, fs);
    }
    return {
      minTypoPx: minPx === 999 ? null : minPx,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

const browser = await chromium.launch();
const report = [];
try {
  await mkdir(OUT, { recursive: true });
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 1400 } });
      const url = `${BASE}${route}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(500);
      const slug = route.replace(/\//g, "_").replace(/^_/, "") || "start";
      const shot = join(OUT, `${slug}-${width}.png`);
      await page.screenshot({ path: shot, fullPage: width !== 1024 });
      if (route.includes("monat") && width === 1024) {
        const hero = page.locator('[data-testid="monat-v1-hero"]');
        if (await hero.count()) {
          await hero.screenshot({ path: join(OUT, `monat-restlast-chart-1024.png`) });
        }
      }
      const m = await measure(page);
      report.push({ route, width, ...m, screenshot: shot });
      await page.close();
    }
  }
  await writeFile(join(OUT, "measurements.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${report.length} rows to ${OUT}`);
} finally {
  await browser.close();
}