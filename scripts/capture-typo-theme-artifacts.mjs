#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const out = process.env.SCREENSHOT_OUT ?? "/opt/cursor/artifacts/typo-theme";

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

for (const [w, h, tag] of [
  [1280, 900, "1280"],
  [390, 844, "390"],
]) {
  for (const [theme, suffix] of [
    ["light", "hell"],
    ["dark", "dunkel"],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
    await setTheme(page, theme);
    await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
    const file = `${out}/home_${tag}_${suffix}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(file);
    await page.close();
  }
}

await browser.close();
