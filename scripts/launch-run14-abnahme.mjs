#!/usr/bin/env node
/**
 * Run14 acceptance: Preflight inkl. Overflow/DOM, 12 Szenarien, Interaktion, Lighthouse 100, Bundle-Bytes.
 * Requires fresh production server (SITE_E2E_BASE_URL, default http://127.0.0.1:3001).
 */
import { chromium } from "playwright";
import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = process.env.RUN14_ABNAHME_OUT ?? "/cursor/stores/self/launch-run14-abnahme-20261107";
const RUN13_PRIOR = "/cursor/stores/self/launch-run13-abnahme-20261107";

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
  { name: "tag-2026-10-29", path: "/tag/2026-10-29?faktor=1&fahrweise=ueberschuss", fleetDayTitle: true },
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

  const dom = await page.evaluate(() => {
    const cap = document.querySelector(".v4-fleet-caption-main")?.textContent?.trim() ?? null;
    const kpis = [...document.querySelectorAll(".v4-fleet-kpis dd")].map((el) => el.textContent?.trim());
    const svgW = document.querySelector(".v4-fleet-ts-svg")?.getAttribute("width") ?? null;
    const scroll = document.querySelector(".v4-fleet-ts-scroll");
    const chartFill =
      scroll && svgW ? Number(svgW) / Math.max(1, scroll.clientWidth) : null;
    const polylines = [...document.querySelectorAll(".v4-fleet-ts-svg polyline")].map((el) => ({
      class: el.getAttribute("class"),
      pointsHead: (el.getAttribute("points") ?? "").slice(0, 120),
      pointCount: (el.getAttribute("points") ?? "").split(" ").length,
    }));
    const marginalCells = [...document.querySelectorAll(".v4-fleet-marginal-table td")].slice(0, 24).map((el) => el.textContent?.trim());
    const ticks = [...document.querySelectorAll(".v4-fleet-ts-tick")].map((el) => el.textContent?.trim());
    return { caption: cap, kpis, svgWidth: svgW, chartFillRatio: chartFill, ticks, polylines, marginalCells };
  });

  if (url.includes("/monat/2026-10") && dom.chartFillRatio != null && (dom.chartFillRatio < 0.92 || dom.chartFillRatio > 1.08)) {
    errors.push(`Monatschart füllt Viewport nicht (${dom.chartFillRatio?.toFixed(2)}×)`);
  }

  if (url.includes("/tag/") && dom.chartFillRatio != null && dom.chartFillRatio < 0.85) {
    errors.push(`Tages-Chart nutzt nur ${(dom.chartFillRatio * 100).toFixed(0)}% der Scrollbreite`);
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

  await page.locator("details.v4-monat-list-fallback").evaluate((el) => {
    el.open = true;
  });
  const tagLink = page.locator('.v4-monat-list a[href*="2026-10-24"]').first();
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
      expect: { fleetDayTitle: true, chart: true },
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
    env: { ...process.env, RUN14_EXPORT_OUT: join(OUT, "EXPORTS/numeric"), BUILD_ID: buildId },
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

  if (existsSync(RUN13_PRIOR)) {
    mkdirSync(join(OUT, "rejected-run13"), { recursive: true });
    writeFileSync(
      join(OUT, "rejected-run13/README.md"),
      "# Run13 — weiterhin nicht launchfähig (Monats-Viewport, Overflow, Story)\n\nBelege unverändert unter `launch-run13-abnahme-20261107/`.\n",
    );
  }

  const inventory = [];
  for (const f of manifest.files) {
    inventory.push({ path: f.path, sha256: f.sha256, kind: f.kind });
  }
  for (const name of ["preflight-report.json", "manifest-sha256.json", "EXPORTS/data/fleet-month-bundle.json"]) {
    const p = join(OUT, name);
    if (existsSync(p)) {
      inventory.push({ path: p, sha256: sha256File(p), kind: "artifact" });
    }
  }
  writeFileSync(join(OUT, "EXPORTS/file-sha256-inventory.json"), JSON.stringify(inventory, null, 2));

  writeFileSync(
    join(OUT, "EXPORTS/svg-dom-samples.json"),
    JSON.stringify(
      preflightReport.routes.map((r) => ({
        name: r.name,
        polylines: r.dom?.polylines,
        ticks: r.dom?.ticks,
        marginalCells: r.dom?.marginalCells,
      })),
      null,
      2,
    ),
  );

  const md = `# LAUNCH Run14 Abnahme

**tested_source_sha:** \`${commit}\`  
**buildId:** \`${buildId}\`  
**Server:** ${BASE}  
**Preflight:** bestanden (kein \`#error-title\`, Fleet-Chart-SVG, Szenario-Wechsel)

## Abgelehnt: Run11
Siehe \`rejected-run11/\` — nicht als Produktabnahme verwenden.

## Grenznutzen / Daten
- \`bundle.marginal\` nur Überschuss-Pool; Spitze/Markt aus \`summary\` (siehe \`EXPORTS/numeric/marginal-by-strategy.json\`).
- Bundle-SHA Run9: \`${dataManifest.sha256}\` (2980 Viertelstunden)

## Öffentlicher Monats-Rechenweg (begrenzt)
Siehe Repo \`docs/MONATS_MODELL_DATENWEG.md\` — Oktober fix importiert; weitere volle Monate **nicht** automatisch.

## Artefakte
- \`preflight-report.json\`, \`manifest-sha256.json\`
- \`screenshots/\` — Desktop/Mobil, Hell/Dunkel (eigenständige SHAs)
- \`EXPORTS/numeric/\` — KPIs, Marginal, Tag 29.10 / DST 25.10, Chart-Stichproben
`;
  writeFileSync(join(OUT, "LAUNCH_RUN14_ABNAHME.md"), md);
  writeFileSync(join(OUT, "EXPORTS/dom-samples.json"), JSON.stringify(preflightReport.routes.map((r) => ({ name: r.name, dom: r.dom, overflow: r.overflow })), null, 2));

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
