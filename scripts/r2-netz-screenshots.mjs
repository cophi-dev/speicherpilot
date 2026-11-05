import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots";

const ROUTES = [
  { slug: "r2-ort-projekt", path: "/ort?sicht=projekt" },
  { slug: "r2-ort-netz-land", path: "/ort?sicht=netz&scenario=land" },
  { slug: "r2-ort-netz-stadt", path: "/ort?sicht=netz&scenario=stadt" },
  { slug: "r2-home-ort", path: "/#ort-kapitel" },
  { slug: "r2-methodik", path: "/methodik" },
];

const VIEWPORTS = [
  { tag: "375", width: 375, height: 740 },
  { tag: "1440", width: 1440, height: 900 },
];

async function assertStyled(page) {
  const ok = await page.evaluate(() => {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const font = getComputedStyle(document.body).fontFamily;
    return links.length > 0 && font.length > 3 && font !== "serif";
  });
  if (!ok) {
    throw new Error("CSS/fonts may not be loaded");
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(1500);
      await assertStyled(page);
      const file = join(OUT, `${route.slug}-${vp.tag}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    }
    await page.close();
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
