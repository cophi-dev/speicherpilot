#!/usr/bin/env node
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ensureArtifactDir, getBaseUrl, gitPathsChanged, loadJson, writeReport } from "./common.mjs";

const VIEWPORTS = [
  { width: 1280, height: 900, tag: "1280" },
  { width: 390, height: 844, tag: "390" },
];

function routesFromDiff(files) {
  const routes = new Set(["/"]);
  const budgets = loadJson("verify/performance-budgets.json");
  const samples = Object.fromEntries(budgets.pageTypes.flatMap((t) => t.paths.map((p) => [t.id, p])));

  for (const file of files) {
    if (file === "app/page.tsx") routes.add("/");
    const appMatch = file.match(/^app\/([^/]+)\/page\.tsx$/);
    if (appMatch && appMatch[1] !== "tag" && appMatch[1] !== "monat" && appMatch[1] !== "beitraege") {
      routes.add(`/${appMatch[1]}`);
    }
    if (file.startsWith("app/tag/") || file.includes("TagPage") || file.includes("tag/")) {
      routes.add(samples.tag ?? "/tag/2026-10-29");
    }
    if (file.startsWith("app/monat/") || file.includes("MonatPage") || file.includes("monat")) {
      routes.add(samples.monat ?? "/monat/2026-11");
    }
    if (file.startsWith("app/beitraege/") || file.startsWith("content/blog/")) {
      routes.add("/beitraege");
      const slugMatch = file.match(/content\/blog\/([^/]+)\.md/) ?? file.match(/beitraege\/\[slug\]/);
      if (slugMatch?.[1] && !slugMatch[1].includes("[")) {
        routes.add(`/beitraege/${slugMatch[1].replace(/\.md$/, "")}`);
      }
    }
    if (file.startsWith("components/") || file.startsWith("app/globals.css")) {
      routes.add(samples.home ?? "/");
    }
  }
  return [...routes];
}

function interactionTouched(files) {
  return files.some(
    (f) =>
      f.includes(".client.tsx") ||
      f.includes(".client.ts") ||
      f.includes("useState") ||
      f.match(/components\/.*(Slider|Workbench|Configurator)/),
  );
}

async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function main() {
  const base = getBaseUrl();
  const files = gitPathsChanged(process.env.VERIFY_BASE_REF ?? "origin/main");
  const routes = routesFromDiff(files);
  const withVideo = interactionTouched(files);
  const outDir = ensureArtifactDir("screenshots");
  const captures = [];

  const browser = await chromium.launch();
  for (const route of routes) {
    for (const vp of VIEWPORTS) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          recordVideo: withVideo ? { dir: join(outDir, "video"), size: { width: vp.width, height: vp.height } } : undefined,
        });
        const page = await context.newPage();
        await page.addInitScript((t) => {
          document.documentElement.classList.toggle("dark", t === "dark");
          localStorage.setItem("speicherpilot-theme", t);
        }, theme);
        const slug = route.replace(/[^\w-]+/g, "_").replace(/^_+/, "") || "root";
        const file = join(outDir, `${slug}-${vp.tag}-${theme}.png`);
        try {
          await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 120_000 });
          await setTheme(page, theme);
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: file, fullPage: true });
          captures.push({ route, viewport: vp.tag, theme, file });
        } catch (error) {
          captures.push({ route, viewport: vp.tag, theme, error: String(error) });
        }
        await context.close();
      }
    }
  }
  await browser.close();

  const manifest = { base, routes, filesChanged: files, captures, withVideo, at: new Date().toISOString() };
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const reportPath = writeReport("screenshots-report.json", manifest);
  console.log(JSON.stringify({ ...manifest, reportPath }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});