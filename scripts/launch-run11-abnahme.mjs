#!/usr/bin/env node
/**
 * Run11 acceptance bundle: screenshots (light/dark, 375/390/1280) + Lighthouse a11y JSON.
 * Requires production server: SITE_E2E_BASE_URL (default http://127.0.0.1:3000).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT =
  process.env.RUN11_ABNAHME_OUT ?? "/cursor/stores/self/launch-run11-abnahme-20261107";

const PAGES = [
  { path: "/monat/2026-10?faktor=1&fahrweise=ueberschuss", name: "monat-fleet-x1-diff" },
  { path: "/monat/2026-10?faktor=5&fahrweise=markt", name: "monat-fleet-x5-markt" },
  { path: "/tag/2026-10-24?faktor=2&fahrweise=spitze", name: "tag-fleet-x2-spitze" },
  { path: "/monat/2026-11", name: "monat-nov-kein-modell" },
];

const VIEWPORTS = [
  { width: 1280, height: 900, label: "desktop" },
  { width: 390, height: 844, label: "mob390" },
  { width: 375, height: 812, label: "mob375" },
];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function main() {
  const shotsDir = join(OUT, "screenshots");
  const lhDir = join(OUT, "lighthouse");
  const exportsDir = join(OUT, "EXPORTS");
  mkdirSync(shotsDir, { recursive: true });
  mkdirSync(lhDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });

  const commit = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: process.cwd() }).trim();
  const manifest = {
    at: new Date().toISOString(),
    commit,
    base: BASE,
    pages: PAGES,
    files: [],
  };

  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const p of PAGES) {
        const url = `${BASE}${p.path}`;
        await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
        await setTheme(page, theme);
        await page.waitForTimeout(400);
        const file = join(shotsDir, `${p.name}-${vp.label}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        manifest.files.push({
          kind: "screenshot",
          path: file,
          sha256: sha256File(file),
          url,
          viewport: vp.label,
          theme,
        });
      }
      await page.close();
    }
  }
  await browser.close();

  const lhSummary = { base: BASE, commit, at: new Date().toISOString(), routes: [] };
  for (const p of PAGES) {
    const slug = p.name;
    const outFile = join(lhDir, `a11y-${slug}.json`);
    const url = `${BASE}${p.path}`;
    execSync(
      [
        "pnpm",
        "dlx",
        "lighthouse@12.6.1",
        url,
        "--only-categories=accessibility",
        "--output=json",
        `--output-path=${outFile}`,
        '--chrome-flags=--headless --no-sandbox --disable-gpu',
        "--quiet",
      ].join(" "),
      { stdio: "inherit", timeout: 240_000, shell: true },
    );
    const report = JSON.parse(readFileSync(outFile, "utf8"));
    const score = Math.round((report.categories?.accessibility?.score ?? 0) * 100);
    lhSummary.routes.push({ path: p.path, score, outFile, sha256: sha256File(outFile) });
    manifest.files.push({
      kind: "lighthouse",
      path: outFile,
      sha256: sha256File(outFile),
      score,
    });
  }
  writeFileSync(join(lhDir, "lighthouse-a11y-summary.json"), JSON.stringify(lhSummary, null, 2));

  const bundlePath = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json");
  const dataManifest = JSON.parse(readFileSync(join(process.cwd(), "data/national-fleet/2026-10/manifest.json"), "utf8"));
  writeFileSync(
    join(exportsDir, "data-manifest.json"),
    JSON.stringify(
      {
        bundleSha256: sha256File(bundlePath),
        manifest: dataManifest,
        buildScript: "scripts/build-national-month-fleet-bundle.mjs",
      },
      null,
      2,
    ),
  );

  writeFileSync(join(OUT, "manifest-sha256.json"), JSON.stringify(manifest, null, 2));

  const matrix = `# LAUNCH Run11 Abnahme

Commit: \`${commit}\`
Server: ${BASE}

## Screenshots
| Seite | Desktop Hell/Dunkel | Mobil 375 | Mobil 390 |
|-------|---------------------|-----------|-----------|
| Monat ×1 Differenz | \`monat-fleet-x1-diff-desktop-*\` | \`mob375\` | \`mob390\` |
| Monat ×5 Markt | \`monat-fleet-x5-markt-*\` | | |
| Tag ×2 Spitze | \`tag-fleet-x2-spitze-*\` | | |
| Nov ohne Modell | \`monat-nov-kein-modell-*\` | | |

## URLs (manuell prüfbar)
- ${BASE}/monat/2026-10?faktor=1&fahrweise=ueberschuss
- ${BASE}/monat/2026-10?faktor=10&fahrweise=markt
- ${BASE}/tag/2026-10-24?faktor=2&fahrweise=spitze
- ${BASE}/monat/2026-11

## Lighthouse a11y
Siehe \`lighthouse/lighthouse-a11y-summary.json\` (originale JSON pro Route).

## Daten
\`EXPORTS/data-manifest.json\` — Bundle-SHA aus Repo, kein Agent-Pfad für Laufzeit nötig.
`;
  writeFileSync(join(OUT, "LAUNCH_RUN11_ABNAHME.md"), matrix);

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
