import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "review-artifacts/home-day-panel-20261107-v3/screens");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";

async function gotoWithPanel(page) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
    const count = await page.locator('[data-testid="start-day-panel"]').count();
    if (count > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("start-day-panel not found after retries");
}

async function applyTheme(page, theme) {
  await page.evaluate((mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", mode);
  }, theme);
  await new Promise((resolve) => setTimeout(resolve, 400));
}

let panelMetrics375Dark = null;

async function shot(page, name, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await gotoWithPanel(page);
  await applyTheme(page, theme);
  const panel = page.locator('[data-testid="start-day-panel"]');
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  await panel.screenshot({ path: join(OUT, `${name}-${width}-${theme}.png`) });
  if (width === 375 && theme === "dark") {
    panelMetrics375Dark = await panel.boundingBox();
  }
  const chart = page.locator('[data-testid="start-day-chart"]');
  if ((await chart.count()) > 0) {
    await chart.screenshot({ path: join(OUT, `${name}-chart-${width}-${theme}.png`) });
  }
}

async function shotDisclosureOpen(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await gotoWithPanel(page);
  await applyTheme(page, theme);
  const panel = page.locator('[data-testid="start-day-panel"]');
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  const details = panel.locator("details");
  if ((await details.count()) > 0) {
    await details.evaluate((el) => {
      el.open = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  await panel.screenshot({
    path: join(OUT, `start-day-panel-disclosure-open-${width}-${theme}.png`),
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const width of [375, 1280]) {
    for (const theme of ["dark", "light"]) {
      await shot(page, "start-day-panel", width, theme);
    }
  }
  for (const width of [375, 1280]) {
    for (const theme of ["dark", "light"]) {
      await shotDisclosureOpen(page, width, theme);
    }
  }
  const manifest = {
    out: OUT,
    baseUrl: BASE,
    panel375DarkHeightPx: panelMetrics375Dark?.height ?? null,
    panel375DarkWidthPx: panelMetrics375Dark?.width ?? null,
    panel375DarkHeightTargetMaxPx: 360,
    panel375DarkHeightOk:
      panelMetrics375Dark?.height != null ? panelMetrics375Dark.height <= 360 : null,
  };
  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
