/**
 * @jest-environment node
 * RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/restliste-124-chart-audit.test.ts
 */
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";
const WIDTHS = [1280, 1024, 768, 390] as const;
const ROUTES = ["/", "/tag/2026-11-15", "/monat", "/monat/2026-10"] as const;

type SvgAudit = {
  minTypoPx: number;
  textCollisions: number;
  pathCollisions: number;
  minContrast: number;
  pageOverflow: boolean;
  chartOverflows: string[];
};

async function auditPage(page: Page): Promise<SvgAudit> {
  return page.evaluate(() => {
    const chartRoots = Array.from(
      document.querySelectorAll(
        '[data-testid="monat-v1-hero"], [data-testid="monat-v1-stunden"], [data-testid="monat-v1-ueberschuss"], [data-testid="monat-regler-chart"], .v4-luecke-chart, [data-testid="preis-fenster"] svg',
      ),
    );
    const svgs =
      chartRoots.length > 0
        ? chartRoots
            .map((root) => (root.tagName === "svg" ? root : root.querySelector("svg")))
            .filter(Boolean)
        : [];
    const allSvgText = svgs.flatMap((svg) => Array.from(svg!.querySelectorAll("text")));

    let minTypo = Number.POSITIVE_INFINITY;
    for (const el of allSvgText) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (Number.isFinite(fs) && fs > 0) minTypo = Math.min(minTypo, fs);
    }

    const rgbParts = (css: string): [number, number, number] | null => {
      const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    };
    const lum = (rgb: [number, number, number]) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    };
    const contrastOf = (fg: string, bg: string) => {
      const a = rgbParts(fg);
      const b = rgbParts(bg);
      if (!a || !b) return null;
      const hi = Math.max(lum(a), lum(b));
      const lo = Math.min(lum(a), lum(b));
      return (hi + 0.05) / (lo + 0.05);
    };

    let minContrast = Number.POSITIVE_INFINITY;
    for (const el of allSvgText) {
      const fg = getComputedStyle(el).fill;
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const pageBg =
        bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" ? bodyBg : "rgb(246, 246, 243)";
      let bgResolved = pageBg;
      if (el.closest('[data-testid="monat-v1-ueberschuss"]')) {
        const rowRects = el.parentElement ? Array.from(el.parentElement.querySelectorAll("rect")) : [];
        const barRects = rowRects.filter((rect) => parseFloat(rect.getAttribute("width") ?? "0") > 8);
        const barRect = barRects.length > 1 ? barRects[barRects.length - 1] : barRects[0];
        const barFill = barRect ? getComputedStyle(barRect).fill : "";
        if (barFill && barFill.startsWith("rgb") && barFill !== "rgba(0, 0, 0, 0)") {
          bgResolved = barFill;
        }
      }
      if (!fg || fg === "none" || !fg.startsWith("rgb")) continue;
      if (fg === bgResolved) continue;
      const c = contrastOf(fg, bgResolved);
      if (c != null) minContrast = Math.min(minContrast, c);
    }

    let textCollisions = 0;
    for (const svg of svgs) {
      if (!svg) continue;
      const boxes = Array.from(svg.querySelectorAll("text"))
        .map((el) => el.getBoundingClientRect())
        .filter((b) => b.width > 0 && b.height > 0);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
            textCollisions++;
          }
        }
      }
    }

    const isAxisAnnotation = (el: SVGTextElement) => {
      const label = el.textContent?.trim() ?? "";
      if (/^×\d+$/.test(label)) return true;
      if (/^−?\d/.test(label) && label.length <= 8) return true;
      if (/^\d+[.,]\d/.test(label)) return true;
      return false;
    };

    let pathCollisions = 0;
    for (const svg of svgs) {
      if (!svg) continue;
      const paths = Array.from(svg.querySelectorAll("polyline, path, line"));
      const textEls = Array.from(svg.querySelectorAll("text")).filter(
        (el) => el.getBoundingClientRect().width > 0 && !isAxisAnnotation(el),
      );
      for (const el of textEls) {
        const box = el.getBoundingClientRect();
        for (const path of paths) {
          const pb = path.getBoundingClientRect();
          if (pb.width < 2 && pb.height < 2) continue;
          if (box.left < pb.right && box.right > pb.left && box.top < pb.bottom && box.bottom > pb.top) {
            pathCollisions++;
            break;
          }
        }
      }
    }

    const pageOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const chartOverflows: string[] = [];
    for (const el of document.querySelectorAll("[data-testid]")) {
      const tid = el.getAttribute("data-testid") ?? "";
      if (!tid.includes("chart") && !tid.includes("monat-v1") && !tid.includes("preis-fenster")) continue;
      if (el.scrollWidth > el.clientWidth + 1) chartOverflows.push(tid);
    }

    return {
      minTypoPx: minTypo === Number.POSITIVE_INFINITY ? 0 : minTypo,
      textCollisions,
      pathCollisions,
      minContrast: minContrast === Number.POSITIVE_INFINITY ? 21 : minContrast,
      pageOverflow,
      chartOverflows,
    };
  });
}

describe("Restliste #124 Chart-Audit", () => {
  jest.setTimeout(360_000);

  (runBrowser ? it : it.skip)("Typo, Kontrast, Kollision, Overflow", async () => {
    let browser: Browser | null = null;
    let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;
    const table: Record<string, Record<string, SvgAudit>> = {};
    try {
      browser = await chromium.launch();
      context = await browser.newContext({ colorScheme: "light" });
      await context.addInitScript(() => {
        document.documentElement.classList.remove("dark");
        try {
          window.localStorage.setItem("speicherpilot-theme", "light");
        } catch {
          /* private mode */
        }
      });
      for (const route of ROUTES) {
        table[route] = {};
        for (const width of WIDTHS) {
          const page = await context.newPage({ viewport: { width, height: 1200 } });
          await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
          await page.evaluate(() => {
            document.documentElement.classList.remove("dark");
            try {
              window.localStorage.setItem("speicherpilot-theme", "light");
            } catch {
              /* noop */
            }
          });
          await page.waitForLoadState("load");
          await page
            .waitForFunction(
              () =>
                document.querySelectorAll(
                  ".v4-luecke-chart text, [data-testid=\"monat-v1-hero\"] text, [data-testid=\"monat-regler-chart\"] text",
                ).length > 0,
              { timeout: 60_000 },
            )
            .catch(() => undefined);
          const audit = await auditPage(page);
          table[route][String(width)] = audit;
          expect(audit.pageOverflow).toBe(false);
          expect(audit.chartOverflows).toEqual([]);
          if (route !== "/") {
            expect(audit.minTypoPx).toBeGreaterThanOrEqual(11.99);
          }
          expect(audit.textCollisions).toBe(0);
          if (route.startsWith("/monat")) {
            expect(audit.pathCollisions).toBe(0);
            const hasRegler = await page.locator('[data-testid="monat-regler-chart"]').count();
            const observedContrast = hasRegler ? await page.evaluate(() => {
              const rgbParts = (css: string) => {
                const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
              };
              const lum = (rgb: number[]) => {
                const f = (c: number) => {
                  const s = c / 255;
                  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
                };
                return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
              };
              const el = Array.from(
                document.querySelectorAll('[data-testid="monat-regler-chart"] text'),
              ).find((node) => node.textContent?.trim() === "beobachtet");
              if (!el) return 21;
              const fg = getComputedStyle(el).fill;
              const bg = "rgb(246, 246, 243)";
              const a = rgbParts(fg);
              const b = rgbParts(bg);
              if (!a || !b) return 0;
              const hi = Math.max(lum(a), lum(b));
              const lo = Math.min(lum(a), lum(b));
              return (hi + 0.05) / (lo + 0.05);
            }) : 21;
            expect(observedContrast).toBeGreaterThanOrEqual(4.49);
            const hasHero = await page.locator('[data-testid="monat-v1-hero"]').count();
            const heroContrast = hasHero ? await page.evaluate(() => {
              const rgbParts = (css: string) => {
                const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
              };
              const lum = (rgb: number[]) => {
                const f = (c: number) => {
                  const s = c / 255;
                  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
                };
                return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
              };
              let min = 21;
              const bg = "rgb(246, 246, 243)";
              for (const el of document.querySelectorAll(
                '[data-testid="monat-v1-hero"] text, [data-testid="monat-v1-stunden"] text',
              )) {
                const fg = getComputedStyle(el).fill;
                const a = rgbParts(fg);
                const b = rgbParts(bg);
                if (!a || !b) continue;
                const c = (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
                min = Math.min(min, c);
              }
              return min;
            }) : 21;
            expect(heroContrast).toBeGreaterThanOrEqual(4.49);
          }
          await page.close();
        }
      }
    } finally {
      await context?.close();
      await browser?.close();
    }
    console.log(JSON.stringify(table, null, 2));
  });
});