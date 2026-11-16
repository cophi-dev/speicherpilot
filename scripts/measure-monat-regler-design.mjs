#!/usr/bin/env node
/**
 * Design-Messungen für docs/audit-2026-11/monat-paket-a/BERICHT.md (Muss 1–4).
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3010";
const OUT = join(process.cwd(), "docs/audit-2026-11/monat-paket-a/measures-nachbesserung.json");

async function measure(viewport, dark, url) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport,
    colorScheme: dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[data-testid="monat-regler-chart"] svg', { timeout: 60_000 });
  const data = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="monat-regler-chart"] svg');
    const hero = document.querySelector('[data-testid="monat-regler-hero"]');
    const chartTop = svg?.getBoundingClientRect().top ?? 0;
    const texts = [...(svg?.querySelectorAll("text") ?? [])].map((t) => {
      const fs = window.getComputedStyle(t).fontSize;
      return { fs, y: t.getAttribute("y") };
    });
    const yTicks = texts.filter((t) => t.fs);
    const labelFs = yTicks[0] ? parseFloat(yTicks[0].fs) : null;
    const viewBox = svg?.getAttribute("viewBox")?.split(" ").map(Number) ?? [];
    const sliderEl = document.querySelector('[data-testid="monat-regler-slider"]');
    const sliderVisible = sliderEl ? window.getComputedStyle(sliderEl).display : "none";
    return {
      chartTop,
      svgViewBox: { w: viewBox[2], h: viewBox[3] },
      svgClient: svg
        ? { w: svg.clientWidth, h: svg.clientHeight }
        : null,
      yLabelFontPx: labelFs,
      heroTop: hero?.getBoundingClientRect().top ?? 0,
      sliderRowDisplay: sliderVisible,
    };
  });
  await browser.close();
  return data;
}

const results = {
  measuredAt: new Date().toISOString(),
  baseUrl: BASE,
  headSha: (await import("node:child_process")).execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  views: {
    mobile390Spitze: await measure({ width: 390, height: 844 }, false, "/monat/2026-10"),
    tablet768: await measure({ width: 768, height: 900 }, false, "/monat/2026-10"),
    mobile390Markt: await measure(
      { width: 390, height: 844 },
      true,
      "/monat/2026-10?faktor=10&fahrweise=markt",
    ),
  },
};

writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));