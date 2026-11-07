#!/usr/bin/env node
/** Visual smoke for launch checklist — requires `npm run start` on SITE_E2E_BASE_URL. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/launch-screenshots";
const MONAT = process.env.LAUNCH_MONAT ?? "2026-10";
const TAG = process.env.LAUNCH_TAG ?? "2026-10-29";

const SHOTS = [
  { path: `/monat/${MONAT}`, name: "monat-graph", themes: ["light", "dark"] },
  { path: `/tag/${TAG}`, name: "tag-beispiel", themes: ["light", "dark"] },
  { path: "/ort?sicht=netz", name: "ort-netz", themes: ["light", "dark"] },
  { path: "/", name: "start", themes: ["light"] },
];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), files: [], overflow: [] };

  const browser = await chromium.launch();
  for (const width of [375, 1280]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width < 500 ? 820 : 900 });

    for (const shot of SHOTS) {
      for (const theme of shot.themes) {
        await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle", timeout: 120_000 });
        await setTheme(page, theme);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
        }));
        const file = `${OUT}/${shot.name}-${theme}-${width}px.png`;
        await page.screenshot({ path: file, fullPage: shot.name !== "ort-netz" });
        report.files.push(file);
        if (overflow.sw > overflow.cw + 1) {
          report.overflow.push({ ...overflow, path: shot.path, theme, width });
        }
      }
    }
    await page.close();
  }
  await browser.close();

  writeFileSync("/opt/cursor/artifacts/launch-screenshots-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
