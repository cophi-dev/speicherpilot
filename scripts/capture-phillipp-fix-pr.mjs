#!/usr/bin/env node
/**
 * RUN_BROWSER_TESTS=1 node scripts/capture-phillipp-fix-pr.mjs
 * SCREENSHOT_TAG=nachher SCREENSHOT_BASE=http://127.0.0.1:3000
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const tag = process.env.SCREENSHOT_TAG ?? "nachher";
const out = process.env.SCREENSHOT_OUT ?? "/opt/cursor/artifacts";
const url = `${base}/tag/2026-11-16?faktor=2&fahrweise=spitze`;

async function scrollFleet(page) {
  const fleet = page.locator(".v4-chapter-fleet-day");
  await fleet.scrollIntoViewIfNeeded({ timeout: 120_000 });
  await page.waitForSelector(".v4-fleet-ts-interactive", { timeout: 120_000 });
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const width of [1280, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 180_000 });
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(150);
  const yBefore = await page.evaluate(() => window.scrollY);
  const pill5 = page.locator('.v4-fleet-pill').filter({ hasText: "×5" }).first();
  if (await pill5.count()) {
    await pill5.click();
    await page.waitForURL(/faktor=5/, { timeout: 30_000 });
    await page.waitForTimeout(300);
  }
  const yAfter = await page.evaluate(() => window.scrollY);
  await page.screenshot({
    path: `${out}/${tag}-p1-scroll-after-factor-switch-${width}.png`,
    fullPage: false,
  });
  console.log(`${tag} scrollY ${width}: before=${yBefore} after=${yAfter}`);

  await page.goto(url.replace("faktor=2", "faktor=5"), { waitUntil: "networkidle", timeout: 180_000 });
  await scrollFleet(page);

  // Punkt 1/2: Controls + Referenzflotte
  const controls = page.locator(".v4-fleet-controls");
  await controls.screenshot({
    path: `${out}/${tag}-p1-p2-fleet-controls-${width}.png`,
  });

  if (width === 390) {
    const ref = page.locator(".v4-fleet-energy-context");
    await ref.screenshot({ path: `${out}/${tag}-p2-referenzflotte-390.png` });
  }
  if (width === 1280) {
    const ref = page.locator(".v4-fleet-energy-context");
    await ref.screenshot({ path: `${out}/${tag}-p2-referenzflotte-1280.png` });
  }

  // Punkt 3: unterhalb Graph — kein Kompromiss-Block
  const komp = page.locator("#kapitel-kompromiss-tag");
  await page.locator(".v4-fleet-ts-interactive").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${out}/${tag}-p3-unter-graph-${width}.png`,
    fullPage: false,
    clip: { x: 0, y: 0, width, height: 900 },
  });
  console.log(`kompromiss block count on tag: ${await komp.count()}`);

  // Punkt 4: Hover auf Chart
  const probe = page.locator(".v4-fleet-ts-scroll").first();
  const box = await probe.boundingBox();
  if (box) {
    const hoverX = box.x + 42 + box.width * 0.45;
    const hoverY = box.y + box.height * 0.35;
    await page.mouse.move(hoverX, hoverY);
    await page.waitForTimeout(200);
    await probe.screenshot({
      path: `${out}/${tag}-p4-chart-hover-${width}.png`,
    });
  }

  await page.close();
}

// Monat: Kompromiss-Teaser vorhanden
const monatPage = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
await monatPage.goto(`${base}/monat/2026-10?faktor=2&fahrweise=spitze`, {
  waitUntil: "networkidle",
  timeout: 180_000,
});
const monatTeaser = monatPage.locator("#kapitel-kompromiss-start");
await monatTeaser.scrollIntoViewIfNeeded({ timeout: 60_000 });
await monatTeaser.screenshot({ path: `${out}/${tag}-p3-monat-kompromiss-1280.png` });

await browser.close();
console.log(`done ${tag}`);