#!/usr/bin/env node
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const viewports = [390, 768, 1024, 1280];
const paths = ["/tag/2026-10-25", "/monat/2026-10"];
const themes = ["light", "dark"];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let failed = 0;

for (const path of paths) {
  for (const w of viewports) {
    for (const theme of themes) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: 900 },
        colorScheme: theme,
      });
      const page = await ctx.newPage();
      await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
      if (theme === "dark") {
        await page.evaluate(() => {
          document.documentElement.classList.add("dark");
          document.documentElement.style.colorScheme = "dark";
        });
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (overflow.scrollWidth > overflow.clientWidth + 1) {
        console.error("overflow", path, w, theme, overflow);
        failed += 1;
      }
      const overlap = await page.evaluate(() => {
        const labels = [...document.querySelectorAll("svg text, .v4-chart-tooltip")];
        const boxes = labels
          .map((el) => {
            const b = el.getBoundingClientRect();
            return {
              x: b.x,
              y: b.y,
              w: b.width,
              h: b.height,
              tag: el.tagName,
              t: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
            };
          })
          .filter((b) => b.w > 0 && b.h > 0);
        const hits = [];
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i];
            const b = boxes[j];
            const hit = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
            if (hit && Math.abs(a.y - b.y) < 18 && a.tag === "text" && b.tag === "text") {
              hits.push({ a: a.t, b: b.t, dy: Math.abs(a.y - b.y), ax: a.x, ay: a.y, bx: b.x, by: b.y });
            }
          }
        }
        return hits;
      });
      if (overlap.length) {
        console.error("label overlap", path, w, theme, JSON.stringify(overlap, null, 2));
        failed += 1;
      }
      await ctx.close();
    }
  }
}
await browser.close();
if (failed) process.exit(1);
console.log("bbox gate ok");
