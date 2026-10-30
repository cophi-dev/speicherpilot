import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "opt/cursor/artifacts/screenshots");
mkdirSync(outDir, { recursive: true });

const shots = [
  ["home-30tage-1440", "/?blick=30tage#uebersicht", 1440],
  ["home-30tage-375", "/?blick=30tage#uebersicht", 375],
  ["live-2026-10-11-1440", "/live?tag=2026-10-11", 1440],
  ["live-2026-10-11-375", "/live?tag=2026-10-11", 375],
  ["site-testnetz-1440", "/site?view=netz#testnetz-n1", 1440],
  ["site-testnetz-375", "/site?view=netz#testnetz-n1", 375],
];

const browser = await chromium.launch();
for (const [name, path, width] of shots) {
  const page = await browser.newPage({ viewport: { width, height: width <= 400 ? 900 : 1000 } });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
  if (path.includes("#")) {
    await page.evaluate(() => {
      const hash = window.location.hash;
      if (hash) {
        document.querySelector(hash)?.scrollIntoView();
      }
    });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  console.log("saved", name);
}
await browser.close();
