/**
 * @jest-environment node
 * RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/monat-svg-type.test.ts
 */
import { chromium, type Browser } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";
const WIDTHS = [1280, 1024, 768, 390] as const;

async function minSvgTextPx(page: import("playwright").Page) {
  return page.evaluate(() => {
    const sel = '[data-testid="monat-v1-hero"] svg text, [data-testid="monat-v1-stunden"] svg text, [data-testid="monat-v1-ueberschuss"] svg text';
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

describe("/monat SVG label size", () => {
  jest.setTimeout(180_000);

  (runBrowser ? it : it.skip)("alle SVG-Texte ≥ 12 px", async () => {
    let browser: Browser | null = null;
    const measured: Record<string, number> = {};
    try {
      browser = await chromium.launch();
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${BASE}/monat/2026-10`, { waitUntil: "networkidle", timeout: 120_000 });
        await page.waitForSelector('[data-testid="monat-v1-hero"] svg text', { timeout: 60_000 });
        const textCount = await page.locator('[data-testid="monat-v1-hero"] svg text').count();
        expect(textCount).toBeGreaterThan(5);
        const minPx = await minSvgTextPx(page);
        measured[String(width)] = minPx;
        expect(minPx).toBeGreaterThanOrEqual(11.99);
        await page.close();
      }
    } finally {
      await browser?.close();
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ minSvgTextPx: measured }));
  });
});