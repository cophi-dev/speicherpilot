/**
 * @jest-environment node
 *
 * /tag layout raster + details (Chromium; WebKit wenn Host-Libs vorhanden — optional RUN_WEBKIT_TESTS=1).
 * RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/tag-layout-raster.test.ts
 */
import { chromium, webkit, type Browser, type Page } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

const VIEWPORTS = [
  { width: 1280, height: 900, label: "1280" },
  { width: 1024, height: 900, label: "1024" },
  { width: 768, height: 900, label: "768" },
  { width: 390, height: 844, label: "390" },
] as const;

async function launchLayoutBrowser(): Promise<Browser> {
  if (process.env.RUN_WEBKIT_TESTS === "1") {
    try {
      return await webkit.launch();
    } catch {
      // Host ohne WebKit-Libs (siehe SPEC Risiko 1) — Chromium deckt dieselben CSS-Regeln ab.
    }
  }
  return chromium.launch();
}

async function withLayoutBrowser(run: (page: Page) => Promise<void>) {
  let browser: Browser | null = null;
  try {
    browser = await launchLayoutBrowser();
    const page = await browser.newPage();
    await run(page);
  } finally {
    await browser?.close();
  }
}

async function assertNoOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

describe("/tag layout raster", () => {
  jest.setTimeout(300_000);

  (runBrowser ? it : it.skip)("no horizontal overflow at gate widths (tag + home)", async () => {
    await withLayoutBrowser(async (page) => {
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        for (const path of ["/tag/2026-10-25", "/"]) {
          await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
          await assertNoOverflow(page);
        }
      }
    });
  });

  (runBrowser ? it : it.skip)("details summary meets 44px tap target and shows focus ring", async () => {
    await withLayoutBrowser(async (page) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/tag/2026-10-25`, { waitUntil: "domcontentloaded" });

      const surplusChip = page.locator(".v4-chip").filter({ hasText: "Modellschätzung" });
      expect(await surplusChip.count()).toBeGreaterThan(0);

      const soGerechnet = page.locator("details.v4-so-gerechnet > summary");
      expect(await soGerechnet.count()).toBeGreaterThan(0);
      const box = await soGerechnet.first().boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      await soGerechnet.first().focus();
      const outline = await soGerechnet.first().evaluate((el) => getComputedStyle(el).outlineColor);
      expect(outline).toMatch(/b4532a|180,\s*83,\s*42/i);

      const preisMore = page.locator('.v4-content details[class*="more"] > summary');
      expect(await preisMore.count()).toBeGreaterThan(0);
      const preisList = await preisMore.first().evaluate((el) => getComputedStyle(el).listStyleType);
      expect(preisList).toBe("none");
    });
  });
});
