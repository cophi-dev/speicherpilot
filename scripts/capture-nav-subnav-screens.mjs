#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const tag = process.env.SCREENSHOT_TAG ?? "vorher";
const out = process.env.SCREENSHOT_OUT ?? "/opt/cursor/artifacts/nav-subnav-dedup";

const targets = [
  { path: "/", name: "home" },
  { path: "/methodik", name: "methodik" },
];

const widths = [1280, 390];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const { path, name } of targets) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(300);
    const file = `${out}/${tag}_${name}_${width}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(file);
  }
  await page.close();
}

await browser.close();
console.log(`done: ${tag}`);
