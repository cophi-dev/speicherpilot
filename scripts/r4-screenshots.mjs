import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots";

const ROUTES = [
  { slug: "r4-methodik", path: "/methodik" },
  { slug: "r4-beitraege-extern", path: "/beitraege#extern-gelesen" },
  { slug: "r4-impressum", path: "/impressum" },
  { slug: "r4-ort-projekt", path: "/ort?sicht=projekt" },
  { slug: "r4-home-luecke", path: "/" },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 740 } });
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(800);
    if (route.slug === "r4-beitraege-extern") {
      await page.locator("#extern-gelesen").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }
    if (route.slug === "r4-home-luecke") {
      await page.locator(".v4-luecke-compact-foot, .v4-luecke-figure").first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }
    const file = join(OUT, `${route.slug}-375.png`);
    await page.screenshot({ path: file, fullPage: route.slug !== "r4-home-luecke" });
    console.log(file);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
