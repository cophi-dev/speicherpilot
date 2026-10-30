import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "opt/cursor/artifacts/screenshots");
mkdirSync(outDir, { recursive: true });

const shots = [
  ["home-light-1280", "/", 1280, "light"],
  ["home-dark-1280", "/", 1280, "dark"],
  ["home-light-375", "/", 375, "light"],
  ["home-dark-375", "/", 375, "dark"],
  ["live-light-1280", "/live?tag=2026-10-25", 1280, "light"],
  ["live-dark-1280", "/live?tag=2026-10-25", 1280, "dark"],
  ["live-light-375", "/live?tag=2026-10-25", 375, "light"],
  ["live-dark-375", "/live?tag=2026-10-25", 375, "dark"],
  ["site-projekt-light-1280", "/site?view=projekt", 1280, "light"],
  ["site-projekt-dark-1280", "/site?view=projekt", 1280, "dark"],
  ["site-netz-light-1280", "/site?view=netz", 1280, "light"],
  ["site-netz-dark-1280", "/site?view=netz", 1280, "dark"],
  ["site-projekt-light-375", "/site?view=projekt", 375, "light"],
  ["site-projekt-dark-375", "/site?view=projekt", 375, "dark"],
  ["site-netz-light-375", "/site?view=netz", 375, "light"],
  ["site-netz-dark-375", "/site?view=netz", 375, "dark"],
  ["methodik-light-1280", "/methodik", 1280, "light"],
  ["methodik-dark-1280", "/methodik", 1280, "dark"],
  ["methodik-light-375", "/methodik", 375, "light"],
  ["methodik-dark-375", "/methodik", 375, "dark"],
];

const browser = await chromium.launch();
for (const [name, path, width, theme] of shots) {
  const page = await browser.newPage({ viewport: { width, height: width <= 400 ? 812 : 900 } });
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  console.log("saved", name);
}
await browser.close();
