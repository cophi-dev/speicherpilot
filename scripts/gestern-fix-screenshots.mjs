import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const tag = process.env.SCREENSHOT_TAG ?? "nachher";
const out = "/opt/cursor/artifacts/screenshots";

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

for (const theme of ["light", "dark"]) {
  const page390 = await browser.newPage({ viewport: { width: 390, height: 1400 } });
  await setTheme(page390, theme);

  const datumBlock = page390.getByRole("heading", { level: 1 }).locator("xpath=..");
  await datumBlock.scrollIntoViewIfNeeded({ timeout: 60_000 });
  await page390.screenshot({
    path: `${out}/${tag}_home_datum_${theme}_390.png`,
    clip: await datumBlock.boundingBox(),
  });

  const chart = page390.getByRole("img", { name: /Sättigungskurve/i });
  await chart.scrollIntoViewIfNeeded({ timeout: 60_000 });
  await page390.screenshot({
    path: `${out}/${tag}_home_saettigung_${theme}_390.png`,
    clip: await chart.boundingBox(),
  });
  await page390.close();

  for (const width of [1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    await setTheme(page, theme);
    const chartWide = page.getByRole("img", { name: /Sättigungskurve/i });
    await chartWide.scrollIntoViewIfNeeded({ timeout: 60_000 });
    await page.screenshot({
      path: `${out}/${tag}_home_saettigung_${theme}_${width}.png`,
      clip: await chartWide.boundingBox(),
    });
    await page.close();
  }
}

await browser.close();
console.log(`${tag} screenshots ok`);
