#!/usr/bin/env node
/** Visual smoke for launch checklist — requires `npm run start` on SITE_E2E_BASE_URL. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/launch-screenshots";
const TAG = process.env.LAUNCH_TAG ?? "2026-10-29";

const MONAT_PAGES = [
  { path: "/monat", name: "monat-default-redirect", expectMonthInUrl: "2026-10" },
  { path: "/monat/2026-10", name: "monat-okt-explicit", expectMonthInUrl: "2026-10" },
  { path: "/monat/2026-11", name: "monat-nov-partial", expectMonthInUrl: "2026-11" },
];

const SHOTS = [
  { path: `/tag/${TAG}`, name: "tag-beispiel", themes: ["light", "dark"], fullPage: true },
  { path: "/ort?sicht=netz", name: "ort-netz", themes: ["light", "dark"], fullPage: false, scrollChart: true },
  { path: "/", name: "start", themes: ["light"], fullPage: true },
];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function overflowMetrics(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
  }));
}

async function monatChecks(page, expectMonth) {
  return page.evaluate((monthKey) => {
    const plot = document.querySelector(".v4-monat-chart-plot");
    const plotRect = plot?.getBoundingClientRect();
    const axis = document.querySelector(".v4-monat-chart-x span");
    const axisFont = axis ? getComputedStyle(axis).fontSize : "";
    const h2 = document.querySelector("#monat-graph-title")?.textContent ?? "";
    const urlMonth = location.pathname.match(/\/monat\/(\d{4}-\d{2})/)?.[1] ?? "";
    const firstTableDate = document.querySelector(".v4-monat-graph-table tbody tr td")?.textContent ?? "";
    return {
      h2,
      urlMonth,
      firstTableDate,
      plotHeightPx: plotRect ? Math.round(plotRect.height) : 0,
      axisFontSize: axisFont,
      monthKey,
    };
  }, expectMonth);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), files: [], overflow: [], monthChecks: [] };

  const browser = await chromium.launch();

  for (const width of [375, 1280]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width < 500 ? 900 : 960 });

    for (const monat of MONAT_PAGES) {
      for (const theme of ["light", "dark"]) {
        await page.goto(`${BASE}${monat.path}`, { waitUntil: "networkidle", timeout: 120_000 });
        await setTheme(page, theme);
        await page.waitForSelector(".v4-monat-chart-plot", { timeout: 60_000 });
        const url = page.url();
        if (monat.expectMonthInUrl && !url.includes(`/monat/${monat.expectMonthInUrl}`)) {
          report.monthChecks.push({
            error: `expected /monat/${monat.expectMonthInUrl}, got ${url}`,
            path: monat.path,
            width,
            theme,
          });
        }
        const check = await monatChecks(page, monat.expectMonthInUrl);
        const overflow = await overflowMetrics(page);
        report.monthChecks.push({ ...check, ...overflow, path: monat.path, theme, width });
        if (overflow.scrollWidth > overflow.clientWidth + 1) {
          report.overflow.push({ ...overflow, path: monat.path, theme, width });
        }
        const monatFile = `${OUT}/${monat.name}-${theme}-${width}px.png`;
        await page.screenshot({ path: monatFile, fullPage: true });
        report.files.push(monatFile);
      }
    }

    for (const shot of SHOTS) {
      for (const theme of shot.themes) {
        await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle", timeout: 120_000 });
        await setTheme(page, theme);
        if (shot.scrollChart) {
          await page.locator(".ort-archetype-chart").first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
        } else {
          await page.waitForTimeout(400);
        }
        const overflow = await overflowMetrics(page);
        const file = `${OUT}/${shot.name}-${theme}-${width}px.png`;
        await page.screenshot({ path: file, fullPage: shot.fullPage ?? true });
        report.files.push(file);
        if (overflow.scrollWidth > overflow.clientWidth + 1) {
          report.overflow.push({ ...overflow, path: shot.path, theme, width });
        }
      }
    }
    await page.close();
  }
  await browser.close();

  writeFileSync("/opt/cursor/artifacts/launch-screenshots-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
