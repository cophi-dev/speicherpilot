#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const out = "/opt/cursor/artifacts";
mkdirSync(out, { recursive: true });

const pages = [
  { key: "tag", path: "/tag/2026-10-25" },
  { key: "monat", path: "/monat/2026-10" },
];

const variants = [
  { suffix: "390-hell", width: 390, height: 844, colorScheme: "light" },
  { suffix: "390-dunkel", width: 390, height: 844, colorScheme: "dark" },
  { suffix: "1280-hell", width: 1280, height: 900, colorScheme: "light" },
  { suffix: "1280-dunkel", width: 1280, height: 900, colorScheme: "dark" },
];

const browser = await chromium.launch();
for (const p of pages) {
  for (const v of variants) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      colorScheme: v.colorScheme,
    });
    const page = await ctx.newPage();
    await page.goto(`${base}${p.path}`, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: join(out, `${p.key}-${v.suffix}-fold.png`), fullPage: false });
    await page.screenshot({ path: join(out, `${p.key}-${v.suffix}-full.png`), fullPage: true });

    const probe = page.locator(".v4-chart-probe").first();
    if ((await probe.count()) > 0) {
      const box = await probe.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
        await page.screenshot({
          path: join(out, `${p.key}-${v.suffix}-tooltip.png`),
          fullPage: false,
        });
      }
    }
    await ctx.close();
    console.log("wrote", `${p.key}-${v.suffix}`);
  }
}
await browser.close();
