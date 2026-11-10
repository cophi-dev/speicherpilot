import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const out = "/opt/cursor/artifacts";
await mkdir(out, { recursive: true });

const base = process.env.RESEARCH_QA_BASE ?? "http://127.0.0.1:3000";

const browser = await chromium.launch();

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function shot(page, path, clip) {
  await page.screenshot({ path: `${out}/${path}`, fullPage: !clip, clip });
}

for (const { theme } of [{ theme: "dark" }, { theme: "light" }]) {
  for (const w of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 2200 : 1400 } });
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await setTheme(page, theme);
    await page.reload({ waitUntil: "networkidle" });
    await shot(page, `start-${w}-${theme}-full.png`);
    await page.close();
  }
}

for (const { theme } of [{ theme: "dark" }, { theme: "light" }]) {
  for (const w of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 2200 : 1400 } });
    await page.goto(`${base}/vision`, { waitUntil: "networkidle" });
    await setTheme(page, theme);
    await page.evaluate(() => localStorage.removeItem("speicherpilot-vision-guess-skip"));
    await page.reload({ waitUntil: "networkidle" });
    await shot(page, `vision-${w}-${theme}-full.png`);
    await page.close();
  }
}

// vision guess after vertical drag (fold ~900px)
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(`${base}/vision`, { waitUntil: "networkidle" });
  await setTheme(page, "dark");
  await page.evaluate(() => localStorage.removeItem("speicherpilot-vision-guess-skip"));
  await page.reload({ waitUntil: "networkidle" });
  const handle = page.locator('svg[aria-label="Vision Sättigung Oktober"] rect[style*="touch-action: none"]').first();
  const box = await handle.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 80, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  await shot(page, "vision_390_dark_guess_fold.png");
  await page.close();
}

// start 1440 dark fold
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await setTheme(page, "dark");
  await page.reload({ waitUntil: "networkidle" });
  await shot(page, "start_1440_dark_fold.png");
  await page.close();
}

// start 390 light week+saturation crop
{
  const page = await browser.newPage({ viewport: { width: 390, height: 2200 } });
  await page.goto(`${base}/#woche`, { waitUntil: "networkidle" });
  await setTheme(page, "light");
  await page.reload({ waitUntil: "networkidle" });
  const woche = await page.locator("#woche").boundingBox();
  const sat = await page.locator("section", { hasText: "SÄTTIGUNG" }).first().boundingBox();
  if (woche && sat) {
    const y = Math.min(woche.y, sat.y);
    const h = Math.max(woche.y + woche.height, sat.y + sat.height) - y;
    await shot(page, "start_390_light_week_saturation.png", { x: 0, y, width: 390, height: Math.min(h, 1200) });
  }
  await page.close();
}

await browser.close();
console.log("artifacts written to", out);
