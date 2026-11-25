import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "review-artifacts/netzbetreiber-v3/screens");
mkdirSync(outDir, { recursive: true });

const shots = [
  ["netzbetreiber-v3-light-1280", 1280, "light"],
  ["netzbetreiber-v3-dark-1280", 1280, "dark"],
  ["netzbetreiber-v3-light-390", 390, "light"],
  ["netzbetreiber-v3-dark-390", 390, "dark"],
];

const browser = await chromium.launch();
for (const [name, width, theme] of shots) {
  const page = await browser.newPage({ viewport: { width, height: width <= 400 ? 1200 : 1400 } });
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.goto(`${base}/netzbetreiber`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForSelector('[data-testid="netzbetreiber-page"]', { timeout: 120_000 });
  await page.waitForSelector('[data-testid="nb-map"]', { timeout: 120_000 });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  console.log("saved", name);
}
await browser.close();