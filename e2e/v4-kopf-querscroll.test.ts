/**
 * @jest-environment node
 */
/**
 * R4: Kopf darf bei keiner Viewport-Breite horizontal überstehen.
 * Run: RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/v4-kopf-querscroll.test.ts
 */
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

const WIDTHS = [375, 768, 1024, 1440] as const;

/** Fixture days: Abendspitze hoch/tief, Preisspanne, Wind+Sonne, Flotte voll, Serie, unauffällig + Start. */
const ROUTES: Array<{ path: string; label: string }> = [
  { path: "/", label: "start" },
  { path: "/tag/2026-10-06", label: "abendspitze-hoch" },
  { path: "/tag/2026-10-25", label: "abendspitze-tief" },
  { path: "/tag/2026-10-29", label: "preisspanne" },
  { path: "/tag/2026-10-31", label: "ws-share" },
  { path: "/tag/2026-10-22", label: "flotte-voll" },
  { path: "/tag/2026-10-08", label: "serie" },
  { path: "/tag/2026-10-04", label: "unauffaellig" },
];

async function withPage(run: (page: Page) => Promise<void>) {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await run(page);
  } finally {
    await browser?.close();
  }
}

async function scrollMetrics(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

describe("v4 kopf horizontal overflow (R4)", () => {
  jest.setTimeout(300_000);

  (runBrowser ? it : it.skip)("scrollWidth equals clientWidth at all gate widths", async () => {
    await withPage(async (page) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const { path, label } of ROUTES) {
          await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120_000 });
          const { scrollWidth, clientWidth } = await scrollMetrics(page);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
          if (scrollWidth > clientWidth + 1) {
            throw new Error(`${label} @${width}px: scroll ${scrollWidth} > client ${clientWidth}`);
          }
        }
      }
    });
  });
});
