import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "review-artifacts/home-day-panel-20261107-v2/screens");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

let panelMetrics375Dark = null;

async function shot(page, name, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", mode);
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const panel = page.locator('[data-testid="start-day-panel"]');
  await panel.waitFor({ timeout: 60_000 });
  await panel.screenshot({ path: join(OUT, `${name}-${width}-${theme}.png`) });
  if (width === 375 && theme === "dark") {
    panelMetrics375Dark = await panel.boundingBox();
  }
  const chart = page.locator('[data-testid="start-day-chart"]');
  await chart.screenshot({ path: join(OUT, `${name}-chart-${width}-${theme}.png`) });
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
  const manifest = {
    out: OUT,
    panel375DarkHeightPx: panelMetrics375Dark?.height ?? null,
    panel375DarkWidthPx: panelMetrics375Dark?.width ?? null,
  };
  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
