#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";

async function shot(page, name, width, colorScheme) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme });
  await page.goto(`${BASE}${name === "vision" ? "/vision" : "/"}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const file = join(OUT, `${name}_${width}_${colorScheme}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function sectionShots(page, width, colorScheme) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  const week = await page.locator("#woche").screenshot({
    path: join(OUT, `week_${width}_${colorScheme}.png`),
  });
  const sat = await page.locator("text=SÄTTIGUNG").locator("..").screenshot({
    path: join(OUT, `saturation_${width}_${colorScheme}.png`),
  });
  return [week, sat];
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const w of [390, 1440]) {
  for (const scheme of ["dark", "light"]) {
    await shot(page, "home", w, scheme);
    await shot(page, "vision", w, scheme);
    if (w === 390) await sectionShots(page, w, scheme);
  }
}
await browser.close();
console.log("Saved screenshots to", OUT);
