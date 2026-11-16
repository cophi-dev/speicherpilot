/**
 * @jest-environment node
 * RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/monat-svg-type.test.ts
 */
import { chromium, type Browser } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";
const WIDTHS = [1280, 1024, 768, 390] as const;
const ROUTES = ["/monat/2026-10", "/monat"] as const;
const CHARTS = ["monat-v1-hero", "monat-v1-stunden", "monat-v1-ueberschuss"] as const;

async function minSvgTextPx(page: import("playwright").Page) {
  return page.evaluate(() => {
    const sel =
      '[data-testid="monat-v1-hero"] svg text, [data-testid="monat-v1-stunden"] svg text, [data-testid="monat-v1-ueberschuss"] svg text';
    let min = Number.POSITIVE_INFINITY;
    for (const el of document.querySelectorAll(sel)) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (Number.isFinite(fs) && fs > 0) {
        min = Math.min(min, fs);
      }
    }
    return min === Number.POSITIVE_INFINITY ? 0 : min;
  });
}

async function chartWrapOverflow(page: import("playwright").Page) {
  return page.evaluate((ids) => {
    const out: Record<string, { clientWidth: number; scrollWidth: number }> = {};
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) {
        out[id] = { clientWidth: 0, scrollWidth: 0 };
        continue;
      }
      out[id] = { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth };
    }
    return out;
  }, [...CHARTS]);
}

describe("/monat SVG label size", () => {
  jest.setTimeout(300_000);

  (runBrowser ? it : it.skip)("Typo ≥12 px, kein Chart-Wrapper-Overflow", async () => {
    let browser: Browser | null = null;
    const report: Record<string, unknown> = {};
    try {
      browser = await chromium.launch();
      for (const route of ROUTES) {
        const routeReport: Record<string, unknown> = {};
        for (const width of WIDTHS) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 120_000 });
          await page.waitForSelector('[data-testid="monat-v1-hero"] svg text', { timeout: 60_000 });
          const minPx = await minSvgTextPx(page);
          const wraps = await chartWrapOverflow(page);
          for (const id of CHARTS) {
            const w = wraps[id]!;
            expect(w.scrollWidth).toBeLessThanOrEqual(w.clientWidth + 1);
          }
          expect(minPx).toBeGreaterThanOrEqual(11.99);
          routeReport[String(width)] = { minSvgTextPx: minPx, chartWraps: wraps };
          await page.close();
        }
        report[route] = routeReport;
      }
    } finally {
      await browser?.close();
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
  });
});