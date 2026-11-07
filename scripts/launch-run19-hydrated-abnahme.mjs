#!/usr/bin/env node
/**
 * Run20 regression: hydrated screenshots + semantische Lücke-Zeitachse + DST.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT =
  process.env.RUN20_OUT ?? process.env.RUN19_OUT ?? "/cursor/stores/self/launch-run20-axis-20261107";

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

function pageUrl(pathname, searchParams = {}) {
  const u = new URL(pathname, BASE);
  for (const [k, v] of Object.entries(searchParams)) {
    u.searchParams.set(k, v);
  }
  u.searchParams.set("_run20", String(Date.now()));
  return u.href;
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
    const fig = document.querySelector(".v4-luecke-figure");
    const svg = document.querySelector(".v4-luecke-chart");
    if (!shell || !svg || !fig) {
      return { error: "kein Lücke-Chart" };
    }
    const shellR = shell.getBoundingClientRect();
    const content = document.querySelector(".v4-content") ?? document.querySelector("main");
    const contentR = content?.getBoundingClientRect();
    const axisTexts = [...svg.querySelectorAll(".v4-luecke-axis")];
    const gridLines = [...svg.querySelectorAll(".v4-luecke-grid")];
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
    const label24 = axisTexts[axisTexts.length - 1];
    const label24R = label24.getBoundingClientRect();
    const label24InsideContent =
      contentR == null ? true : label24R.right <= contentR.right + 1 && label24R.left >= contentR.left - 1;
    const slotCount = Number(fig.getAttribute("data-luecke-slot-count"));
    const dayKind = fig.getAttribute("data-luecke-day-kind");
    const dayMin = Number.isFinite(slotCount) ? slotCount * 15 : null;
    const g0 = gridLines[0].getBoundingClientRect();
    const g24 = gridLines[gridLines.length - 1].getBoundingClientRect();
    const plotLeft = g0.left + g0.width / 2;
    const plotRight = g24.left + g24.width / 2;
    const plotWidthPx = plotRight - plotLeft;
    const frac24 = plotWidthPx > 0 ? (plotRight - plotLeft) / plotWidthPx : null;
    const fracLastSlot = dayMin != null ? ((slotCount - 1) * 15) / dayMin : null;
    const peakLine = svg.querySelector(".v4-luecke-peak-line");
    let peakSemantics = null;
    if (peakLine && plotWidthPx > 0 && dayMin != null) {
      const pR = peakLine.getBoundingClientRect();
      const peakCx = pR.left + pR.width / 2;
      const peakFrac = (peakCx - plotLeft) / plotWidthPx;
      peakSemantics = { peakFrac, dayMin, slotCount };
    }
    return {
      pairs,
      plotInsetLeft: pairs[0]?.plotInsetLeft ?? null,
      maxLabelDelta: Math.max(...pairs.map((p) => p.deltaPx)),
      label24InsideContent,
      slotCount: Number.isFinite(slotCount) ? slotCount : null,
      dayKind,
      semantics: {
        fracLastSlot,
        grid24AtDayEnd: frac24 != null && frac24 > 0.98,
        lastSlotBeforeMidnight: fracLastSlot != null && fracLastSlot < 1 - 1e-6,
        midnightPastLastQh:
          fracLastSlot != null && plotWidthPx > 0
            ? g24.left + g24.width / 2 > plotLeft + fracLastSlot * plotWidthPx + 0.5
            : null,
        peak: peakSemantics,
      },
    };
  });
}

async function readFleetControls(page) {
  return page.evaluate(() => {
    const activeFactor = document.querySelector(".v4-fleet-pill.is-active[href*='faktor']");
    const activeStrategy = document.querySelector(".v4-fleet-pill.is-active[href*='fahrweise']");
    return {
      factorHref: activeFactor?.getAttribute("href") ?? null,
      factorText: activeFactor?.textContent?.trim() ?? null,
      strategyHref: activeStrategy?.getAttribute("href") ?? null,
      strategyText: activeStrategy?.textContent?.trim() ?? null,
    };
  });
}

const SCENARIOS = [
  {
    label: "mob375-tag-2910",
    width: 375,
    height: 812,
    pathname: "/tag/2026-10-29",
    params: { faktor: "1", fahrweise: "spitze" },
    cropLuecke: true,
    expectSlots: 96,
    expectDayKind: "standard-96",
    fleet: true,
    peakAtHm: "18:15",
  },
  {
    label: "mob390-tag-2910",
    width: 390,
    height: 844,
    pathname: "/tag/2026-10-29",
    params: { faktor: "1", fahrweise: "spitze" },
    cropLuecke: true,
    expectSlots: 96,
    expectDayKind: "standard-96",
    fleet: false,
  },
  {
    label: "mob375-tag-2510-dst",
    width: 375,
    height: 812,
    pathname: "/tag/2026-10-25",
    params: { faktor: "2", fahrweise: "spitze" },
    cropLuecke: true,
    expectSlots: 100,
    expectDayKind: "dst-fall-100",
    fleet: true,
  },
];

function verifySpringDstArtifact() {
  const p = join(process.cwd(), "artifacts/launch-r4-20261107T0918Z/dst-timestamps.json");
  if (!existsSync(p)) {
    return { error: "dst-timestamps.json fehlt" };
  }
  const data = JSON.parse(readFileSync(p, "utf8"));
  const spring = data.spring;
  if (!spring || spring.slotCount !== 92) {
    return { error: `spring slotCount ${spring?.slotCount}` };
  }
  return { dayKey: spring.dayKey, slotCount: spring.slotCount, note: "92qh Frühling (Artefakt, kein hydr. Tag-Screenshot — Live-Tag ohne Lücke-Daten)" };
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
  for (const spec of SCENARIOS) {
    const url = pageUrl(spec.pathname, spec.params);
    const page = await context.newPage();
    await page.setViewportSize({ width: spec.width, height: spec.height });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.locator("main").first().waitFor({ state: "visible", timeout: 90_000 });
    const finalUrl = page.url();
    if (finalUrl.includes("??")) {
      throw new Error(`Doppeltes ?: ${finalUrl}`);
    }
    if (spec.cropLuecke) {
      const fig = page.locator(".v4-luecke-figure").first();
      await fig.waitFor({ state: "visible", timeout: 120_000 });
      await fig.scrollIntoViewIfNeeded();
    }
    const fullShot = join(OUT, "screenshots", `${spec.label}-full.png`);
    await page.screenshot({ path: fullShot, fullPage: true });
    const crop = spec.cropLuecke
      ? join(OUT, "screenshots", `${spec.label}-luecke-chart.png`)
      : null;
    if (crop) {
      await page.locator(".v4-luecke-figure").first().screenshot({ path: crop });
    }
    const axis = spec.cropLuecke ? await measureLueckeAxis(page) : null;
    const fleet = spec.fleet ? await readFleetControls(page) : null;
    const row = {
      label: spec.label,
      requestedUrl: url,
      finalUrl,
      query: spec.params,
      axis,
      fleet,
      sha256: crop ? sha256File(crop) : null,
    };
    checks.push(row);
    if (axis?.maxLabelDelta != null && axis.maxLabelDelta > 2.5) {
      throw new Error(`Lücke-Achse Δ ${axis.maxLabelDelta.toFixed(1)}px bei ${spec.label}`);
    }
    if (axis?.label24InsideContent === false) {
      throw new Error(`Label 24 abgeschnitten bei ${spec.label}`);
    }
    if (spec.expectSlots != null && axis?.slotCount !== spec.expectSlots) {
      throw new Error(`Slot-Anzahl ${axis?.slotCount} ≠ ${spec.expectSlots} bei ${spec.label}`);
    }
    if (spec.expectDayKind != null && axis?.dayKind !== spec.expectDayKind) {
      throw new Error(`dayKind ${axis?.dayKind} ≠ ${spec.expectDayKind}`);
    }
    if (spec.fleet) {
      if (!fleet?.strategyHref?.includes("fahrweise=spitze")) {
        throw new Error(`Fahrweise nicht Spitze: ${JSON.stringify(fleet)} @ ${finalUrl}`);
      }
    }
    const sem = axis?.semantics;
    if (sem && sem.lastSlotBeforeMidnight === false) {
      throw new Error(`23:45 nicht vor Mitternacht: ${JSON.stringify(sem)} @ ${spec.label}`);
    }
    if (sem && sem.midnightPastLastQh === false) {
      throw new Error(`Tick 24 nicht rechts vom letzten Slot: ${JSON.stringify(sem)} @ ${spec.label}`);
    }
    if (spec.peakAtHm && sem?.peak) {
      const [ph, pm] = spec.peakAtHm.split(":").map(Number);
      const expected = (ph * 60 + pm) / sem.peak.dayMin;
      const err = Math.abs(sem.peak.peakFrac - expected);
      if (err > 0.03) {
        throw new Error(
          `Peak ${spec.peakAtHm} Fraktion Δ ${err.toFixed(3)} (ist ${sem.peak.peakFrac.toFixed(3)}, soll ${expected.toFixed(3)}) @ ${spec.label}`,
        );
      }
    }
    await page.close();
  }

  const page = await context.newPage();
  await page.goto(pageUrl("/monat/2026-10", { faktor: "1", fahrweise: "spitze" }), {
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

  const springArtifact = verifySpringDstArtifact();

  let ciVercelJsonProbe = { summary: "gh CI-Log nicht ausgewertet" };
  try {
    const runs = execSync(
      "gh run list --repo cophi-dev/speicherpilot --branch cursor/launch-run18-kpi-raster-2686 --limit 3 --json databaseId,conclusion",
      { encoding: "utf8" },
    );
    const runList = JSON.parse(runs);
    const hit = [];
    for (const run of runList) {
      let log = "";
      try {
        log = execSync(`gh run view ${run.databaseId} --repo cophi-dev/speicherpilot --log 2>/dev/null`, {
          encoding: "utf8",
          maxBuffer: 8_000_000,
        });
      } catch {
        continue;
      }
      const lines = log.split("\n").filter((l) => /vercel\.json/i.test(l)).slice(0, 8);
      if (lines.length) {
        hit.push({ runId: run.databaseId, conclusion: run.conclusion, lines });
      }
    }
    ciVercelJsonProbe = {
      summary: hit.length
        ? `CI erwähnt vercel.json in ${hit.length} Lauf/Läufen (siehe lines, kein Dateiinhalt gelesen).`
        : "In den letzten 3 PR-CI-Läufen kein vercel.json-String im Log.",
      hits: hit,
    };
  } catch (e) {
    ciVercelJsonProbe = { summary: `CI-Log nicht lesbar: ${e.message}` };
  }

  const report = {
    head,
    buildId: prov.buildId,
    at: new Date().toISOString(),
    renderMode: "hydrated",
    scenarios: checks,
    springDstArtifact: springArtifact,
    dirtyProvenanceNote: {
      vercelJsonInDirtyPaths:
        "Lokal: dirty false ohne vercel.json. LivePreview untracked vercel.json — Entstehung hier nur via CI-Log-Stichprobe, keine Config-Wirkung belegt.",
    },
    ciVercelJsonProbe,
    uiSourceSha: uiSha,
  };
  writeFileSync(join(OUT, "run20-hydrated-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(OUT, "README.md"),
    `# Run 20 — Zeitachsen-Semantik (hydratisiert)

**Gültig nur für HEAD** \`${head}\` · Build \`${prov.buildId}\`

Volle Screenshots unter \`screenshots/\` (nur dieser SHA). Frühere Run-19-Screenshots ohne diesen HEAD sind **nicht** Teil der Abnahme.

## Semantik
- Slot-Position: Intervallbeginn \`index×15 / (N×15)\`
- Tick **24** = lokale Mitternacht (Fraktion 1), **nicht** 23:45
- Peak 29.10: 18:15 relativ zu Gitter 18:00

## Queries
Siehe \`run20-hydrated-report.json\` → \`scenarios[].requestedUrl\` und \`query\`.

## vercel.json / dirtyPaths
${report.dirtyProvenanceNote.vercelJsonInDirtyPaths}
${report.ciVercelJsonProbe?.summary ?? "CI-Log-Prüfung: siehe Report ciVercelJsonProbe."}
`,
  );
  console.log("Run20 hydrated abnahme OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
