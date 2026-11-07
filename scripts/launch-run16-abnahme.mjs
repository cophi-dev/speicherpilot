#!/usr/bin/env node
/**
 * Run16 acceptance: Run15 fixes + 29.10 spitze Belege, Inventar-Hash, keine Doppelliste.
 * Requires fresh production server (SITE_E2E_BASE_URL, default http://127.0.0.1:3001).
 */
import { chromium } from "playwright";
import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = process.env.RUN16_ABNAHME_OUT ?? "/cursor/stores/self/launch-run16-abnahme-20261107";
const RUN15_PRIOR = "/cursor/stores/self/launch-run15-abnahme-20261107";

const VIEWPORTS = [
  { width: 1280, height: 900, label: "desktop" },
  { width: 390, height: 844, label: "mob390" },
  { width: 375, height: 812, label: "mob375" },
];

const FACTORS = [1, 2, 5, 10];
const STRATEGIES = ["ueberschuss", "spitze", "markt"];
const SCENARIOS_12 = FACTORS.flatMap((f) =>
  STRATEGIES.map((s) => ({
    name: `monat-x${f}-${s}`,
    path: `/monat/2026-10?faktor=${f}&fahrweise=${s}`,
  })),
);

const EXTRA_TAG_DAYS = [
  { name: "tag-2026-10-25-dst", path: "/tag/2026-10-25?faktor=2&fahrweise=spitze", fleetDayTitle: true },
  {
    name: "tag-2026-10-29-spitze",
    path: "/tag/2026-10-29?faktor=1&fahrweise=spitze",
    fleetDayTitle: true,
    expectSpitzePeakBox: true,
  },
];

const STATIC_MATRIX = [
  {
    name: "monat-fleet-x1-diff",
    path: "/monat/2026-10?faktor=1&fahrweise=ueberschuss",
    expect: { fleetTitle: true, chart: true, h1Includes: "Oktober" },
  },
  {
    name: "monat-fleet-x5-markt",
    path: "/monat/2026-10?faktor=5&fahrweise=markt",
    expect: { fleetTitle: true, chart: true, pillActive: "×5" },
  },
  {
    name: "tag-fleet-x2-spitze",
    path: "/tag/2026-10-24?faktor=2&fahrweise=spitze",
    expect: { fleetDayTitle: true, chart: true },
  },
  {
    name: "tag-2910-spitze-peakbox",
    path: "/tag/2026-10-29?faktor=1&fahrweise=spitze",
    expect: { fleetDayTitle: true, chart: true, spitzePeakBox: true },
  },
  {
    name: "monat-fleet-x1-spitze",
    path: "/monat/2026-10?faktor=1&fahrweise=spitze",
    expect: { fleetTitle: true, chart: true, pillActive: "×1" },
  },
  {
    name: "monat-nov-kein-modell",
    path: "/monat/2026-11",
    expect: { fleetTitle: false, noticeFleet: true, noError: true },
  },
];

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function preflightPage(page, spec) {
  const errors = [];
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const url = `${BASE}${spec.path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });

  if (await page.locator("#error-title").count()) {
    errors.push("error-boundary #error-title sichtbar");
  }
  if (spec.expect.fleetTitle) {
    if (!(await page.locator("#fleet-month-title").count())) {
      errors.push("fehlend #fleet-month-title");
    }
  }
  if (spec.expect.fleetDayTitle) {
    if (!(await page.locator("#fleet-day-title").count())) {
      errors.push("fehlend #fleet-day-title");
    }
  }
  if (spec.expect.noticeFleet) {
    if (!(await page.locator("#fleet-notice-title").count())) {
      errors.push("fehlend #fleet-notice-title (Nov-Hinweis)");
    }
  }
  if (spec.expect.chart) {
    await page.waitForSelector(".v4-fleet-ts-wrap svg", { state: "attached", timeout: 120_000 }).catch(() => {
      errors.push("kein .v4-fleet-ts-wrap svg (Chart)");
    });
    const loading = await page.locator("text=Zeitreihe wird geladen").count();
    const loadErr = await page.locator(".v4-fleet-error").count();
    if (loading > 0) {
      errors.push("Chart noch im Ladezustand");
    }
    if (loadErr > 0) {
      errors.push("Chart-Fehlertext (.v4-fleet-error)");
    }
  }
  if (spec.expect.pillActive) {
    const pill = page.locator(`.v4-fleet-pill.is-active`, { hasText: spec.expect.pillActive });
    if (!(await pill.count())) {
      errors.push(`aktive Pill ${spec.expect.pillActive} fehlt`);
    }
  }
  if (spec.expect.h1Includes) {
    const h1El = page.locator("#monat-h1");
    await h1El.waitFor({ state: "attached", timeout: 90_000 }).catch(() => {
      errors.push("fehlend #monat-h1");
    });
    const h1 = await h1El.textContent().catch(() => "");
    if (h1 && !h1.includes(spec.expect.h1Includes)) {
      errors.push(`#monat-h1 enthält nicht „${spec.expect.h1Includes}“`);
    }
  }
  const hyd = consoleErrors.filter((t) => /hydration|Hydration/i.test(t));
  if (hyd.length) {
    errors.push(`Hydration/Konsolenfehler: ${hyd.slice(0, 3).join(" | ")}`);
  }

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const main = document.querySelector("main");
    return {
      docScroll: doc.scrollWidth,
      docClient: doc.clientWidth,
      bodyScroll: body.scrollWidth,
      bodyClient: body.clientWidth,
      mainScroll: main?.scrollWidth ?? null,
      mainClient: main?.clientWidth ?? null,
    };
  });
  if (overflow.docScroll > overflow.docClient + 2 || overflow.bodyScroll > overflow.bodyClient + 2) {
    errors.push(
      `horizontal overflow doc ${overflow.docScroll}/${overflow.docClient} body ${overflow.bodyScroll}/${overflow.bodyClient}`,
    );
  }

  const badStory = await page.locator("text=Kein Überschuss zum Laden").count();
  if (badStory > 0) {
    errors.push("veraltete Mittags-Story „Kein Überschuss zum Laden“");
  }
  if (url.includes("/tag/2026-10-24")) {
    const devTone = await page.locator("text=Tagesschnitt").count();
    if (devTone > 0) {
      errors.push("Entwicklerton in Mittags-Story");
    }
  }

  const dom = await page.evaluate(() => {
    const cap = document.querySelector(".v4-fleet-caption-main")?.textContent?.trim() ?? null;
    const kpis = [...document.querySelectorAll(".v4-fleet-kpis dd")].map((el) => el.textContent?.trim());
    const svgW = document.querySelector(".v4-fleet-ts-svg")?.getAttribute("width") ?? null;
    const scroll = document.querySelector(".v4-fleet-ts-scroll");
    const chartFill =
      scroll && svgW ? Number(svgW) / Math.max(1, scroll.clientWidth) : null;
    const polylines = [...document.querySelectorAll(".v4-fleet-ts-svg polyline")].map((el) => ({
      class: el.getAttribute("class"),
      pointCount: (el.getAttribute("points") ?? "").trim().split(/\s+/).filter(Boolean).length,
      pointsBytes: (el.getAttribute("points") ?? "").length,
    }));
    const powerUnit = document.querySelector(".v4-fleet-ts-panel:nth-child(2) .v4-fleet-ts-panel-unit")?.textContent?.trim();
    const rUnit = document.querySelector(".v4-fleet-ts-panel:nth-child(1) .v4-fleet-ts-panel-unit")?.textContent?.trim();
    const marginalRows = [...document.querySelectorAll(".v4-fleet-marginal-table tr")].map((tr) =>
      [...tr.querySelectorAll("th,td")].map((c) => c.textContent?.trim() ?? ""),
    );
    const compareRows = [...document.querySelectorAll(".v4-fleet-compare-table tr")].map((tr) =>
      [...tr.querySelectorAll("th,td")].map((c) => c.textContent?.trim() ?? ""),
    );
    const ticks = [...document.querySelectorAll(".v4-fleet-ts-tick")].map((el) => el.textContent?.trim());
    return { caption: cap, kpis, svgWidth: svgW, chartFillRatio: chartFill, ticks, polylines, powerUnit, rUnit, marginalRows, compareRows };
  });

  if (url.includes("/monat/2026-10") && dom.powerUnit && !dom.powerUnit.includes("GW")) {
    errors.push(`Speicherleistungsskala nicht in GW (${dom.powerUnit})`);
  }
  if (url.includes("/monat/2026-10") && (dom.caption ?? "").includes("horizontal scrollen")) {
    errors.push("Veralteter Monatsscroll-Hinweis");
  }

  if (url.includes("/monat/2026-10") && dom.chartFillRatio != null && (dom.chartFillRatio < 0.92 || dom.chartFillRatio > 1.08)) {
    errors.push(`Monatschart füllt Viewport nicht (${dom.chartFillRatio?.toFixed(2)}×)`);
  }

  if (url.includes("/tag/") && dom.chartFillRatio != null && dom.chartFillRatio < 0.85) {
    errors.push(`Tages-Chart nutzt nur ${(dom.chartFillRatio * 100).toFixed(0)}% der Scrollbreite`);
  }

  if (spec.expect?.spitzePeakBox) {
    if (!url.includes("fahrweise=spitze")) {
      errors.push("29.10-Peakbox: URL ohne fahrweise=spitze");
    }
    if (!(await page.locator(".v4-fleet-day-beleg").count())) {
      errors.push("29.10-Peakbox: .v4-fleet-day-beleg fehlt");
    }
    const kpiText = dom.kpis.join(" ");
    if (!kpiText.includes("6,94") || !kpiText.includes("5,90")) {
      errors.push("29.10-Peakbox: Ladung/Abgabe-KPIs unerwartet");
    }
    if (!kpiText.includes("64,41") || !kpiText.includes("60,86")) {
      errors.push("29.10-Peakbox: Tages-Peak-KPI unerwartet");
    }
    const scroll = page.locator(".v4-fleet-ts-scroll");
    const bb = await scroll.boundingBox();
    const n = dom.polylines?.[0]?.pointCount ?? 96;
    if (bb && n > 0) {
      let tip1815 = "";
      for (let j = 66; j <= 78; j++) {
        const x = (j + 0.5) * (bb.width / n);
        await scroll.hover({ position: { x: Math.min(bb.width - 2, Math.max(2, x)), y: bb.height / 2 } });
        await page.waitForTimeout(80);
        const tip = (await page.locator('[data-testid="fleet-ts-tooltip"]').textContent())?.trim() ?? "";
        if (/T18:15:00/.test(tip) || tip.includes("18:15")) {
          tip1815 = tip;
          break;
        }
      }
      dom.tooltip1815 = tip1815;
      if (!tip1815) {
        errors.push("29.10 Tooltip 18:15 nicht gefunden");
      } else if (!/Entladen\s+3[,.]5/.test(tip1815) || !/Laden\s+0[,.]0/.test(tip1815)) {
        errors.push(`29.10 Tooltip 18:15 unerwartet: ${tip1815.slice(0, 140)}`);
      }
    }
  }

  if (url.includes("/monat/2026-10")) {
    const dupList = await page.locator(".v4-monat-list").count();
    if (dupList > 0) {
      errors.push("doppelte Monats-Tagesliste (.v4-monat-list)");
    }
  }

  return { url, errors, consoleErrors, overflow, dom };
}

async function waitFleetChart(page) {
  await page.waitForSelector(".v4-fleet-ts-wrap svg", { state: "attached", timeout: 120_000 });
  const err = await page.locator(".v4-fleet-error").count();
  if (err) {
    throw new Error("Chart .v4-fleet-error");
  }
}

async function scenarioFlow(page) {
  const flowLog = [];
  const flowErrors = [];
  const base = `${BASE}/monat/2026-10?faktor=1&fahrweise=ueberschuss`;
  try {
    await page.goto(base, { waitUntil: "networkidle", timeout: 180_000 });
    await waitFleetChart(page);
    flowLog.push({ step: "open", url: page.url() });

    await page.locator('.v4-fleet-pill', { hasText: "×5" }).click();
    await page.waitForURL(/faktor=5/, { timeout: 15_000 });
    await waitFleetChart(page);
    flowLog.push({ step: "factor-x5", url: page.url() });
    await page.reload({ waitUntil: "networkidle", timeout: 180_000 });
    if (!page.url().includes("faktor=5")) {
      flowErrors.push("Reload behält ×5 nicht");
    }
    flowLog.push({ step: "reload-x5", url: page.url() });

    await page.locator('.v4-fleet-strategy-row a', { hasText: "Marktorientiert" }).click();
    await page.waitForURL(/fahrweise=markt/, { timeout: 15_000 });
    await waitFleetChart(page);
    flowLog.push({ step: "strategy-markt", url: page.url() });

    await page.locator('.v4-fleet-strategy-row a', { hasText: "Spitze senken" }).click();
    await page.waitForURL(/fahrweise=spitze/, { timeout: 15_000 });
    await waitFleetChart(page);
    flowLog.push({ step: "strategy-spitze", url: page.url() });
  } catch (e) {
    flowErrors.push(`Szenario-Fluss: ${e.message ?? e}`);
  }

  const tagLink = page.locator('a.v4-monat-graph-day-link[aria-label*="24.10"]').first();
  if (await tagLink.count()) {
    await tagLink.click({ timeout: 15_000 });
    await page.waitForURL(/\/tag\/2026-10-24/, { timeout: 20_000 });
    flowLog.push({ step: "tag-from-month", url: page.url() });
    if (!page.url().includes("faktor=")) {
      flowErrors.push("Tag-Link verliert faktor");
    }
    await page.goBack({ waitUntil: "networkidle", timeout: 120_000 });
    flowLog.push({ step: "back-to-month", url: page.url() });
    if (!page.url().includes("faktor=5")) {
      flowErrors.push("Zurück verliert Monats-Szenario");
    }
  } else {
    flowErrors.push("kein klickbarer Tag 24.10 in Monatsliste");
  }

  await page.goto(`${BASE}/monat/2026-10?faktor=1&fahrweise=spitze`, { waitUntil: "networkidle", timeout: 180_000 });
  const foot2910 = page.locator('a.v4-text-link[href*="2026-10-29"][href*="spitze"]').first();
  if (await foot2910.count()) {
    const href = await foot2910.getAttribute("href");
    flowLog.push({ step: "monat-spitze-foot-2910-href", href });
    await foot2910.click({ timeout: 15_000 });
    await page.waitForURL(/\/tag\/2026-10-29.*spitze/, { timeout: 20_000 });
    flowLog.push({ step: "monat-spitze-to-2910", url: page.url() });
  } else {
    flowErrors.push("Monatsfuß-Link 29.10 spitze fehlt");
  }

  await page.goto(`${BASE}/monat/2026-11`, { waitUntil: "networkidle", timeout: 120_000 });
  const novFleet = await page.locator("#fleet-month-title").count();
  const novNotice = await page.locator("#fleet-notice-title").count();
  flowLog.push({ step: "november", url: page.url(), novFleet, novNotice });
  if (novFleet) {
    flowErrors.push("November zeigt fälschlich Modellflotte");
  }

  return { flowErrors, flowLog };
}

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: process.cwd() }).trim();
  const buildId = process.env.BUILD_ID ?? execSync("date -u +%Y%m%dT%H%MZ", { encoding: "utf8" }).trim();

  mkdirSync(join(OUT, "screenshots"), { recursive: true });
  mkdirSync(join(OUT, "lighthouse"), { recursive: true });
  mkdirSync(join(OUT, "EXPORTS"), { recursive: true });

  const preflightReport = { at: new Date().toISOString(), commit, buildId, base: BASE, routes: [], scenarioFlow: [] };

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const prePage = await ctx.newPage();
  await prePage.setViewportSize({ width: 1280, height: 900 });

  for (const spec of STATIC_MATRIX) {
    const result = await preflightPage(prePage, spec);
    preflightReport.routes.push({ name: spec.name, path: spec.path, ...result });
  }
  const scenario = await scenarioFlow(prePage);
  preflightReport.scenarioFlow = scenario.flowLog;
  preflightReport.scenarioErrors = scenario.flowErrors;

  for (const spec of SCENARIOS_12) {
    const r = await preflightPage(prePage, {
      name: spec.name,
      path: spec.path,
      expect: { fleetTitle: true, chart: true },
    });
    preflightReport.routes.push({ name: spec.name, path: spec.path, ...r });
  }
  for (const spec of EXTRA_TAG_DAYS) {
    const r = await preflightPage(prePage, {
      name: spec.name,
      path: spec.path,
      expect: {
        fleetDayTitle: true,
        chart: true,
        spitzePeakBox: spec.expectSpitzePeakBox === true,
      },
    });
    if (r.dom?.chartFillRatio != null && r.dom.chartFillRatio < 0.85) {
      r.errors.push(`Tages-Chart nutzt nur ${(r.dom.chartFillRatio * 100).toFixed(0)}% der Breite`);
    }
    preflightReport.routes.push({ name: spec.name, path: spec.path, ...r });
  }

  await prePage.close();

  const failed =
    preflightReport.routes.some((r) => r.errors.length) || scenario.flowErrors.length;
  writeFileSync(join(OUT, "preflight-report.json"), JSON.stringify(preflightReport, null, 2));

  if (failed) {
    console.error("Preflight FAILED — keine Screenshots/Lighthouse als Abnahme", preflightReport);
    await browser.close();
    process.exit(1);
  }

  const manifest = {
    at: new Date().toISOString(),
    tested_source_sha: commit,
    buildId,
    base: BASE,
    preflight: "passed",
    rejectedPrior: "launch-run13-abnahme-20261107 (Produkt NEIN)",
    files: [],
  };

  for (const vp of VIEWPORTS) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const spec of STATIC_MATRIX) {
        const url = `${BASE}${spec.path}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
        if (spec.expect.chart) {
          await page.waitForSelector(".v4-fleet-ts-wrap svg", { state: "attached", timeout: 120_000 });
        }
        await setTheme(page, theme);
        await page.waitForTimeout(300);
        const file = join(OUT, "screenshots", `${spec.name}-${vp.label}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const shotMeta = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, vp: window.innerWidth }));
        if (shotMeta.docW > shotMeta.vp + 2) {
          throw new Error(`Screenshot-Viewport Overflow ${shotMeta.docW} > ${shotMeta.vp} bei ${url}`);
        }
        manifest.files.push({
          kind: "screenshot",
          path: file,
          sha256: sha256File(file),
          url,
          viewport: vp.label,
          theme,
          scenario: spec.name,
        });
      }
      await page.close();
    }
  }
  await browser.close();

  const shotHashes = manifest.files.filter((f) => f.kind === "screenshot").map((f) => f.sha256);
  const uniqueShots = new Set(shotHashes);
  if (uniqueShots.size < 4) {
    console.error("Screenshot-SHAs zu wenig divers — vermutlich identische Fehlerseiten", uniqueShots.size);
    process.exit(1);
  }

  const lhSummary = { base: BASE, tested_source_sha: commit, buildId, at: new Date().toISOString(), routes: [] };
  for (const spec of STATIC_MATRIX) {
    const outFile = join(OUT, "lighthouse", `a11y-${spec.name}.json`);
    const url = `${BASE}${spec.path}`;
    execSync(
      `pnpm dlx lighthouse@12.6.1 ${JSON.stringify(url)} --only-categories=accessibility --output=json --output-path=${JSON.stringify(outFile)} --chrome-flags=${JSON.stringify("--headless --no-sandbox --disable-gpu")} --quiet`,
      { stdio: "inherit", timeout: 240_000, shell: true },
    );
    const report = JSON.parse(readFileSync(outFile, "utf8"));
    const score = Math.round((report.categories?.accessibility?.score ?? 0) * 100);
    lhSummary.routes.push({ path: spec.path, score, outFile, sha256: sha256File(outFile) });
    manifest.files.push({ kind: "lighthouse", path: outFile, sha256: sha256File(outFile), score });
  }
  writeFileSync(join(OUT, "lighthouse/lighthouse-a11y-summary.json"), JSON.stringify(lhSummary, null, 2));

  execSync(`node scripts/export-run14-verification.mjs`, {
    stdio: "inherit",
    env: { ...process.env, RUN14_EXPORT_OUT: join(OUT, "EXPORTS/numeric"), RUN15_ABNAHME_OUT: OUT, BUILD_ID: buildId },
  });

  execSync(`node scripts/export-run16-renderer-evidence.mjs`, {
    stdio: "inherit",
    env: { ...process.env, RUN16_ABNAHME_OUT: OUT, SITE_E2E_BASE_URL: BASE },
  });

  const bundleSrc = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json");
  const bundleDest = join(OUT, "EXPORTS/data/fleet-month-bundle.json");
  mkdirSync(join(OUT, "EXPORTS/data"), { recursive: true });
  cpSync(bundleSrc, bundleDest);
  writeFileSync(
    join(OUT, "EXPORTS/data/bundle-sha256.txt"),
    `${sha256File(bundleDest)}  fleet-month-bundle.json\n${readFileSync(bundleSrc).length} bytes\n`,
  );

  const bundlePath = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json");
  const dataManifest = JSON.parse(readFileSync(join(process.cwd(), "data/national-fleet/2026-10/manifest.json"), "utf8"));
  writeFileSync(
    join(OUT, "EXPORTS/data-manifest.json"),
    JSON.stringify(
      {
        tested_source_sha: commit,
        buildId,
        bundleSha256: sha256File(bundlePath),
        manifest: dataManifest,
        buildScript: "scripts/build-national-month-fleet-bundle.mjs",
        observationFallback: "data/month-observation/2026-10-auffaelligkeit.json",
      },
      null,
      2,
    ),
  );

  writeFileSync(join(OUT, "manifest-sha256.json"), JSON.stringify(manifest, null, 2));

  if (existsSync(RUN15_PRIOR)) {
    mkdirSync(join(OUT, "rejected-run15-partial"), { recursive: true });
    writeFileSync(
      join(OUT, "rejected-run15-partial/README.md"),
      "# Run15 — fast abgenommen; 29.10-Beleg falsch (ueberschuss), DOM-Hash, Doppelliste\n\nSiehe Fachcheck `fachcheck-produkt-run15`.\n",
    );
  }

  const solveSrc = join(process.cwd(), "artifacts/run15-public-solve-20261107/spitze-x1");
  if (existsSync(solveSrc)) {
    mkdirSync(join(OUT, "EXPORTS/solver"), { recursive: true });
    for (const name of ["solve_manifest.json", "bundle-compare.json", "solver-cli.log", "x1_min_peak_perfect_foresight.csv"]) {
      const p = join(solveSrc, name);
      if (existsSync(p)) {
        cpSync(p, join(OUT, "EXPORTS/solver", name));
      }
    }
  }

  const inventory = [];
  for (const f of manifest.files) {
    inventory.push({ path: f.path, sha256: f.sha256, kind: f.kind });
  }
  function walkInventory(dir, kind) {
    if (!existsSync(dir)) {
      return;
    }
    for (const ent of execSync(`find ${JSON.stringify(dir)} -type f`, { encoding: "utf8" }).trim().split("\n").filter(Boolean)) {
      inventory.push({ path: ent, sha256: sha256File(ent), kind });
    }
  }
  walkInventory(join(OUT, "EXPORTS/numeric"), "numeric");
  walkInventory(join(OUT, "EXPORTS/renderer"), "renderer-svg-dom");
  walkInventory(join(OUT, "EXPORTS/solver"), "solver");
  const textDoc = join(process.cwd(), "docs/RUN15_HAUPTTEXT_AENDERUNGEN.md");
  if (existsSync(textDoc)) {
    cpSync(textDoc, join(OUT, "RUN15_HAUPTTEXT_AENDERUNGEN.md"));
  }
  writeFileSync(
    join(OUT, "EXPORTS/dom-samples.json"),
    JSON.stringify(preflightReport.routes.map((r) => ({ name: r.name, dom: r.dom, overflow: r.overflow })), null, 2),
  );

  const md = `# LAUNCH Run16 Abnahme

**tested_source_sha:** \`${commit}\`  
**buildId:** \`${buildId}\`  
**Server:** ${BASE}  
**Preflight:** bestanden (kein \`#error-title\`, Fleet-Chart-SVG, Szenario-Wechsel)

## Abgelehnt: Run11
Siehe \`rejected-run11/\` — nicht als Produktabnahme verwenden.

## Grenznutzen / Daten
- \`bundle.marginal\` nur Überschuss-Pool; Spitze/Markt aus \`summary\` (siehe \`EXPORTS/numeric/marginal-by-strategy.json\`).
- Bundle-SHA Run9: \`${dataManifest.sha256}\` (2980 Viertelstunden)

## Öffentlicher Monats-Rechenweg
\`node scripts/solve-national-fleet-month.mjs solve-spitze-x1\` — Belege unter \`EXPORTS/solver/\` wenn vorhanden.

## Artefakte
- \`preflight-report.json\`, \`manifest-sha256.json\`, \`EXPORTS/file-sha256-inventory.json\`
- \`EXPORTS/renderer/\` — vollständige Polyline-\`points\`, Tabellen, Tooltip-Proben
- \`screenshots/\` — Desktop/Mobil, Hell/Dunkel
`;
  writeFileSync(join(OUT, "LAUNCH_RUN16_ABNAHME.md"), md);

  for (const name of [
    "preflight-report.json",
    "manifest-sha256.json",
    "EXPORTS/dom-samples.json",
    "EXPORTS/data/fleet-month-bundle.json",
    "RUN15_HAUPTTEXT_AENDERUNGEN.md",
    "LAUNCH_RUN16_ABNAHME.md",
  ]) {
    const p = join(OUT, name);
    if (existsSync(p)) {
      inventory.push({ path: p, sha256: sha256File(p), kind: "artifact" });
    }
  }
  writeFileSync(join(OUT, "EXPORTS/file-sha256-inventory.json"), JSON.stringify(inventory, null, 2));

  const invCheck = [];
  for (const item of inventory) {
    if (!existsSync(item.path)) {
      invCheck.push({ path: item.path, error: "missing" });
      continue;
    }
    const live = sha256File(item.path);
    if (live !== item.sha256) {
      invCheck.push({ path: item.path, error: "hash-mismatch", recorded: item.sha256, live });
    }
  }
  if (invCheck.length) {
    writeFileSync(join(OUT, "EXPORTS/inventory-validation-errors.json"), JSON.stringify(invCheck, null, 2));
    console.error("Inventar-Hash-Validierung fehlgeschlagen", invCheck.length);
    process.exitCode = 1;
  }

  const minScore = Math.min(...lhSummary.routes.map((r) => r.score));
  if (minScore < 100) {
    console.error("Lighthouse a11y below 100", lhSummary);
    process.exitCode = 1;
  }
  console.log("Wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
