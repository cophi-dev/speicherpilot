#!/usr/bin/env node
/**
 * Playwright + getBBox: alle Werkbank-SVGs bei 390/768/1024/1280, hell und dunkel.
 * Prüft: jedes Text-getBBox liegt in der viewBox; Label-Boxen überlappen nicht
 * (Mindestabstand 8 px), außer Achsenticks untereinander.
 * Aufruf: SITE_E2E_BASE_URL=http://127.0.0.1:3000 node scripts/check-simulator-bbox.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const WIDTHS = [390, 768, 1024, 1280];
const THEMES = [false, true];
const SVG_TESTS = [
  "simulator-g1-full",
  "simulator-g1-zoom",
  "simulator-g2",
  "simulator-g3-21",
  "simulator-g3-29",
  "simulator-g4-kipp",
];
const MIN_GAP = 8;
const EPS = 0.6;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const failures = [];
const logs = [];

for (const width of WIDTHS) {
  for (const dark of THEMES) {
    const theme = dark ? "dark" : "light";
    const ctx = await browser.newContext({
      viewport: { width, height: 1600 },
      colorScheme: dark ? "dark" : "light",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/simulator`, { waitUntil: "networkidle", timeout: 60_000 });
    if (dark) {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.waitForTimeout(200);
    }
    await page.locator('[data-testid="simulator-werkbank"]').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      failures.push(`${width} ${theme}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`);
    }

    for (const id of SVG_TESTS) {
      const result = await page.evaluate(
        ({ testId, minGap, eps }) => {
          const svg = document.querySelector(`[data-testid="${testId}"]`);
          if (!svg) return { ok: false, error: "missing svg" };
          const vb = svg.viewBox.baseVal;
          const texts = [...svg.querySelectorAll("text")].filter((t) => (t.textContent ?? "").trim().length > 0);
          const boxes = [];
          for (const t of texts) {
            let bb;
            try {
              bb = t.getBBox();
            } catch (e) {
              return { ok: false, error: `getBBox failed: ${e}` };
            }
            const label = (t.textContent ?? "").replace(/\s+/g, " ").trim();
            const out =
              bb.x < -eps ||
              bb.y < -eps ||
              bb.x + bb.width > vb.width + eps ||
              bb.y + bb.height > vb.height + eps;
            boxes.push({
              label,
              x: bb.x,
              y: bb.y,
              w: bb.width,
              h: bb.height,
              out,
              // axis ticks: short numeric or "×N" at the edge
              isTick:
                /^[\d,]+$/.test(label) ||
                /^[\d]{1,2}\.$/.test(label) ||
                /^×[\d,]+$/.test(label) ||
                /^(00|06|12|18|24)$/.test(label) ||
                label === "€/MWh",
            });
          }
          const outside = boxes.filter((b) => b.out);
          const overlaps = [];
          // Zweizeilige Labels (18 px Zeilenabstand, Spec 4.1) als eine Box.
          const raw = boxes.filter((b) => !b.isTick);
          const used = new Set();
          const labels = [];
          for (let i = 0; i < raw.length; i++) {
            if (used.has(i)) continue;
            let box = { ...raw[i] };
            for (let j = i + 1; j < raw.length; j++) {
              if (used.has(j)) continue;
              const o = raw[j];
              const sameX = Math.abs(o.x - box.x) < 2 || Math.abs(o.x + o.w - (box.x + box.w)) < 2;
              const dy = Math.abs((o.y + o.h / 2) - (box.y + box.h / 2));
              if (sameX && dy >= 12 && dy <= 24) {
                const x = Math.min(box.x, o.x);
                const y = Math.min(box.y, o.y);
                const r = Math.max(box.x + box.w, o.x + o.w);
                const btm = Math.max(box.y + box.h, o.y + o.h);
                box = { ...box, x, y, w: r - x, h: btm - y, label: box.label + " / " + o.label };
                used.add(j);
              }
            }
            labels.push(box);
          }
          for (let i = 0; i < labels.length; i++) {
            for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i];
              const b = labels[j];
              const gapX = a.x + a.w < b.x ? b.x - (a.x + a.w) : b.x + b.w < a.x ? a.x - (b.x + b.w) : 0;
              const gapY = a.y + a.h < b.y ? b.y - (a.y + a.h) : b.y + b.h < a.y ? a.y - (b.y + b.h) : 0;
              const overlapX = !(a.x + a.w <= b.x || b.x + b.w <= a.x);
              const overlapY = !(a.y + a.h <= b.y || b.y + b.h <= a.y);
              const separated = !overlapX || !overlapY;
              const gap = separated ? (overlapX ? gapY : overlapY ? gapX : Math.hypot(gapX, gapY)) : 0;
              if (!separated || gap < minGap - 0.5) {
                overlaps.push({
                  a: a.label,
                  b: b.label,
                  gap: Number(gap.toFixed(1)),
                });
              }
            }
          }
          return {
            ok: outside.length === 0 && overlaps.length === 0,
            vb: { w: vb.width, h: vb.height },
            n: boxes.length,
            outside: outside.map((b) => ({
              label: b.label,
              x: +b.x.toFixed(1),
              y: +b.y.toFixed(1),
              w: +b.w.toFixed(1),
              h: +b.h.toFixed(1),
            })),
            overlaps,
          };
        },
        { testId: id, minGap: MIN_GAP, eps: EPS },
      );
      const tag = `${width} ${theme} ${id}`;
      if (!result || result.error) {
        failures.push(`${tag}: ${result?.error ?? "no result"}`);
      } else {
        logs.push(`${tag}: texts=${result.n} vb=${result.vb.w}×${result.vb.h} out=${result.outside.length} overlap=${result.overlaps.length}`);
        for (const o of result.outside) {
          failures.push(`${tag} OUT: "${o.label}" bbox=${o.x},${o.y} ${o.w}×${o.h} vb=${result.vb.w}×${result.vb.h}`);
        }
        for (const o of result.overlaps) {
          failures.push(`${tag} OVERLAP ${o.gap}px: "${o.a}" × "${o.b}"`);
        }
      }
    }
    await ctx.close();
  }
}

await browser.close();
for (const l of logs) console.log(l);
if (failures.length) {
  console.error(`\n${failures.length} failures:`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("\nall viewports/themes: labels inside viewBox, no label overlaps.");
