import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const tag = process.env.SCREENSHOT_TAG ?? "nachher";
const out = "/opt/cursor/artifacts/screenshots";
const widths = [1280, 390];
const themes = ["light", "dark"];

async function setTheme(page, theme) {
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const theme of themes) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 1400 : 1100 } });
    await setTheme(page, theme);

    const header = page.locator("header").first();
    await header.scrollIntoViewIfNeeded({ timeout: 60_000 });
    await page.screenshot({
      path: `${out}/${tag}_home_datum_${theme}_${width}.png`,
      clip: await header.boundingBox(),
    });

  const saturationHeading = page.getByRole("heading", { name: /brachte ab ×5/i });
    await saturationHeading.scrollIntoViewIfNeeded({ timeout: 60_000 });
    const section = saturationHeading.locator("xpath=ancestor::section[1]");
    await page.screenshot({
      path: `${out}/${tag}_home_saettigung_${theme}_${width}.png`,
      clip: await section.boundingBox(),
    });

    await page.screenshot({
      path: `${out}/${tag}_home_full_${theme}_${width}.png`,
      fullPage: true,
    });

    await page.close();
  }
}

await browser.close();
console.log(`${tag} screenshots ok`);
