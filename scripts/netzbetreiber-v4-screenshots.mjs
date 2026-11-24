import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "review-artifacts/netzbetreiber-v4/screens");
mkdirSync(outDir, { recursive: true });

const shots = [
  ["netzbetreiber-v4-light-1280", "/netzbetreiber", 1280, "light"],
  ["netzbetreiber-v4-dark-1280", "/netzbetreiber", 1280, "dark"],
  ["netzbetreiber-v4-light-390", "/netzbetreiber", 390, "light"],
  ["netzbetreiber-v4-dark-390", "/netzbetreiber", 390, "dark"],
  ["tag-v4-light-1280-compare", "/tag/2026-11-23", 1280, "light"],
];

const browser = await chromium.launch();
for (const [name, path, width, theme] of shots) {
  const page = await browser.newPage({ viewport: { width, height: width <= 400 ? 2200 : 1600 } });
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  console.log("saved", name);
}
await browser.close();