import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const out = "/opt/cursor/artifacts/screenshots";
const widths = [1280, 375];
const themes = ["light", "dark"];

async function setTheme(page, theme) {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const theme of themes) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await setTheme(page, theme);

    for (const [slug, url] of [
      ["heute", `${base}/?blick=heute&x=1#uebersicht`],
      ["30tage", `${base}/?blick=30tage&x=1#uebersicht`],
    ]) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector("#uebersicht", { timeout: 120_000 });
      await page.screenshot({ path: `${out}/pr58_home_${slug}_${theme}_${width}.png`, fullPage: true });
    }

    await page.goto(`${base}/site?view=netz&scenario=supermarkt`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const input = page.locator("#site-sim-limit-kw");
    await input.scrollIntoViewIfNeeded({ timeout: 60_000 });

    for (const [badge, limit] of [
      ["netzdienlich", 90],
      ["belastend", 40],
      ["neutral", 200],
    ]) {
      await input.fill(String(limit));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/pr58_sim_${badge}_${theme}_${width}.png`, fullPage: true });
    }

    await page.close();
  }
}

await browser.close();
console.log("pr58 screenshots ok");
