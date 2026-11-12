/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.SITE_HEADER_OVERFLOW_BASE_URL ?? "http://127.0.0.1:3000";
const PATHS = ["/", "/live", "/netz", "/site", "/methodik", "/monat"] as const;
const WIDTHS = [640, 768, 800, 900, 1024, 1100, 1440] as const;

describe("site header layout", () => {
  it("uses lg breakpoint for inline navigation", () => {
    const src = readFileSync(join(process.cwd(), "components/site-shell.tsx"), "utf8");
    expect(src).toMatch(/matchMedia\("\(min-width: 1024px\)"\)/);
    expect(src).toMatch(/isLgNav[\s\S]*id="site-desktop-nav"[\s\S]*aria-label="Hauptnavigation"/);
    expect(src).toMatch(/whitespace-nowrap/);
    expect(src).toMatch(/SITE_MAIN_NAV/);
    const navSrc = readFileSync(join(process.cwd(), "lib/siteNav.ts"), "utf8");
    expect(navSrc).toMatch(/label: "Monat"/);
    expect(src).toMatch(/lg:hidden[\s\S]*aria-expanded=\{menuOpen\}/);
  });
});

describe("site header horizontal overflow", () => {
  const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

  (runBrowser ? it : it.skip)("does not exceed viewport width on primary routes", async () => {
    const browser = await chromium.launch();
    const failures: string[] = [];
    try {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        for (const path of PATHS) {
          await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
          const metrics = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }));
          if (metrics.scrollWidth > metrics.innerWidth + 1) {
            failures.push(`${path}@${width}px scroll=${metrics.scrollWidth} inner=${metrics.innerWidth}`);
          }
          if (width >= 1024) {
            const navLinks = page.locator("header #site-desktop-nav a");
            const count = await navLinks.count();
            if (count > 0) {
              const wraps = await navLinks.evaluateAll((nodes) =>
                nodes.map((node) => {
                  const el = node as HTMLElement;
                  return el.scrollHeight > el.clientHeight + 1;
                })
              );
              if (wraps.some(Boolean)) {
                failures.push(`${path}@${width}px nav link wrapped`);
              }
            }
          }
        }
        await page.close();
      }
    } finally {
      await browser.close();
    }
    expect(failures).toEqual([]);
  }, 180_000);
});
