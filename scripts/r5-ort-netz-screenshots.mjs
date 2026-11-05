import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";

const ROUTES = [
  { slug: "r5-ort-netz-land", path: "/ort?sicht=netz&scenario=land" },
  { slug: "r5-ort-netz-stadt", path: "/ort?sicht=netz&scenario=stadt" },
];

const VIEWPORTS = [
  { tag: "375", width: 375, height: 740 },
  { tag: "1440", width: 1440, height: 900 },
];

async function assertStyled(page) {
  const ok = await page.evaluate(() => {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const font = getComputedStyle(document.body).fontFamily;
    const paper = document.querySelector(".day-paper");
    const paperBg = paper ? getComputedStyle(paper).backgroundColor : "";
    return (
      links.length > 0 &&
      font.length > 3 &&
      !font.includes("Times New Roman") &&
      paperBg !== "" &&
      paperBg !== "rgba(0, 0, 0, 0)"
    );
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
      await page.waitForSelector(".ort-archetypen", { timeout: 60_000 });
      await page.evaluate(() => document.fonts.ready);
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
