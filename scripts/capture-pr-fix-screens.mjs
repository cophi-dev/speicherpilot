#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const tag = process.env.SCREENSHOT_TAG ?? "vorher";
const out = process.env.SCREENSHOT_OUT ?? "/opt/cursor/artifacts/nav-subnav-dedup";

const widths = [1280, 390];
const themes = ["light", "dark"];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      window.localStorage.setItem("speicherpilot-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
      window.localStorage.setItem("speicherpilot-theme", "light");
    }
  }, theme);
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const theme of themes) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
    await setTheme(page, theme);
    await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
    const header = page.locator("header.site-header");
    await header.screenshot({ path: `${out}/${tag}_header_${theme}_${width}.png` });
    console.log(`${out}/${tag}_header_${theme}_${width}.png`);

    const chart = page.getByRole("img", { name: /Sättigungskurve/i });
    await chart.scrollIntoViewIfNeeded({ timeout: 60_000 });
    const box = await chart.boundingBox();
    if (box) {
      await page.screenshot({
        path: `${out}/${tag}_saettigung_${theme}_${width}.png`,
        clip: { x: box.x - 8, y: box.y - 8, width: Math.min(box.width + 16, width), height: box.height + 16 },
      });
      console.log(`${out}/${tag}_saettigung_${theme}_${width}.png`);
    }
    await page.close();
  }
}

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const path of ["/", "/methodik"]) {
    const name = path === "/" ? "home" : "methodik";
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(200);
    const file = `${out}/${tag}_${name}_${width}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(file);
  }
  await page.close();
}

await browser.close();
console.log(`done: ${tag}`);
