import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(path, viewport, url, options = {}) {
  await page.setViewportSize(viewport);
  await page.emulateMedia(options.colorScheme ? { colorScheme: options.colorScheme } : {});
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("knoten-page").waitFor({ state: "visible", timeout: 60_000 });
  await page.screenshot({ path: `${OUT}/${path}`, fullPage: true });
}

await shot("knoten-1280-light.png", { width: 1280, height: 900 }, "/knoten");
await shot("knoten-390-light.png", { width: 390, height: 844 }, "/knoten");
await shot("knoten-1280-stadt-x5-1311.png", { width: 1280, height: 900 }, "/knoten?typ=stadt&k=5&tag=2026-11-13");
await shot("knoten-nav-1280.png", { width: 1280, height: 900 }, "/knoten");
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/knoten`, { waitUntil: "domcontentloaded" });
await page.getByTestId("knoten-page").waitFor({ state: "visible" });
await page.locator("#site-desktop-nav").screenshot({ path: `${OUT}/knoten-nav-desktop-1280.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/knoten`, { waitUntil: "domcontentloaded" });
await page.getByTestId("knoten-page").waitFor({ state: "visible" });
await page.getByRole("button", { name: "Menü" }).click();
await page.locator("#site-mobile-nav").screenshot({ path: `${OUT}/knoten-nav-mobile-390.png` });

await browser.close();
console.log("Wrote artifacts to", OUT);