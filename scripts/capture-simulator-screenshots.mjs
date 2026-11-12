#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const out = join("/opt/cursor/artifacts", "simulator-fahrweisen");
mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:3000";

const shots = [
  { path: "/monat/2026-10", name: "monat-werkbank-390-light", width: 390, dark: false, scroll: 900 },
  { path: "/monat/2026-10", name: "monat-werkbank-390-dark", width: 390, dark: true, scroll: 900 },
  { path: "/monat/2026-10", name: "monat-werkbank-1280-light", width: 1280, dark: false, scroll: 700 },
  { path: "/monat/2026-10", name: "monat-werkbank-1280-dark", width: 1280, dark: true, scroll: 700 },
  { path: "/methodik", name: "methodik-1280-light", width: 1280, dark: false, scroll: 0 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: 900 },
    colorScheme: s.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  await page.goto(base + s.path, { waitUntil: "networkidle" });
  await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${s.name}.png`), fullPage: false });
  await ctx.close();
  console.log("wrote", s.name);
}
await browser.close();
