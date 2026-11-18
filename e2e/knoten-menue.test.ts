/**
 * @jest-environment node
 * RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/knoten-menue.test.ts
 */
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
] as const;

async function withPage(viewport: { width: number; height: number }, run: (page: Page) => Promise<void>) {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport });
    await run(page);
  } finally {
    await browser?.close();
  }
}

describe("knoten menü A e2e", () => {
  jest.setTimeout(300_000);

  for (const viewport of VIEWPORTS) {
    (runBrowser ? it : it.skip)(`renders /knoten at ${viewport.width}px`, async () => {
      await withPage(viewport, async (page) => {
        const res = await page.goto(`${BASE}/knoten`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        expect(res?.status()).toBeLessThan(400);
        await page.getByTestId("knoten-page").waitFor({ state: "visible" });
        await page.getByTestId("simulator-subnav").waitFor({ state: "visible" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        expect(overflow).toBe(false);
      });
    });
  }

  (runBrowser ? it : it.skip)("deep link stadt ×5 13.11. reproduces fazit", async () => {
    await withPage({ width: 1280, height: 900 }, async (page) => {
      await page.goto(`${BASE}/knoten?typ=stadt&k=5&tag=2026-11-13`, { waitUntil: "domcontentloaded" });
      const fazit = await page.getByTestId("knoten-fazit").innerText();
      expect(fazit).toContain("13");
      expect(fazit).toMatch(/20,8/);
    });
  });

  (runBrowser ? it : it.skip)("redirects legacy paths", async () => {
    await withPage({ width: 390, height: 844 }, async (page) => {
      for (const path of ["/ort", "/netz", "/simulator"]) {
        const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
        const url = new URL(page.url());
        if (path === "/simulator") {
          expect(url.pathname).toBe("/kompromiss");
        } else {
          expect(url.pathname).toBe("/knoten");
        }
        expect(res?.status()).toBeLessThan(400);
      }
    });
  });
});