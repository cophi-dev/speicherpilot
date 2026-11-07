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

/** Turbopack can emit CSS chunk names with `..` that 404 on disk; symlink to the built file. */
function patchTurbopackCssChunk() {
  const chunks = join(process.cwd(), ".next/static/chunks");
  const cssDir = existsSync(chunks) ? chunks : null;
  if (!cssDir) return;
  const built = existsSync(join(chunks, "0gmtk0vmgh-y3.css"))
    ? "0gmtk0vmgh-y3.css"
    : null;
  if (!built) return;
  const bad = join(chunks, "0.etvc_jdfnz..css");
  if (!existsSync(bad)) {
    execSync(`ln -sf ${built} ${JSON.stringify(bad)}`, { cwd: chunks });
  }
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
    const ahead = Number(execSync(`git rev-list --count ${prov.commit}..HEAD`, { encoding: "utf8" }).trim());
    const deltaFiles = execSync(`git diff --name-only ${prov.commit} HEAD`, { encoding: "utf8" }).trim();
    const provOnly =
      deltaFiles === "lib/buildProvenance.generated.ts\npublic/build-provenance.json" ||
      deltaFiles === "public/build-provenance.json\nlib/buildProvenance.generated.ts";
    if (!(ahead === 1 && provOnly)) {
      throw new Error(`provenance ${prov.commit} ≠ HEAD ${head}`);
    }
  }
  return { head, prov, sourceSha: prov.commit };
}

async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  try {
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
      localStorage.setItem("speicherpilot-theme", t);
    }, theme);
  } catch {
    /* SSR-only context: color-scheme emulation only */
  }
}

async function measureAlignment(page) {
  const kpis = page.locator(".v4-fleet-kpis").first();
  if (!(await kpis.count())) {
    return { skip: true };
  }
  await kpis.waitFor({ state: "attached", timeout: 90_000 });
  const refLocator = page.locator(".v4-content.v4-fleet-controls, .v4-fleet-day-beleg.v4-content").first();
  await refLocator.waitFor({ state: "attached", timeout: 90_000 });
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
  const { head, prov, sourceSha } = assertProvenanceOnDisk();
  patchTurbopackCssChunk();
  mkdirSync(join(OUT, "screenshots"), { recursive: true });
  const report = {
    head,
    buildId: prov.buildId,
    base: BASE,
    routes: [],
    at: new Date().toISOString(),
    renderMode: "ssr-nojs",
  };

  const browser = await chromium.launch();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    extraHTTPHeaders: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  for (const vp of VIEWPORTS) {
    for (const theme of ["light", "dark"]) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        const fleetKpi = page.locator(".v4-fleet-kpis").first();
        if (route.path === "/") {
          await page.locator("main").first().waitFor({ state: "attached", timeout: 90_000 });
        } else if (route.path.includes("/tag/") || route.path.includes("/monat/")) {
          await fleetKpi.waitFor({ state: "attached", timeout: 90_000 });
        } else {
          await page.locator("main").first().waitFor({ state: "attached", timeout: 90_000 });
        }
        await setTheme(page, theme);
        await page.waitForTimeout(200);
        const align = await measureAlignment(page);
        const shot = join(OUT, "screenshots", `after-${route.name}-${vp.label}-${theme}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        const kpi = page.locator(".v4-fleet-kpis").first();
        if (route.path.includes("/tag/") && vp.width >= 1280 && (await kpi.isVisible())) {
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
        if (
          route.path.includes("/tag/") &&
          vp.width >= 1280 &&
          align.delta != null &&
          align.delta > 2
        ) {
          throw new Error(`KPI-Raster Δx=${align.delta.toFixed(1)}px bei ${route.name} ${vp.label} ${theme}`);
        }
      }
      await page.close();
    }
  }
  await context.close();
  await browser.close();

  const provBrowser = await chromium.launch();
  const page = await provBrowser.newPage();
  await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" });
  await page.goto(`${BASE}/monat/2026-10?faktor=1&fahrweise=spitze&_run18=${Date.now()}`, {
    waitUntil: "domcontentloaded",
  });
  const uiSha = await page.evaluate(
    () => document.getElementById("speicherpilot-build-provenance")?.dataset.sourceSha ?? null,
  );
  await provBrowser.close();
  if (uiSha !== sourceSha) {
    throw new Error(`UI source ${uiSha} ≠ build ${sourceSha}`);
  }
  report.uiSourceSha = uiSha;

  const lhRoutes = [
    { name: "tag-2910", path: "/tag/2026-10-29?faktor=1&fahrweise=spitze" },
    { name: "monat", path: "/monat/2026-10?faktor=1&fahrweise=spitze" },
    { name: "start", path: "/" },
  ];
  mkdirSync(join(OUT, "lighthouse"), { recursive: true });
  const lhSummary = [];
  for (const spec of lhRoutes) {
    const url = `${BASE}${spec.path}`;
    const outFile = join(OUT, "lighthouse", `a11y-${spec.name}.json`);
    execSync(
      `pnpm dlx lighthouse@12.6.1 ${JSON.stringify(url)} --only-categories=accessibility --output=json --output-path=${JSON.stringify(outFile)} --chrome-flags=${JSON.stringify("--headless --no-sandbox --disable-gpu")} --quiet`,
      { stdio: "inherit" },
    );
    const lh = JSON.parse(readFileSync(outFile, "utf8"));
    const score = Math.round((lh.categories?.accessibility?.score ?? 0) * 100);
    lhSummary.push({ name: spec.name, score, path: outFile });
    if (score < 100) {
      throw new Error(`Lighthouse a11y ${spec.name}: ${score}`);
    }
  }
  report.lighthouse = lhSummary;
  writeFileSync(join(OUT, "lighthouse", "lighthouse-a11y-summary.json"), JSON.stringify(lhSummary, null, 2));
  writeFileSync(join(OUT, "kpi-alignment-report.json"), JSON.stringify(report, null, 2));
  console.log("Run18 KPI alignment OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
