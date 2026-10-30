/**
 * @jest-environment node
 */
/**
 * Playwright acceptance checks for Konzept v3.
 * Run with: RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/konzept-v3.test.ts
 */
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const WAIT = "load" as const;
const ROUTES = ["/", "/live", "/site", "/site?view=netz", "/methodik", "/szenarien", "/netz", "/blog", "/news"];
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

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

async function waitForApp(page: Page) {
  await page.waitForSelector("#uebersicht, .live-day-header", { timeout: 60_000 });
}

describe("konzept v3 e2e", () => {
  jest.setTimeout(180_000);

  (runBrowser ? it : it.skip)("serves core routes with HTTP 200 or redirect", async () => {
    await withPage(async (page) => {
      for (const route of ROUTES) {
        const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
        expect(response?.status()).toBeLessThan(400);
      }
    });
  });

  (runBrowser ? it : it.skip)("switches overview period without RSC fetch", async () => {
    await withPage(async (page) => {
      const rsc: string[] = [];
      page.on("request", (req) => {
        if (req.url().includes("_rsc=")) {
          rsc.push(req.url());
        }
      });
      await page.goto(`${BASE}/`, { waitUntil: WAIT });
      await waitForApp(page);
      rsc.length = 0;
      const start = Date.now();
      await page.locator("#uebersicht").getByRole("radio", { name: /^30 Tage$/i }).click();
      expect(Date.now() - start).toBeLessThan(500);
      expect(await page.locator("#uebersicht").getByRole("radio", { name: /^30 Tage$/i }).getAttribute("aria-checked")).toBe("true");
      expect(rsc.length).toBe(0);
    });
  });

  (runBrowser ? it : it.skip)("draws surplus bars with theme fill (not black)", async () => {
    await withPage(async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: WAIT });
      await waitForApp(page);
      await page.locator("#uebersicht").getByRole("radio", { name: /^30 Tage$/i }).click();
      await page.locator(".bar-absorbed").first().waitFor({ state: "visible" });
      const fill = await page.locator(".bar-absorbed").first().evaluate((el) => getComputedStyle(el).fill);
      expect(fill).not.toBe("rgb(0, 0, 0)");
      await page.locator('input[type="range"]').evaluate((el) => {
        (el as HTMLInputElement).value = "3";
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      const fill10 = await page.locator(".bar-absorbed").first().evaluate((el) => getComputedStyle(el).fill);
      expect(fill10).not.toBe("rgb(0, 0, 0)");
    });
  });

  (runBrowser ? it : it.skip)("live tag page shows date in heading", async () => {
    await withPage(async (page) => {
      await page.goto(`${BASE}/live?tag=2026-10-25`, { waitUntil: WAIT });
      await waitForApp(page);
      const text = await page.locator("#live-what-if").textContent();
      expect(text).toMatch(/25\. Oktober 2026/);
    });
  });

  (runBrowser ? it : it.skip)("previous day link works", async () => {
    await withPage(async (page) => {
      await page.goto(`${BASE}/live?tag=2026-10-25`, { waitUntil: WAIT });
      await waitForApp(page);
      await page.locator(".day-picker-nav").getByRole("link", { name: /Vortag/i }).click();
      await page.waitForURL(/tag=2026-10-24/);
    });
  });

  (runBrowser ? it : it.skip)("shows notice for out-of-range tag", async () => {
    await withPage(async (page) => {
      await page.goto(`${BASE}/live?tag=2020-01-01`, { waitUntil: WAIT });
      const text = await page.getByRole("status").first().textContent();
      expect(text).toMatch(/keine Daten/i);
    });
  });

  (runBrowser ? it : it.skip)("redirects legacy netz and szenarien routes", async () => {
    await withPage(async (page) => {
      await page.goto(`${BASE}/szenarien`, { waitUntil: WAIT });
      expect(page.url()).toMatch(/\/site\?view=netz/);
      await page.goto(`${BASE}/netz`, { waitUntil: WAIT });
      expect(page.url()).toMatch(/\/site\?view=netz/);
    });
  });
});
