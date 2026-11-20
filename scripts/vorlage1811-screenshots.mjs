import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/vorlage1811-r3";

const ROUTES = [
  {
    slug: "knoten-wind-2410-x2",
    path: "/knoten?typ=wind&tag=2026-10-24&k=2&belegung=voll",
  },
  {
    slug: "knoten-stadt-1311-x5",
    path: "/knoten?typ=stadt&tag=2026-11-13&k=5&belegung=voll",
  },
  {
    slug: "knoten-solar-x2",
    path: "/knoten?typ=solar&tag=2026-07-15&k=2&belegung=voll",
  },
  { slug: "kompromiss", path: "/kompromiss" },
  { slug: "methodik", path: "/methodik" },
];

const VIEWPORTS = [
  { tag: "390", width: 390, height: 844 },
  { tag: "1280", width: 1280, height: 900 },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      const url = `${BASE}${route.path}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(1500);
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