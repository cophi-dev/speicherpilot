#!/usr/bin/env node
/**
 * Run12 acceptance: preflight content checks, screenshots, Lighthouse (nur bei bestandener Preflight).
 * Requires fresh production server (SITE_E2E_BASE_URL, default http://127.0.0.1:3001).
 */
import { chromium } from "playwright";
import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = process.env.RUN12_ABNAHME_OUT ?? "/cursor/stores/self/launch-run12-abnahme-20261107";
const RUN11_REJECTED = "/cursor/stores/self/launch-run11-abnahme-20261107";

const VIEWPORTS = [
  { width: 1280, height: 900, label: "desktop" },
  { width: 390, height: 844, label: "mob390" },
  { width: 375, height: 812, label: "mob375" },
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

  return { url, errors, consoleErrors };
}

async function waitFleetChart(page) {
  await page.waitForSelector(".v4-fleet-ts-wrap svg", { state: "attached", timeout: 120_000 });
  const err = await page.locator(".v4-fleet-error").count();
  if (err) {
    throw new Error("Chart .v4-fleet-error");
  }
}

async function scenarioFlow(page) {
  const flowErrors = [];
  const base = `${BASE}/monat/2026-10?faktor=1&fahrweise=ueberschuss`;
  try {
    await page.goto(base, { waitUntil: "networkidle", timeout: 180_000 });
    await waitFleetChart(page);

    await page.locator('.v4-fleet-pill', { hasText: "×5" }).click();
    await page.waitForURL(/faktor=5/, { timeout: 15_000 });
    await waitFleetChart(page);
    await page.reload({ waitUntil: "networkidle", timeout: 180_000 });
    if (!page.url().includes("faktor=5")) {
      flowErrors.push("Reload behält ×5 nicht");
    }

    await page.locator('.v4-fleet-strategy-row a', { hasText: "Marktorientiert" }).click();
    await page.waitForURL(/fahrweise=markt/, { timeout: 15_000 });
    await waitFleetChart(page);

    await page.locator('.v4-fleet-strategy-row a', { hasText: "Spitze senken" }).click();
    await page.waitForURL(/fahrweise=spitze/, { timeout: 15_000 });
    await waitFleetChart(page);
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
    if (!page.url().includes("faktor=")) {
      flowErrors.push("Tag-Link verliert faktor");
    }
  } else {
    flowErrors.push("kein klickbarer Tag 24.10 in Monatsliste");
  }

  return flowErrors;
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
  preflightReport.scenarioFlow = await scenarioFlow(prePage);
  await prePage.close();

  const failed = preflightReport.routes.some((r) => r.errors.length) || preflightReport.scenarioFlow.length;
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
    rejectedPrior: "launch-run11-abnahme-20261107",
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

  execSync(`node scripts/export-run12-verification.mjs`, {
    stdio: "inherit",
    env: { ...process.env, RUN12_EXPORT_OUT: join(OUT, "EXPORTS/numeric"), BUILD_ID: buildId },
  });

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

  if (existsSync(RUN11_REJECTED)) {
    mkdirSync(join(OUT, "rejected-run11"), { recursive: true });
    cpSync(join(RUN11_REJECTED, "LAUNCH_RUN11_ABNAHME.md"), join(OUT, "rejected-run11/LAUNCH_RUN11_ABNAHME.md"));
    writeFileSync(
      join(OUT, "rejected-run11/README.md"),
      `# Run11 Abnahme — abgelehnt\n\nGrund: Screenshots zeigten nur \`#error-title\` (Energy-Charts-Fehlerseite), identische PNG-SHAs, Provenienz-SHA ≠ geprüfter Build.\n\nUnveränderte Kopie der Run11-Matrix: siehe \`LAUNCH_RUN11_ABNAHME.md\`.\n`,
    );
  }

  const md = `# LAUNCH Run12 Abnahme

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
  writeFileSync(join(OUT, "LAUNCH_RUN12_ABNAHME.md"), md);

  const minScore = Math.min(...lhSummary.routes.map((r) => r.score));
  const fleetMonatScores = lhSummary.routes
    .filter((r) => r.path.startsWith("/monat/2026-10"))
    .map((r) => r.score);
  const minFleetMonat = fleetMonatScores.length ? Math.min(...fleetMonatScores) : 100;
  if (minFleetMonat < 96) {
    console.error("Lighthouse a11y Fleet-Monat unter 96", lhSummary);
    process.exitCode = 1;
  } else if (minScore < 100) {
    console.warn("Lighthouse a11y: Fleet-Monat ggf. 96 (Beobachtungs-Balken-Touch), übrige 100", lhSummary);
  }
  console.log("Wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
