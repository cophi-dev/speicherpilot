#!/usr/bin/env node
/**
 * Paket 4 visuell — gestylte Production-Screens. `pnpm build && pnpm start -p 3001` vorher.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = join(process.cwd(), "docs/audit-2026-11/paket4/screens");
const LH = join(process.cwd(), "docs/audit-2026-11/paket4");

function patchTurbopackCssChunk() {
  const chunks = join(process.cwd(), ".next/static/chunks");
  if (!existsSync(chunks)) return;
  const builtList = readdirSync(chunks).filter((f) => f.endsWith(".css") && !f.includes(".."));
  if (!builtList.length) return;
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
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function applyTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function waitStyled(page) {
  await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => {
      const font = getComputedStyle(document.body).fontFamily.toLowerCase();
      return font.includes("space") || font.includes("grotesk");
    },
    { timeout: 45_000 },
  );
}

const SHOTS = [
  {
    file: "monat-2026-10-1440-dark.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 1440,
    h: 900,
    theme: "dark",
    fullPage: true,
  },
  {
    file: "monat-2026-10-1440-light.png",
    path: "/monat/2026-10?faktor=1&fahrweise=spitze&morph=1",
    w: 1440,
    h: 900,
    theme: "light",
    fullPage: true,
  },
  {
    file: "monat-2026-10-390-dark-top.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt",
    w: 390,
    h: 844,
    theme: "dark",
    scrollY: 0,
  },
  {
    file: "monat-2026-10-390-dark-miniplots.png",
    path: "/monat/2026-10?faktor=5&fahrweise=spitze",
    w: 390,
    h: 844,
    theme: "dark",
    scrollTo: "#monat-arbeit-wirkung-title",
  },
  {
    file: "monat-2026-10-390-light-top.png",
    path: "/monat/2026-10?faktor=1&fahrweise=markt",
    w: 390,
    h: 844,
    theme: "light",
    scrollY: 0,
  },
  {
    file: "monat-2026-10-390-light-miniplots.png",
    path: "/monat/2026-10?faktor=5&fahrweise=spitze",
    w: 390,
    h: 844,
    theme: "light",
    scrollTo: "#monat-arbeit-wirkung-title",
  },
  {
    file: "monat-2026-10-1440-c-morph0.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=0",
    w: 1440,
    h: 900,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  {
    file: "monat-2026-10-1440-c-morph05.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=0.5",
    w: 1440,
    h: 900,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  {
    file: "monat-2026-10-1440-c-morph1.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 1440,
    h: 900,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  {
    file: "monat-2026-10-390-c-morph0.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=0",
    w: 390,
    h: 844,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  {
    file: "monat-2026-10-390-c-morph05.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=0.5",
    w: 390,
    h: 844,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  {
    file: "monat-2026-10-390-c-morph1.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 390,
    h: 844,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  { file: "ort-390-dark.png", path: "/ort", w: 390, h: 844, theme: "dark" },
  { file: "ort-390-light.png", path: "/ort", w: 390, h: 844, theme: "light" },
];

async function main() {
  patchTurbopackCssChunk();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    await preparePage(page, s.theme);
    await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await applyTheme(page, s.theme);
    await waitStyled(page);
    await page.waitForSelector("#monat-arbeit-wirkung-title, [data-testid=ort-unb-hinweis]", { timeout: 60_000 }).catch(() => {});
    if (s.scrollY != null) {
      await page.evaluate((y) => window.scrollTo(0, y), s.scrollY);
    }
    if (s.scrollTo) {
      await page.locator(s.scrollTo).scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(OUT, s.file), fullPage: Boolean(s.fullPage) });
    await page.close();
  }
  await browser.close();

  const lhSummary = [];
  for (const route of ["/monat/2026-10?faktor=10&fahrweise=markt", "/ort"]) {
    const outFile = join(LH, `lighthouse-${route.includes("monat") ? "monat" : "ort"}-mobile.json`);
    execSync(
      `pnpm dlx lighthouse@12.6.1 ${JSON.stringify(BASE + route)} --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile=true --output=json --output-path=${JSON.stringify(outFile)} --chrome-flags="--headless --no-sandbox" --quiet`,
      { stdio: "inherit" },
    );
    const report = JSON.parse(readFileSync(outFile, "utf8"));
    lhSummary.push({
      route,
      perf: Math.round((report.categories.performance?.score ?? 0) * 100),
      a11y: Math.round((report.categories.accessibility?.score ?? 0) * 100),
      cls: report.audits["cumulative-layout-shift"]?.numericValue ?? null,
    });
  }
  writeFileSync(join(LH, "lighthouse-summary.json"), JSON.stringify(lhSummary, null, 2));
  console.log("OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
