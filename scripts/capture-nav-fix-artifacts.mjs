#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const out = process.env.SCREENSHOT_OUT ?? "/opt/cursor/artifacts/nav-fix-package";

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

for (const [theme, suffix] of [
  ["light", "hell"],
  ["dark", "dunkel"],
]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await setTheme(page, theme);
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  const file = `${out}/home_390_${suffix}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(file);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await setTheme(page, "light");
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("button", { name: "Menü" }).click();
  await page.locator("#site-mobile-nav").waitFor({ state: "visible" });
  const file = `${out}/burger_390_hell_offen.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(file);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await setTheme(page, "light");
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  const file = `${out}/home_1280_hell.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(file);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await setTheme(page, "light");
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  await page.evaluate(() => window.scrollTo(0, 280));
  await page.waitForTimeout(200);
  const header = page.locator("header.site-header");
  const file = `${out}/header_390_hell_scrolled.png`;
  await header.screenshot({ path: file });
  console.log(file);

  const ariaLight = await page.getByRole("button", { name: /Helle Darstellung aktiv/ }).getAttribute("aria-label");
  await page.getByRole("button", { name: /Helle Darstellung aktiv/ }).click();
  await page.waitForTimeout(100);
  const ariaDark = await page
    .getByRole("button", { name: /Dunkle Darstellung aktiv/ })
    .getAttribute("aria-label");
  console.log("aria-label-light-state:", ariaLight);
  console.log("aria-label-dark-state:", ariaDark);
  await page.close();
}

await browser.close();
console.log(`done: ${out}`);
