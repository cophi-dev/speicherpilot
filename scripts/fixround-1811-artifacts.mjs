import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const metrics = [];

async function audit(page, name, url, viewport, colorScheme) {
  await page.setViewportSize(viewport);
  if (colorScheme) {
    await page.emulateMedia({ colorScheme });
  }
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (url.startsWith("/knoten")) {
    await page.getByTestId("knoten-page").waitFor({ state: "visible", timeout: 60000 });
  }
  const shot = `${name}-${viewport.width}-${colorScheme ?? "light"}.png`;
  await page.screenshot({ path: `${OUT}/${shot}`, fullPage: true });
  const svgEmpty = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll("svg")];
    let worst = 0;
    for (const svg of svgs) {
      const r = svg.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) continue;
      const plot = svg.querySelector("rect[fill], polyline, path[d]");
      if (!plot) {
        worst = Math.max(worst, 1);
        continue;
      }
      const pr = plot.getBoundingClientRect();
      const used = (pr.width * pr.height) / Math.max(1, r.width * r.height);
      worst = Math.max(worst, 1 - used);
    }
    return Math.round(worst * 100);
  });
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  const minAxis = await page.evaluate(() => {
    const texts = [...document.querySelectorAll("svg text")];
    const sizes = texts.map((t) => parseFloat(getComputedStyle(t).fontSize)).filter(Boolean);
    return sizes.length ? Math.min(...sizes) : null;
  });
  metrics.push({ name, url, viewport: viewport.width, colorScheme: colorScheme ?? "light", svgEmptyPct: svgEmpty, pageOverflow, minSvgTextPx: minAxis });
}

const page = await browser.newPage();
for (const cs of ["light", "dark"]) {
  await audit(page, "knoten-default", "/knoten", { width: 390, height: 844 }, cs);
  await audit(page, "knoten-default", "/knoten", { width: 1280, height: 900 }, cs);
  await audit(page, "knoten-stadt-x5", "/knoten?typ=stadt&k=5&tag=2026-11-13", { width: 390, height: 844 }, cs);
}
await audit(page, "methodik", "/methodik", { width: 390, height: 844 }, "light");

await browser.close();
await writeFile(`${OUT}/fixround-1811-metrics.json`, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));