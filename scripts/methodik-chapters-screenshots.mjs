import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), ".github/pr-screenshots");
mkdirSync(outDir, { recursive: true });

const shots = [
  ["methodik-desktop-1440-collapsed", "/methodik", 1440, null],
  ["methodik-mobile-375-collapsed", "/methodik", 375, null],
  ["methodik-desktop-1440-grossspeicher", "/methodik#grossspeicher", 1440, "grossspeicher"],
  ["methodik-mobile-375-grossspeicher", "/methodik#grossspeicher", 375, "grossspeicher"],
  ["site-netz-desktop-1440", "/site?view=netz#testnetz-n1", 1440, "testnetz-n1"],
  ["site-netz-mobile-375", "/site?view=netz#testnetz-n1", 375, "testnetz-n1"],
];

const browser = await chromium.launch();
for (const [name, path, width, hashId] of shots) {
  const page = await browser.newPage({ viewport: { width, height: width <= 400 ? 900 : 1200 } });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
  if (hashId) {
    await page.evaluate((id) => {
      const target = document.getElementById(id);
      if (!target) return;
      let current = target;
      while (current) {
        if (current.tagName === "DETAILS") {
          current.open = true;
        }
        current = current.parentElement;
      }
      target.scrollIntoView({ block: "start" });
    }, hashId);
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log("saved", name, "height", height);
  await page.close();
}
await browser.close();
