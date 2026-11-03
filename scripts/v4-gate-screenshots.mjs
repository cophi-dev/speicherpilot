import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots/v4-gates";

const ROUTES = [
  { name: "home", path: "/" },
  { name: "tag", path: "/tag/2026-11-02" },
  { name: "ort-projekt", path: "/ort?sicht=projekt" },
  { name: "ort-netz", path: "/ort?sicht=netz" },
  { name: "methodik", path: "/methodik" },
  { name: "beitraege", path: "/beitraege" },
];

const VIEWPORTS = [
  { tag: "1440", width: 1440, height: 900 },
  { tag: "375", width: 375, height: 740 },
] ;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const theme of ["light", "dark"]) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      if (theme === "dark") {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.addInitScript(() => {
          document.documentElement.classList.add("dark");
        });
      }
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 120_000 });
        await page.waitForTimeout(800);
        const file = join(OUT, `${route.name}-${vp.tag}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log("saved", file);
      }
      await page.close();
    }
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
