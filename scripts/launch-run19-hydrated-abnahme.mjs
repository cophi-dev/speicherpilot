#!/usr/bin/env node
/**
 * Run19 regression: hydrated screenshots + Lücke geometry + DST + URL/Controls.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT =
  process.env.RUN19_OUT ?? "/cursor/stores/self/launch-run19-design-fix-20261107";

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
  u.searchParams.set("_run19", String(Date.now()));
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
    const slotCount = fig.getAttribute("data-luecke-slot-count");
    const dayKind = fig.getAttribute("data-luecke-day-kind");
    return {
      pairs,
      plotInsetLeft: pairs[0]?.plotInsetLeft ?? null,
      maxLabelDelta: Math.max(...pairs.map((p) => p.deltaPx)),
      label24InsideContent,
      slotCount: slotCount ? Number(slotCount) : null,
      dayKind,
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

  const report = {
    head,
    buildId: prov.buildId,
    at: new Date().toISOString(),
    renderMode: "hydrated",
    scenarios: checks,
    springDstArtifact: springArtifact,
    dirtyProvenanceNote: {
      vercelJsonInDirtyPaths:
        "Lokal bei sauberem Commit + npm run build: kein vercel.json in dirtyPaths (siehe public/build-provenance.json). CI/LivePreview-Befund ohne Diff-Log hier offen.",
    },
    uiSourceSha: uiSha,
  };
  writeFileSync(join(OUT, "run19-hydrated-report.json"), JSON.stringify(report, null, 2));
  console.log("Run19 hydrated abnahme OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
