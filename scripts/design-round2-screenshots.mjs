import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const shots = [
  { name: "home-hero-x5-1280", url: "/", w: 1280, fn: async (p) => p.locator('[class*="heroAside"]').getByRole("group", { name: "Flottenstufe" }).getByRole("button", { name: "×5" }).click() },
  { name: "home-hero-x10-390", url: "/", w: 390, fn: async (p) => p.locator('[class*="heroAside"]').getByRole("group", { name: "Flottenstufe" }).getByRole("button", { name: "×10" }).click() },
  { name: "home-week-x5-390", url: "/", w: 390, fn: async (p) => {
      await p.locator("#woche").scrollIntoViewIfNeeded();
      await p.getByRole("group", { name: "Woche Flottenstufe" }).getByRole("button", { name: "×5" }).click();
    } },
  { name: "kw46-fahrweise-390", url: "/beitraege/netz-updates-kw-46", w: 390 },
  { name: "simulator-21-1280", url: "/simulator", w: 1280, fn: async (p) => p.locator('[data-testid="simulator-g3-21"]').scrollIntoViewIfNeeded() },
  { name: "simulator-pareto-1280", url: "/simulator", w: 1280, fn: async (p) => p.locator('[data-testid="simulator-pareto"]').scrollIntoViewIfNeeded() },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const s of shots) {
  await page.setViewportSize({ width: s.w, height: s.w < 500 ? 2000 : 1400 });
  await page.goto(`${base}${s.url}`, { waitUntil: "domcontentloaded" });
  if (s.fn) await s.fn(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${s.name}.png`, fullPage: s.url !== "/" });
}
await browser.close();
console.log("saved", shots.length, "screenshots to", outDir);