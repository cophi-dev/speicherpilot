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

const shots = [
  { path: "/", w: 390, theme: "dark", file: "start_390_dark_full.png" },
  { path: "/", w: 390, theme: "light", file: "start_390_light_full.png" },
  { path: "/", w: 1440, theme: "dark", file: "start_1440_dark_full.png" },
  { path: "/vision", w: 390, theme: "dark", file: "vision_390_dark_full.png", vision: true },
  { path: "/vision", w: 390, theme: "light", file: "vision_390_light_full.png", vision: true },
  { path: "/vision", w: 1440, theme: "dark", file: "vision_1440_dark_full.png", vision: true },
];

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.w === 390 ? 2200 : 1400 } });
  if (s.vision) {
    await page.addInitScript(() => window.localStorage.setItem("speicherpilot-vision-guess-skip", "1"));
  }
  await page.goto(`${base}${s.path}`, { waitUntil: "networkidle" });
  await setTheme(page, s.theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${s.file}`, fullPage: true });
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 2200 } });
  await page.goto(`${base}/#woche`, { waitUntil: "networkidle" });
  await setTheme(page, "light");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const w = await page.locator("#woche").boundingBox();
  const s = await page.getByText("SÄTTIGUNG").first().boundingBox();
  if (w && s) {
    const y = Math.min(w.y, s.y);
    const h = Math.max(w.y + w.height, s.y + s.height) - y;
    await page.screenshot({ path: `${out}/start_390_light_week_saturation.png`, clip: { x: 0, y, width: 390, height: Math.min(h, 1100) } });
  }
  await page.close();
}

await browser.close();
console.log("captures ok");
