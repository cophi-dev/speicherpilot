/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.SITE_HEADER_OVERFLOW_BASE_URL ?? "http://127.0.0.1:3000";
const PATHS = ["/", "/live", "/netz", "/site", "/methodik"] as const;
const WIDTHS = [640, 768, 800, 900, 1024, 1100, 1440] as const;

describe("site header layout", () => {
  it("uses lg breakpoint for inline navigation", () => {
    const src = readFileSync(join(process.cwd(), "components/site-shell.tsx"), "utf8");
    expect(src).toMatch(/hidden[\s\S]*lg:flex[\s\S]*Hauptnavigation/);
    expect(src).toMatch(/whitespace-nowrap/);
    expect(src).toMatch(/lg:hidden[\s\S]*aria-expanded=\{menuOpen\}/);
  });
});

describe("site header horizontal overflow", () => {
  it("does not exceed viewport width on primary routes", async () => {
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
            const navLinks = page.locator("header nav.lg\\:flex a");
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
