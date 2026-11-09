#!/usr/bin/env node
/**
 * Paket 3 Abnahme — Screens + Lighthouse. Requires `pnpm start -p 3001` on a fresh build.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

/** Turbopack kann CSS-Chunk-Namen mit `..` emittieren, die auf der Platte 404 liefern. */
function patchTurbopackCssChunk() {
  const chunks = join(process.cwd(), ".next/static/chunks");
  if (!existsSync(chunks)) {
    return;
  }
  const builtList = readdirSync(chunks).filter((f) => f.endsWith(".css") && !f.includes(".."));
  if (builtList.length === 0) {
    return;
  }
  const built = builtList.sort((a, b) => b.length - a.length)[0];
  for (const name of readdirSync(chunks)) {
    if (name.endsWith(".css") && name.includes("..") && !existsSync(join(chunks, name))) {
      execSync(`ln -sf ${JSON.stringify(built)} ${JSON.stringify(name)}`, { cwd: chunks });
    }
  }
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

async function applyTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
  await page.waitForTimeout(200);
}

async function waitForStyledHydrated(page, opts = {}) {
  const { waitFleetChart = false, waitThreeGoals = false } = opts;
  await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => {
      const bodyFont = getComputedStyle(document.body).fontFamily.toLowerCase();
      const hasAppFont =
        bodyFont.includes("space") || bodyFont.includes("grotesk") || bodyFont.includes("ui-sans");
      let sheetsOk = false;
      for (const sheet of document.styleSheets) {
        try {
          if (sheet.cssRules && sheet.cssRules.length > 0) {
            sheetsOk = true;
            break;
          }
        } catch {
          sheetsOk = true;
          break;
        }
      }
      return sheetsOk && hasAppFont;
    },
    { timeout: 45_000 },
  );
  if (waitFleetChart) {
    await page.waitForSelector(".v4-fleet-ts-wrap svg", { state: "attached", timeout: 90_000 });
    await page.waitForFunction(
      () => {
        const loading = document.body.textContent?.includes("Zeitreihe wird geladen");
        return !loading;
      },
      { timeout: 90_000 },
    );
  }
  if (waitThreeGoals) {
    await page.waitForSelector('[data-testid="three-goals-compare"] svg', { state: "attached", timeout: 60_000 });
  }
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
    await page.goto(`${BASE}${crop.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await applyTheme(page, crop.viewport.theme);
    await waitForStyledHydrated(page, {
      waitFleetChart: crop.file.includes("monat-2026-10-390"),
      waitThreeGoals: crop.file.includes("drei-ziele"),
    });
    const dest = join(CROPS, crop.file);
    if (crop.locator) {
      const el = page.locator(crop.locator).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await el.screenshot({ path: dest });
    } else {
      await page.screenshot({ path: dest, clip: crop.clip });
    }
    const styled = await page.evaluate(() => {
      const pill = document.querySelector(".v4-fleet-pill");
      const font = getComputedStyle(document.body).fontFamily;
      return {
        font,
        pillRadius: pill ? getComputedStyle(pill).borderRadius : null,
      };
    });
    if (/times/i.test(styled.font) && !/space|grotesk/i.test(styled.font)) {
      throw new Error(`Crop ${crop.file}: Seite ungestylt (font=${styled.font})`);
    }
    await page.close();
  }
}

async function main() {
  patchTurbopackCssChunk();
  mkdirSync(NACHHER, { recursive: true });
  copyVorherBaseline();
  const browser = await chromium.launch({ headless: true });
  await captureControlCrops(browser);
  if (process.env.PAKET3_CROPS_ONLY === "1") {
    await browser.close();
    console.log("OK", CROPS);
    return;
  }
  const lhSummary = [];

  for (const r of ROUTES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await preparePage(page, vp.theme);
      await page.goto(`${BASE}${r.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await applyTheme(page, vp.theme);
      await waitForStyledHydrated(page, { waitFleetChart: r.name === "monat" });
      await page.waitForTimeout(300);
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
