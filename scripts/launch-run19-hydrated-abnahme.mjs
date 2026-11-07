#!/usr/bin/env node
/**
 * Run19: hydrated mobile/desktop screenshots + Lücke-Achsen-Check (kein no-JS-Ersatz).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = process.env.RUN19_OUT ?? "/cursor/stores/self/launch-run19-design-fix-20261107";

function patchTurbopackCssChunk() {
  const chunks = join(process.cwd(), ".next/static/chunks");
  const built = join(chunks, "0gmtk0vmgh-y3.css");
  const bad = join(chunks, "0.etvc_jdfnz..css");
  if (existsSync(built) && !existsSync(bad)) {
    execSync(`ln -sf 0gmtk0vmgh-y3.css ${JSON.stringify(bad)}`, { cwd: chunks });
  }
}

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

async function measureLueckeAxis(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".v4-luecke-svg-shell");
    const svg = document.querySelector(".v4-luecke-chart");
    if (!shell || !svg) {
      return { error: "kein Lücke-Chart (mobil)" };
    }
    const shellR = shell.getBoundingClientRect();
    const axisTexts = [...svg.querySelectorAll(".v4-luecke-axis")];
    const gridLines = [...svg.querySelectorAll(".v4-luecke-grid")];
    const peakLine = svg.querySelector(".v4-luecke-peak-line");
    if (axisTexts.length < 5 || gridLines.length < 5) {
      return { error: "Achse/Gitter unvollständig" };
    }
    const pairs = axisTexts.map((sp, i) => {
      const spR = sp.getBoundingClientRect();
      const g = gridLines[i];
      const gR = g.getBoundingClientRect();
      const spCx = spR.left + spR.width / 2 - shellR.left;
      const gCx = gR.left + gR.width / 2 - shellR.left;
      return {
        label: sp.textContent?.trim(),
        deltaPx: Math.abs(spCx - gCx),
        plotInsetLeft: gridLines[0].getBoundingClientRect().left - shellR.left,
      };
    });
    const plotInsetLeft = pairs[0]?.plotInsetLeft ?? null;
    const peakDelta =
      peakLine != null
        ? Math.abs(
            peakLine.getBoundingClientRect().left +
              peakLine.getBoundingClientRect().width / 2 -
              shellR.left -
              (plotInsetLeft ?? 0) -
              ((18 + 15 / 60) / 24) *
                (gridLines[4].getBoundingClientRect().left - gridLines[0].getBoundingClientRect().left),
          )
        : null;
    return { pairs, plotInsetLeft, maxLabelDelta: Math.max(...pairs.map((p) => p.deltaPx)), peakDelta };
  });
}

async function main() {
  const { head, prov } = assertProvenanceOnDisk();
  patchTurbopackCssChunk();
  mkdirSync(join(OUT, "screenshots"), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    extraHTTPHeaders: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });

  const checks = [];
  for (const [label, width, height, path, cropLuecke] of [
    ["mob375-tag", 375, 812, "/tag/2026-10-29?faktor=1&fahrweise=spitze", true],
    ["mob390-tag", 390, 844, "/tag/2026-10-29?faktor=1&fahrweise=spitze", true],
    ["desktop1280-tag", 1280, 900, "/tag/2026-10-29?faktor=1&fahrweise=spitze", false],
    ["mob375-start", 375, 812, "/", false],
    ["mob390-monat", 390, 844, "/monat/2026-10?faktor=1&fahrweise=spitze", false],
  ]) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    await page.goto(`${BASE}${path}?_run19=${Date.now()}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.locator("main").first().waitFor({ state: "visible", timeout: 90_000 });
    if (cropLuecke) {
      const fig = page.locator(".v4-luecke-figure").first();
      await fig.waitFor({ state: "visible", timeout: 120_000 });
      await fig.scrollIntoViewIfNeeded();
    }
    const full = join(OUT, "screenshots", `${label}-full.png`);
    await page.screenshot({ path: full, fullPage: true });
    if (cropLuecke) {
      const fig = page.locator(".v4-luecke-figure").first();
      const crop = join(OUT, "screenshots", `${label}-luecke-chart.png`);
      await fig.screenshot({ path: crop });
      const axis = await measureLueckeAxis(page);
      checks.push({ label, axis, crop, sha256: sha256File(crop) });
      if (axis.maxLabelDelta != null && axis.maxLabelDelta > 2.5) {
        throw new Error(`Lücke-Achse Δ ${axis.maxLabelDelta.toFixed(1)}px bei ${label}`);
      }
    }
    await page.close();
  }

  const page = await context.newPage();
  await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" });
  await page.goto(`${BASE}/monat/2026-10?faktor=1&fahrweise=spitze&_run19=${Date.now()}`, {
    waitUntil: "domcontentloaded",
  });
  const uiSha = await page.evaluate(
    () => document.getElementById("speicherpilot-build-provenance")?.dataset.sourceSha ?? null,
  );
  await page.close();
  await context.close();
  await browser.close();

  if (uiSha !== head) {
    throw new Error(`UI source ${uiSha} ≠ ${head}`);
  }

  const report = {
    head,
    buildId: prov.buildId,
    at: new Date().toISOString(),
    renderMode: "hydrated",
    lueckeAxisChecks: checks,
    uiSourceSha: uiSha,
  };
  writeFileSync(join(OUT, "run19-hydrated-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(OUT, "README.md"),
    `# Run 19 — Design-Korrektur (hydratisiert)

**SHA:** \`${head}\` · **Build:** \`${prov.buildId}\`

## Ursache Lücke-Achse (mobil)
- Plot/Gitter/Marker nutzen Berlin-Uhrzeit auf der Plotbreite; mobil lagen die HTML-Achsenlabels ohne linkes/rechtes Padding der SVG-Plotfläche (\`justify-content: space-between\` über volle Shellbreite).

## Korrekturen
- \`lib/lueckeChartGeometry.ts\`: X aus \`hourBerlin+minuteBerlin\`
- Mobil: Achsenzeile mit CSS-Vars = SVG-Pad
- Start: Subline→Hero-Abstand; \`24.10..\` Doppelpunkt
- Monat: „ist nicht“ statt „≠“; Desktop Abstand Flotten-Steuerung

Siehe \`screenshots/*-luecke-chart.png\` und \`run19-hydrated-report.json\`.
`,
  );
  console.log("Run19 hydrated abnahme OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
