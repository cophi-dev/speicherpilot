#!/usr/bin/env node
/**
 * Paket 3 Abnahme — Screens + Lighthouse. Requires `pnpm start -p 3001` on a fresh build.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = join(process.cwd(), "docs/audit-2026-11/paket3");
const NACHHER = join(OUT, "screens/nachher");
const VORHER = join(OUT, "screens/vorher");
const CROPS = join(OUT, "screens/kontrolle");

/** PR81 Korrektur — drei Kontroll-Crops (Screenshot-Bereiche). */
const CONTROL_CROPS = [
  {
    file: "monat-2026-10-1440-dark-drei-ziele.png",
    path: "/monat/2026-10?faktor=1&fahrweise=ueberschuss",
    viewport: { width: 1440, height: 900, theme: "dark" },
    locator: '[data-testid="three-goals-compare"]',
  },
  {
    file: "monat-2026-10-390-light-erstes-fenster.png",
    path: "/monat/2026-10?faktor=1&fahrweise=ueberschuss",
    viewport: { width: 390, height: 844, theme: "light" },
    clip: { x: 0, y: 0, width: 390, height: 420 },
  },
  {
    file: "ort-390-light-unb-hinweis.png",
    path: "/ort",
    viewport: { width: 390, height: 844, theme: "light" },
    locator: '[data-testid="ort-unb-hinweis"]',
  },
];

const ROUTES = [
  { name: "start", path: "/" },
  { name: "tag", path: "/tag/2026-11-08" },
  { name: "monat", path: "/monat/2026-10?faktor=1&fahrweise=ueberschuss" },
  { name: "ort", path: "/ort" },
  { name: "methodik", path: "/methodik" },
];

const VIEWPORTS = [
  { label: "1440-dark", width: 1440, height: 900, theme: "dark" },
  { label: "390-light", width: 390, height: 844, theme: "light" },
];

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function preparePage(page, theme) {
  await page.addInitScript((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    try {
      localStorage.setItem("speicherpilot-theme", t);
    } catch {
      /* cross-origin guard */
    }
  }, theme);
}

function copyVorherBaseline() {
  const srcRoot = join(process.cwd(), "docs/audit-2026-11/screens");
  mkdirSync(VORHER, { recursive: true });
  for (const r of ROUTES) {
    for (const vp of VIEWPORTS) {
      const suffix = vp.width === 1440 ? "1440-dark-fold" : "390-light-fold";
      const src = join(srcRoot, `${r.name}-${suffix}.png`);
      const dest = join(VORHER, `${r.name}-${vp.label}.png`);
      if (existsSync(src)) {
        cpSync(src, dest);
      }
    }
  }
}

async function captureControlCrops(browser) {
  mkdirSync(CROPS, { recursive: true });
  for (const crop of CONTROL_CROPS) {
    const page = await browser.newPage({
      viewport: { width: crop.viewport.width, height: crop.viewport.height },
    });
    await preparePage(page, crop.viewport.theme);
    await page.goto(`${BASE}${crop.path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(800);
    const dest = join(CROPS, crop.file);
    if (crop.locator) {
      const el = page.locator(crop.locator).first();
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: dest });
    } else {
      await page.screenshot({ path: dest, clip: crop.clip });
    }
    await page.close();
  }
}

async function main() {
  mkdirSync(NACHHER, { recursive: true });
  copyVorherBaseline();
  const browser = await chromium.launch({ headless: true });
  await captureControlCrops(browser);
  const lhSummary = [];

  for (const r of ROUTES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await preparePage(page, vp.theme);
      await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      if (vp.width === 390 && overflow) {
        throw new Error(`horizontal overflow on ${r.name} ${vp.label}`);
      }
      await page.screenshot({ path: join(NACHHER, `${r.name}-${vp.label}.png`), fullPage: true });
      await page.close();
    }

    const url = `${BASE}${r.path}`;
    const lhDir = join(OUT, "lighthouse");
    mkdirSync(lhDir, { recursive: true });
    for (const form of ["mobile", "desktop"]) {
      const outFile = join(lhDir, `${r.name}-${form}.json`);
      const extra = form === "mobile" ? " --form-factor=mobile --screenEmulation.mobile=true" : " --preset=desktop";
      execSync(
        `pnpm dlx lighthouse@12.6.1 ${JSON.stringify(url)} --only-categories=performance,accessibility${extra} --output=json --output-path=${JSON.stringify(outFile)} --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
        { stdio: "inherit" },
      );
      const report = JSON.parse(readFileSync(outFile, "utf8"));
      lhSummary.push({
        route: r.name,
        form,
        perf: Math.round((report.categories.performance?.score ?? 0) * 100),
        a11y: Math.round((report.categories.accessibility?.score ?? 0) * 100),
        cls: report.audits["cumulative-layout-shift"]?.numericValue ?? null,
      });
    }
  }

  await browser.close();
  writeFileSync(join(OUT, "lighthouse-summary.json"), JSON.stringify(lhSummary, null, 2));
  writeFileSync(
    join(OUT, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        nachher: ROUTES.flatMap((r) =>
          VIEWPORTS.map((vp) => ({
            file: `screens/nachher/${r.name}-${vp.label}.png`,
            sha256: sha256File(join(NACHHER, `${r.name}-${vp.label}.png`)),
          })),
        ),
        lighthouse: lhSummary,
      },
      null,
      2,
    ),
  );
  console.log("OK", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
