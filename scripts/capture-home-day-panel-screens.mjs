import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "review-artifacts/home-day-panel-20261107/screens");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function shot(page, name, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem("speicherpilot-theme", mode);
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const panel = page.locator('[data-testid="start-day-panel"]');
  await panel.waitFor({ timeout: 60_000 });
  await panel.screenshot({ path: join(OUT, `${name}-${width}-${theme}.png`) });
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
  const html = await page.content();
  const hasPanel = html.includes('data-testid="start-day-panel"');
  const sha = await page.locator('meta[name="build-provenance"]').getAttribute("content").catch(() => null);
  console.log(JSON.stringify({ hasPanel, sha, out: OUT }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
