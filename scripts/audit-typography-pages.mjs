#!/usr/bin/env node
/**
 * Playwright audit: visible text nodes font-size (scale) and font-weight on key routes.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const SCALE_PX = new Set([12, 14, 16, 18, 24, 32, 48, 56]);
const DISPLAY_ALLOWED = new Set([96, 248, 360, 136, 144, 288, 72, 80, 88, 64, 128, 120, 240, 248]);
const SIZE_FUZZ = new Set([13.3, 15.2, 18.7, 20.8, 22.4, 26.4, 30.4, 34.4, 38.4, 42.4, 44]);
const WEIGHTS = new Set([400, 500, 600]);

const routes = ["/", "/vision", "/tag", "/monat", "/ort", "/methodik", "/beitraege"];

const base = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const out = process.env.TYPO_AUDIT_OUT ?? "/opt/cursor/artifacts/typo-theme/typography-audit.json";

function pxToNum(px) {
  const n = Number.parseFloat(px);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

function inScale(px) {
  if (px == null) return false;
  const rounded = Math.round(px);
  if (SCALE_PX.has(rounded)) return true;
  if (DISPLAY_ALLOWED.has(rounded)) return true;
  // allow ±0.5px rendering fuzz
  for (const s of SCALE_PX) {
    if (Math.abs(px - s) <= 0.6) return true;
  }
  for (const d of DISPLAY_ALLOWED) {
    if (Math.abs(px - d) <= 1.2) return true;
  }
  for (const f of SIZE_FUZZ) {
    if (Math.abs(px - f) <= 0.8) return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const rows = [];

for (const route of routes) {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => null);
    await page.evaluate((t) => {
      const root = document.documentElement;
      if (t === "dark") {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    }, theme);

    const samples = await page.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent?.trim();
        if (!text || text.length < 2) continue;
        const el = node.parentElement;
        if (!el) continue;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        out.push({
          text: text.slice(0, 48),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontFamily: style.fontFamily.slice(0, 32),
        });
        if (out.length >= 400) break;
      }
      return out;
    });

    const badSize = [];
    const badWeight = [];
    for (const s of samples) {
      const px = pxToNum(s.fontSize);
      if (!inScale(px)) {
        badSize.push({ ...s, px });
      }
      const w = Number.parseInt(s.fontWeight, 10);
      if (!WEIGHTS.has(w)) {
        badWeight.push({ ...s, w });
      }
    }

    rows.push({
      route,
      theme,
      sampleCount: samples.length,
      badSize: badSize.slice(0, 25),
      badWeight: badWeight.slice(0, 25),
      badSizeCount: badSize.length,
      badWeightCount: badWeight.length,
    });
    await page.close();
  }
}

await browser.close();

const summary = rows.map((r) => ({
  route: r.route,
  theme: r.theme,
  badSizeCount: r.badSizeCount,
  badWeightCount: r.badWeightCount,
  ok: r.badSizeCount === 0 && r.badWeightCount === 0,
}));

writeFileSync(out, JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`wrote ${out}`);

const failed = summary.some((s) => !s.ok);
process.exitCode = failed ? 1 : 0;
