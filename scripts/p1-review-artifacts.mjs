/**
 * P1 review: Playwright screenshots 1280 + 390 and basic measure pass.
 * Usage: pnpm build && pnpm start -p 3000 &
 *        node scripts/p1-review-artifacts.mjs http://127.0.0.1:3000
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "review-artifacts/p1");
mkdirSync(outDir, { recursive: true });

const paths = ["/", "/tag/2026-10-29", "/jahr", "/kompromiss"];
const widths = [1280, 1024, 768, 390];

const browser = await chromium.launch();
const results = [];

for (const path of paths) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const url = `${base}${path}`;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(1500);
    const slug = path === "/" ? "start" : path.replace(/\//g, "_").replace(/^_/, "");
    const file = `${slug}-${width}.png`;
    await page.screenshot({ path: join(outDir, file), fullPage: true });
    const measure = await page.evaluate(() => {
      const texts = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.fontSize && parseFloat(s.fontSize) >= 11;
        })
        .slice(0, 200);
      let minPx = 999;
      let minGap = 999;
      for (const el of texts) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs > 0) minPx = Math.min(minPx, fs);
      }
      const pills = [...document.querySelectorAll(".v4-fleet-pill")];
      for (let i = 0; i < pills.length - 1; i += 1) {
        const a = pills[i].getBoundingClientRect();
        const b = pills[i + 1].getBoundingClientRect();
        const gap = b.left - a.right;
        if (gap >= 0) minGap = Math.min(minGap, gap);
      }
      const clipped =
        [...document.querySelectorAll(".v4-fleet-ts-scroll, .v4-luecke-wrap")].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && el.scrollWidth > el.clientWidth + 2;
        }).length;
      return {
        minTypoPx: minPx === 999 ? null : minPx,
        minTypoPass: minPx >= 11.99,
        minGapPx: minGap === 999 ? null : minGap,
        minGapPass: minGap >= 4,
        horizontalClipRegions: clipped,
      };
    });
    results.push({ path, width, status: response?.status(), file, ...measure });
    await page.close();
  }
}

await browser.close();
writeFileSync(join(outDir, "measurements.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));