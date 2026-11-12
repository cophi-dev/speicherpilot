#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const out = "/opt/cursor/artifacts";
mkdirSync(out, { recursive: true });

const shots = [
  { name: "monat-1280-light", width: 1280, height: 900, path: "/monat/2026-10", colorScheme: "light" },
  { name: "monat-1280-dark", width: 1280, height: 900, path: "/monat/2026-10", colorScheme: "dark" },
  { name: "monat-390-light", width: 390, height: 844, path: "/monat/2026-10", colorScheme: "light" },
  { name: "monat-390-dark", width: 390, height: 844, path: "/monat/2026-10", colorScheme: "dark" },
  { name: "methodik-1280-light", width: 1280, height: 900, path: "/methodik#monat-konzept-ac", colorScheme: "light" },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    colorScheme: s.colorScheme,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}${s.path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(out, `${s.name}.png`), fullPage: true });
  await ctx.close();
  console.log("wrote", s.name);
}
await browser.close();
