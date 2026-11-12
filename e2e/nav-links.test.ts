/**
 * @jest-environment node
 *
 * Navigation acceptance: header, mobile drawer, footer, logo, in-page anchors.
 * Run: RUN_BROWSER_TESTS=1 pnpm exec next build && RUN_BROWSER_TESTS=1 pnpm exec next start -p 3000 &
 *      RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/nav-links.test.ts
 */
import { chromium, type Browser, type Page, type ViewportSize } from "playwright";

import { SITE_MAIN_NAV, SITE_MOBILE_EXTRA_NAV } from "@/lib/siteNav";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

const VIEWPORTS: ViewportSize[] = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
];

const IN_PAGE_ANCHOR_CHECKS = [
  { startPath: "/", linkSelector: 'footer a[href="/methodik#quellen"]', fragment: "quellen" },
  { startPath: "/", linkSelector: 'a[href="/methodik#annahmen"]', fragment: "annahmen" },
] as const;

async function withPage(viewport: ViewportSize, run: (page: Page) => Promise<void>) {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport });
    await run(page);
  } finally {
    await browser?.close();
  }
}

async function gotoOk(page: Page, path: string) {
  let lastStatus = 599;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    lastStatus = response?.status() ?? 599;
    if (lastStatus < 400) {
      break;
    }
    await page.waitForTimeout(500);
  }
  expect(lastStatus).toBeLessThan(400);
  expect(await page.getByText("Seite nicht gefunden").count()).toBe(0);
}

async function expectNoNotFound(page: Page) {
  expect(await page.getByText("Seite nicht gefunden").count()).toBe(0);
}

async function openMobileMenu(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const menuButton = page.getByRole("button", { name: "Menü" });
  await menuButton.waitFor({ state: "visible" });
  await menuButton.click();
  await page.locator("#site-mobile-nav").waitFor({ state: "visible" });
}

async function expectMenuClosed(page: Page) {
  expect(await page.locator("#site-mobile-nav").count()).toBe(0);
}

describe("navigation links e2e", () => {
  jest.setTimeout(300_000);

  for (const viewport of VIEWPORTS) {
    const label = `${viewport.width}px`;

    (runBrowser ? it : it.skip)(`desktop header nav resolves at ${label}`, async () => {
      if (viewport.width < 1024) {
        return;
      }
      await withPage(viewport, async (page) => {
        await gotoOk(page, "/");
        const nav = page.locator("#site-desktop-nav");
        await nav.waitFor({ state: "visible" });
        const count = await nav.getByRole("link").count();
        expect(count).toBe(SITE_MAIN_NAV.length);
        for (let i = 0; i < count; i += 1) {
          const link = nav.getByRole("link").nth(i);
          const href = await link.getAttribute("href");
          expect(href).toBeTruthy();
          const targetPath = new URL(href!, BASE).pathname;
          await Promise.all([
            targetPath === "/"
              ? page.waitForLoadState("domcontentloaded")
              : page.waitForURL((url) => url.pathname === targetPath, { timeout: 60_000 }),
            link.click(),
          ]);
          await expectNoNotFound(page);
          if (targetPath !== "/") {
            expect(new URL(page.url()).pathname).toBe(targetPath);
          }
          await gotoOk(page, "/");
        }
      });
    });

    (runBrowser ? it : it.skip)(`mobile drawer includes main nav + Woche at ${label}`, async () => {
      if (viewport.width >= 1024) {
        return;
      }
      await withPage(viewport, async (page) => {
        await gotoOk(page, "/");
        await openMobileMenu(page);
        const nav = page.locator("#site-mobile-nav");
        const labels = await nav.getByRole("link").allTextContents();
        for (const item of SITE_MAIN_NAV) {
          expect(labels).toContain(item.label);
        }
        for (const extra of SITE_MOBILE_EXTRA_NAV) {
          expect(labels).toContain(extra.label);
        }
        expect(await nav.getByRole("link").count()).toBe(SITE_MAIN_NAV.length + SITE_MOBILE_EXTRA_NAV.length);

        for (const item of SITE_MAIN_NAV) {
          await gotoOk(page, "/");
          await openMobileMenu(page);
          const drawer = page.locator("#site-mobile-nav");
          await drawer.getByRole("link", { name: item.label, exact: true }).click();
          await page.waitForLoadState("domcontentloaded");
          await expectMenuClosed(page);
          await expectNoNotFound(page);
        }

        await gotoOk(page, "/");
        await openMobileMenu(page);
        await page.locator("#site-mobile-nav").getByRole("link", { name: "Woche", exact: true }).click();
        await page.waitForLoadState("domcontentloaded");
        await expectMenuClosed(page);
        await page.locator("#woche").waitFor({ state: "visible" });
      });
    });

    (runBrowser ? it : it.skip)(`footer legal links at ${label}`, async () => {
      await withPage(viewport, async (page) => {
        await gotoOk(page, "/");
        const footer = page.locator("footer .legal-footer");
        const links = footer.getByRole("link");
        const hrefs = await links.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
        expect(hrefs.length).toBeGreaterThanOrEqual(3);
        for (const href of hrefs) {
          const response = await page.goto(href, { waitUntil: "domcontentloaded" });
          expect(response?.status()).toBeLessThan(400);
          await expectNoNotFound(page);
        }
      });
    });

    (runBrowser ? it : it.skip)(`brand logo returns home at ${label}`, async () => {
      await withPage(viewport, async (page) => {
        await gotoOk(page, "/methodik");
        await page.locator("a.brand-lockup").click();
        await page.waitForURL((url) => url.pathname === "/");
        await expectNoNotFound(page);
      });
    });
  }

  for (const viewport of VIEWPORTS) {
    (runBrowser ? it : it.skip)(`in-page anchors scroll to ids at ${viewport.width}px`, async () => {
      await withPage(viewport, async (page) => {
        for (const check of IN_PAGE_ANCHOR_CHECKS) {
          await gotoOk(page, check.startPath);
          const link = page.locator(check.linkSelector).first();
          await link.waitFor({ state: "visible", timeout: 60_000 });
          await link.click();
          await page.waitForFunction(
            (id) => {
              const el = document.getElementById(id);
              if (!el) return false;
              const r = el.getBoundingClientRect();
              return r.top >= 0 && r.top < window.innerHeight * 0.85;
            },
            check.fragment,
            { timeout: 15_000 }
          );
          await page.locator(`#${check.fragment}`).waitFor({ state: "visible" });
        }
      });
    });
  }

  (runBrowser ? it : it.skip)("marks current page in desktop and mobile nav", async () => {
    await withPage({ width: 1280, height: 900 }, async (page) => {
      await gotoOk(page, "/vision");
      const desktopVision = page.locator("#site-desktop-nav").getByRole("link", { name: "Vision", exact: true });
      expect(await desktopVision.getAttribute("aria-current")).toBe("page");
    });
    await withPage({ width: 390, height: 844 }, async (page) => {
      await gotoOk(page, "/vision");
      await openMobileMenu(page);
      const mobileVision = page.locator("#site-mobile-nav").getByRole("link", { name: "Vision", exact: true });
      expect(await mobileVision.getAttribute("aria-current")).toBe("page");
    });
  });
});
