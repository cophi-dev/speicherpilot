#!/usr/bin/env node
/**
 * Design-Run Belege: CLS /monat 1280, Tab-Wechsel, X-Achsen-Crop 375 dark.
 * Usage: pnpm build && node scripts/design-run-seitenpaket.mjs --port=3095
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3095);
const base = `http://127.0.0.1:${port}`;
const outDir = join(process.cwd(), "review-artifacts/seitenpaket-20261109/design-run");

function gitHead() {
  try {
    const raw = readFileSync(join(process.cwd(), "lib/buildProvenance.generated.ts"), "utf8");
    const m = raw.match(/"commit":"([^"]+)"/);
    return m?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function measureCls(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      let score = 0;
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!(e).hadRecentInput) {
            score += (e).value;
          }
        }
      });
      po.observe({ type: "layout-shift", buffered: true });
      window.setTimeout(() => {
        po.disconnect();
        resolve(Math.round(score * 1000) / 1000);
      }, 4500);
    });
  });
}

const server = spawn("pnpm", ["start", "-p", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let ready = false;
server.stdout.on("data", (d) => {
  if (String(d).includes("Ready")) ready = true;
});

for (let i = 0; i < 80 && !ready; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(base)).ok) {
      ready = true;
      break;
    }
  } catch {
    /* wait */
  }
}

if (!ready) {
  server.kill();
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const head = gitHead();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  colorScheme: "light",
});
const page = await context.newPage();

await page.goto(`${base}/monat/2026-10?faktor=1&fahrweise=spitze`, { waitUntil: "domcontentloaded" });
const clsBeforeWarm = await measureCls(page);

await page.goto(`${base}/monat/2026-10?faktor=1&fahrweise=spitze`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".v4-fleet-ts-wrap:not(.v4-fleet-ts-skeleton)", { timeout: 20000 }).catch(() => {});
const clsAfter = await measureCls(page);

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function navLinkHref(page, label) {
  const link = page.locator(
    label === "Tag"
      ? 'nav#site-desktop-nav a[href^="/tag/"]'
      : label === "Monat"
        ? 'nav#site-desktop-nav a[href^="/monat/"]'
        : 'nav#site-desktop-nav a[href="/"]',
  );
  return link.first().getAttribute("href");
}

async function measureTabOnce(page, fromPath, targetLabel) {
  await page.goto(`${base}${fromPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("nav#site-desktop-nav", { timeout: 20000 });
  const href = await navLinkHref(page, targetLabel);
  if (!href) {
    throw new Error(`missing nav link ${targetLabel}`);
  }
  const t0 = Date.now();
  await Promise.all([
    page.waitForURL((url) => {
      if (targetLabel === "Start") return url.pathname === "/";
      if (targetLabel === "Tag") return url.pathname.startsWith("/tag/");
      return url.pathname.startsWith("/monat/");
    }, { timeout: 20000 }),
    page.click(`nav#site-desktop-nav a[href="${href}"]`),
  ]);
  await page.waitForSelector("#auffaelligkeit-h1, h1, .v4-start-h1", { timeout: 20000 });
  return { ms: Date.now() - t0, href };
}

async function medianTab(page, fromPath, targetLabel, runs, cold) {
  const effectiveRuns = cold ? Math.min(3, runs) : runs;
  const samples = [];
  let href = null;
  for (let i = 0; i < effectiveRuns; i += 1) {
    if (cold && i === 0) {
      await page.goto(`${base}${fromPath}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          /* ignore */
        }
      });
    }
    const r = await measureTabOnce(page, fromPath, targetLabel);
    href = r.href;
    samples.push(r.ms);
    await sleep(120);
  }
  return { href, samples, medianMs: Math.round(median(samples)) };
}

const TAB_RUNS = 7;
const tabWarm = {};
const tabCold = {};
const warmRoutes = [
  ["start_to_tag", "/", "Tag"],
  ["tag_to_monat", null, "Monat"],
  ["monat_to_start", "/monat/2026-10?faktor=1", "Start"],
];
for (const [name, from, label] of warmRoutes) {
  const fromPath = from ?? (await (async () => {
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    const h = await navLinkHref(page, "Tag");
    const u = new URL(h, base);
    return `${u.pathname}${u.search}`;
  })());
  tabWarm[name] = await medianTab(page, fromPath, label, TAB_RUNS, false);
}
for (const [name, from, label] of warmRoutes) {
  const fromPath = from ?? tabWarm.start_to_tag?.href ?? "/";
  tabCold[name] = await medianTab(page, fromPath, label, TAB_RUNS, true);
}

const dark375 = await browser.newContext({
  viewport: { width: 375, height: 812 },
  colorScheme: "dark",
});
const p375 = await dark375.newPage();
await p375.goto(`${base}/monat/2026-10?faktor=1&fahrweise=spitze`, { waitUntil: "domcontentloaded" });
await p375.waitForSelector(".v4-fleet-ts-x", { timeout: 20000 });
const xAxis = await p375.locator(".v4-fleet-ts-x").first();
await xAxis.screenshot({ path: join(outDir, `x-axis-375-dark-${head.slice(0, 7)}.png`) });

const report = {
  headSha: head,
  measuredAt: new Date().toISOString(),
  cls: {
    monat1280_firstPaint: clsBeforeWarm,
    monat1280_afterChart: clsAfter,
    note: "layout-shift PerformanceObserver ~4.5s Fenster nach Navigation",
  },
  tabSwitchMs: { warm: tabWarm, cold: tabCold, runs: TAB_RUNS },
  viewport: { monatCls: "1280x900 light", xCrop: "375x812 dark" },
};

writeFileSync(join(outDir, `design-run-${head.slice(0, 7)}.json`), JSON.stringify(report, null, 2));
const befundUpload = "/home/ubuntu/.cursor/projects/agent-repos-speicherpilot/uploads/BEFUND_70cc.md";
try {
  writeFileSync(join(outDir, "BEFUND-design-baseline.md"), readFileSync(befundUpload, "utf8"));
} catch {
  /* optional */
}

await browser.close();
server.kill();
console.log(JSON.stringify(report, null, 2));
