import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "https://www.speicherpilot.app";
const OUT = join(process.cwd(), process.env.OUT_DIR ?? "docs/audit-2026-11-premium/screens/vorher");
const ROUTES = (process.env.ROUTES ?? "/,/tag,/monat,/ort,/methodik,/beitraege").split(",");
const FULL = process.env.FULL === "1";

function slug(path) {
  return path === "/" ? "start" : path.replace(/^\//, "").replace(/[/?=&]/g, "-");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/local/bin/google-chrome" });
  for (const theme of ["light", "dark"]) {
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: theme,
      });
      await ctx.addInitScript((mode) => {
        localStorage.setItem("speicherpilot-theme", mode);
      }, theme);
      const page = await ctx.newPage();
      for (const path of ROUTES) {
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
        await page.evaluate((mode) => {
          document.documentElement.classList.toggle("dark", mode === "dark");
          document.documentElement.style.colorScheme = mode;
        }, theme);
        await page.waitForTimeout(400);
        const name = `${slug(path)}-${width}-${theme}`;
        await page.screenshot({ path: join(OUT, `${name}-fold.png`) });
        if (FULL) {
          await page.screenshot({ path: join(OUT, `${name}-full.png`), fullPage: true });
        }
        console.log(name, page.url());
      }
      await ctx.close();
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
