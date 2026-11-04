import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots";

const ROUTES = [
  { slug: "r2-ort-projekt", path: "/ort?sicht=projekt" },
  { slug: "r2-ort-netz", path: "/ort?sicht=netz" },
  { slug: "r2-methodik", path: "/methodik" },
  { slug: "r2-impressum", path: "/impressum" },
  {
    slug: "r2-artikel",
    path: "/beitraege/warum-grossspeicher-das-netz-flexibler-machen",
  },
];

const VIEWPORTS = [
  { tag: "375", width: 375, height: 740 },
  { tag: "1440", width: 1440, height: 900 },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(1200);
      const file = join(OUT, `${route.slug}-${vp.tag}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      console.log(file, overflow ? "OVERFLOW" : "ok");
    }
    await page.close();
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
