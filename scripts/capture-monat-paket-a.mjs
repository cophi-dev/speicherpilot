#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3010";
const OUT = join(process.cwd(), "docs/audit-2026-11/monat-paket-a/screenshots");
mkdirSync(OUT, { recursive: true });

const shots = [
  { name: "erstaufruf-1280-light", url: "/monat/2026-10", w: 1280, dark: false },
  { name: "erstaufruf-390-light", url: "/monat/2026-10", w: 390, dark: false },
  { name: "x5-spitze-1280-light", url: "/monat/2026-10?faktor=5&fahrweise=spitze", w: 1280, dark: false },
  { name: "x5-spitze-390-light", url: "/monat/2026-10?faktor=5&fahrweise=spitze", w: 390, dark: false },
  { name: "x10-markt-1280-light", url: "/monat/2026-10?faktor=10&fahrweise=markt", w: 1280, dark: false },
  { name: "x10-markt-390-light", url: "/monat/2026-10?faktor=10&fahrweise=markt", w: 390, dark: false },
  { name: "erstaufruf-1280-dark", url: "/monat/2026-10", w: 1280, dark: true },
  { name: "erstaufruf-390-dark", url: "/monat/2026-10", w: 390, dark: true },
  { name: "x5-spitze-1280-dark", url: "/monat/2026-10?faktor=5&fahrweise=spitze", w: 1280, dark: true },
  { name: "x5-spitze-390-dark", url: "/monat/2026-10?faktor=5&fahrweise=spitze", w: 390, dark: true },
  { name: "x10-markt-1280-dark", url: "/monat/2026-10?faktor=10&fahrweise=markt", w: 1280, dark: true },
  { name: "x10-markt-390-dark", url: "/monat/2026-10?faktor=10&fahrweise=markt", w: 390, dark: true },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.w <= 390 ? 1400 : 900 },
    colorScheme: s.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${s.url}`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[data-testid="monat-regler-hero"]', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, `${s.name}.png`), fullPage: true });
  await ctx.close();
  console.log("wrote", s.name);
}
await browser.close();