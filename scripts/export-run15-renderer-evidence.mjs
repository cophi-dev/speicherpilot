#!/usr/bin/env node
/**
 * Vollständige gerenderte SVG/DOM-Belege (keine pointsHead-Kürzung), Marginaltabellen, Tooltip-Proben.
 * Requires Playwright + laufender Prod-Server (SITE_E2E_BASE_URL).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT =
  process.env.RUN15_RENDERER_OUT ??
  join(process.env.RUN15_ABNAHME_OUT ?? "/cursor/stores/self/launch-run15-abnahme-20261107", "EXPORTS/renderer");

const MONTH_SCENARIOS = [1, 2, 5, 10].flatMap((f) =>
  ["ueberschuss", "spitze", "markt"].map((s) => ({
    name: `monat-x${f}-${s}`,
    path: `/monat/2026-10?faktor=${f}&fahrweise=${s}`,
  })),
);

const TAG_SCENARIOS = [
  { name: "tag-2026-10-24", path: "/tag/2026-10-24?faktor=2&fahrweise=spitze", sampleEvery: 1 },
  { name: "tag-2026-10-25-dst", path: "/tag/2026-10-25?faktor=2&fahrweise=spitze", sampleEvery: 1 },
  { name: "tag-2026-10-29", path: "/tag/2026-10-29?faktor=1&fahrweise=ueberschuss", sampleEvery: 1 },
];

function tooltipIndices(n, isMonth) {
  const pick = new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]);
  if (isMonth) {
    for (const day of [24, 25, 29]) {
      const approx = (day - 1) * (n / 31);
      pick.add(Math.min(n - 1, Math.max(0, Math.round(approx))));
    }
  }
  return [...pick].sort((a, b) => a - b);
}

async function extractDom(page) {
  return page.evaluate(() => {
    const panels = [...document.querySelectorAll(".v4-fleet-ts-panel")].map((p) => ({
      title: p.querySelector(".v4-fleet-ts-panel-title")?.textContent?.trim() ?? null,
      unit: p.querySelector(".v4-fleet-ts-panel-unit")?.textContent?.trim() ?? null,
      svg: {
        width: p.querySelector("svg")?.getAttribute("width") ?? null,
        height: p.querySelector("svg")?.getAttribute("height") ?? null,
        viewBox: p.querySelector("svg")?.getAttribute("viewBox") ?? null,
        class: p.querySelector("svg")?.getAttribute("class") ?? null,
      },
    }));
    const polylines = [...document.querySelectorAll(".v4-fleet-ts-svg polyline")].map((el) => {
      const pts = el.getAttribute("points") ?? "";
      return {
        class: el.getAttribute("class"),
        pointCount: pts ? pts.trim().split(/\s+/).length : 0,
        points: pts,
      };
    });
    const circles = [...document.querySelectorAll(".v4-fleet-ts-svg circle")].map((el) => ({
      class: el.getAttribute("class"),
      cx: el.getAttribute("cx"),
      cy: el.getAttribute("cy"),
      r: el.getAttribute("r"),
    }));
    const scroll = document.querySelector(".v4-fleet-ts-scroll");
    const marginalRows = [...document.querySelectorAll(".v4-fleet-marginal-table tr")].map((tr) =>
      [...tr.querySelectorAll("th,td")].map((c) => c.textContent?.trim() ?? ""),
    );
    const compareRows = [...document.querySelectorAll(".v4-fleet-compare-table tr")].map((tr) =>
      [...tr.querySelectorAll("th,td")].map((c) => c.textContent?.trim() ?? ""),
    );
    return {
      caption: document.querySelector(".v4-fleet-caption-main")?.textContent?.trim() ?? null,
      kpis: [...document.querySelectorAll(".v4-fleet-kpis dd")].map((el) => el.textContent?.trim()),
      panels,
      polylines,
      circles,
      scrollClientWidth: scroll?.clientWidth ?? null,
      ticks: [...document.querySelectorAll(".v4-fleet-ts-tick")].map((el) => el.textContent?.trim()),
      marginalRows,
      compareRows,
    };
  });
}

async function sampleTooltips(page, n) {
  const scroll = page.locator(".v4-fleet-ts-scroll");
  await scroll.waitFor({ state: "visible" });
  const box = await scroll.boundingBox();
  if (!box || n < 1) {
    return [];
  }
  const isMonth = n > 200;
  const indices = tooltipIndices(n, isMonth);
  const samples = [];
  for (const j of indices) {
    const x = (j + 0.5) * (box.width / n);
    await scroll.hover({ position: { x: Math.min(box.width - 2, Math.max(2, x)), y: box.height / 2 } });
    await page.waitForTimeout(80);
    const text = (await page.locator('[data-testid="fleet-ts-tooltip"]').textContent())?.trim() ?? null;
    samples.push({ index: j, tooltip: text });
  }
  return samples;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const all = [];

  for (const spec of [...MONTH_SCENARIOS, ...TAG_SCENARIOS]) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}${spec.path}`, { waitUntil: "networkidle", timeout: 180_000 });
    await page.waitForSelector(".v4-fleet-ts-wrap svg", { timeout: 120_000 });
    const dom = await extractDom(page);
    const n = dom.polylines.find((p) => p.class?.includes("v4-fleet-line-r"))?.pointCount ?? 0;
    const tooltips = await sampleTooltips(page, n);
    const record = {
      name: spec.name,
      path: spec.path,
      url: page.url(),
      intervalCount: n,
      dom,
      tooltips,
    };
    writeFileSync(join(OUT, `${spec.name}.json`), JSON.stringify(record, null, 0));
    all.push({ name: spec.name, intervalCount: n, polylineBytes: dom.polylines.reduce((s, p) => s + (p.points?.length ?? 0), 0), tooltipSamples: tooltips.length });
    await page.close();
  }

  await browser.close();
  writeFileSync(join(OUT, "renderer-index.json"), JSON.stringify({ at: new Date().toISOString(), base: BASE, scenarios: all }, null, 2));
  console.log("Wrote renderer evidence to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
