#!/usr/bin/env node
/**
 * Run18: KPI-Raster alignment vs. v4-content + screenshots (no content changes).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = process.env.RUN18_OUT ?? "/cursor/stores/self/launch-run18-kpi-align-20261107";

const ROUTES = [
  { name: "tag-2910-spitze", path: "/tag/2026-10-29?faktor=1&fahrweise=spitze" },
  { name: "tag-2410-x2-spitze", path: "/tag/2026-10-24?faktor=2&fahrweise=spitze" },
  { name: "monat-spitze", path: "/monat/2026-10?faktor=1&fahrweise=spitze" },
  { name: "start", path: "/" },
];

const VIEWPORTS = [
  { width: 1920, height: 1080, label: "desktop1920" },
  { width: 1280, height: 900, label: "desktop1280" },
  { width: 390, height: 844, label: "mob390" },
  { width: 375, height: 812, label: "mob375" },
];

function sha256File(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function assertProvenanceOnDisk() {
  const dirty = execSync(
    "git status --porcelain -- . ':!artifacts' ':!test-results' ':!*.report.html' ':!public/build-provenance.json' ':!lib/buildProvenance.generated.ts'",
    { encoding: "utf8", cwd: process.cwd() },
  ).trim();
  if (dirty) {
    throw new Error(`Working tree nicht sauber: ${dirty.split("\n")[0]}`);
  }
  const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const prov = JSON.parse(readFileSync(join(process.cwd(), "public/build-provenance.json"), "utf8"));
  if (prov.dirty) {
    throw new Error(`build-provenance dirty: ${JSON.stringify(prov.dirtyPaths ?? [])}`);
  }
  if (prov.commit !== head) {
    throw new Error(`provenance ${prov.commit} ≠ HEAD ${head}`);
  }
  return { head, prov };
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function measureAlignment(page) {
  const kpis = page.locator(".v4-fleet-kpis").first();
  if (!(await kpis.count())) {
    return { skip: true };
  }
  await kpis.waitFor({ state: "visible", timeout: 90_000 });
  const refLocator = page.locator(".v4-content.v4-fleet-controls, .v4-fleet-day-beleg.v4-content").first();
  await refLocator.waitFor({ state: "visible", timeout: 90_000 });
  const bBox = await refLocator.boundingBox();
  const kBox = await kpis.boundingBox();
  if (!kBox) {
    return { error: "kein KPI-Box" };
  }
  const refX = bBox?.x;
  if (refX == null) {
    return { error: "kein Referenz-Element" };
  }
  const delta = Math.abs(kBox.x - refX);
  return { refX, kpiX: kBox.x, delta, kpiWidth: kBox.width, belegX: bBox?.x ?? null };
}

async function main() {
  const { head, prov } = assertProvenanceOnDisk();
  mkdirSync(join(OUT, "screenshots"), { recursive: true });
  const report = { head, buildId: prov.buildId, base: BASE, routes: [], at: new Date().toISOString() };

  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.locator(".v4-fleet-kpis").first().waitFor({ state: "visible", timeout: 90_000 });
        await setTheme(page, theme);
        await page.waitForTimeout(200);
        const align = await measureAlignment(page);
        const shot = join(OUT, "screenshots", `after-${route.name}-${vp.label}-${theme}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        const kpi = page.locator(".v4-fleet-kpis").first();
        if (route.path.includes("/tag/") && (await kpi.count())) {
          const alignOnly = join(OUT, "screenshots", `after-${route.name}-${vp.label}-${theme}-kpi.png`);
          await kpi.screenshot({ path: alignOnly });
        }
        report.routes.push({
          ...route,
          viewport: vp.label,
          theme,
          align,
          screenshot: shot,
          sha256: sha256File(shot),
        });
        if (route.path.includes("/tag/") && align.delta != null && align.delta > 2) {
          throw new Error(`KPI-Raster Δx=${align.delta.toFixed(1)}px bei ${route.name} ${vp.label} ${theme}`);
        }
      }
      await page.close();
    }
  }
  await browser.close();

  const page = await chromium.launch().then((b) => b.newPage());
  await page.goto(`${BASE}/monat/2026-10?faktor=1&fahrweise=spitze`, { waitUntil: "domcontentloaded" });
  const uiSha = await page.evaluate(
    () => document.getElementById("speicherpilot-build-provenance")?.dataset.sourceSha ?? null,
  );
  await page.close();
  if (uiSha !== head) {
    throw new Error(`UI source ${uiSha} ≠ ${head}`);
  }
  report.uiSourceSha = uiSha;
  writeFileSync(join(OUT, "kpi-alignment-report.json"), JSON.stringify(report, null, 2));
  console.log("Run18 KPI alignment OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
