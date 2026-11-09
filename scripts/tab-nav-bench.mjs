#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3090);
const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 9);
const base = `http://127.0.0.1:${port}`;

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const server = spawn("pnpm", ["start", "-p", String(port)], {
  cwd: process.cwd(),
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function oneSwitch(from, label, dwellMs = 0) {
  await page.goto(`${base}${from}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("nav#site-desktop-nav");
  if (dwellMs > 0) {
    await page.waitForTimeout(dwellMs);
  }
  const sel =
    label === "Tag"
      ? 'nav#site-desktop-nav a[href^="/tag/"]'
      : label === "Monat"
        ? 'nav#site-desktop-nav a[href^="/monat/"]'
        : 'nav#site-desktop-nav a[href="/"]';
  const href = await page.locator(sel).first().getAttribute("href");
  const t0 = Date.now();
  await Promise.all([
    page.waitForURL((u) => {
      if (label === "Start") return u.pathname === "/";
      if (label === "Tag") return u.pathname.startsWith("/tag/");
      return u.pathname.startsWith("/monat/");
    }),
    page.click(`${sel}`),
  ]);
  await page.waitForSelector("#auffaelligkeit-h1, h1, .v4-start-h1");
  return { ms: Date.now() - t0, href };
}

const warm = {};
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await sleep(300);
const tagWarmHref = await page.locator('nav#site-desktop-nav a[href^="/tag/"]').first().getAttribute("href");
if (tagWarmHref) {
  await page.goto(`${base}${tagWarmHref}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#auffaelligkeit-h1");
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await sleep(300);
}
for (const [name, from, label] of [
  ["start_to_tag", "/", "Tag"],
  ["tag_to_monat", null, "Monat"],
  ["monat_to_start", "/monat/2026-10?faktor=1", "Start"],
]) {
  const fromPath = from ?? (await oneSwitch("/", "Tag")).href?.replace(base, "") ?? "/";
  const samples = [];
  let href = null;
  for (let i = 0; i < runs; i += 1) {
    const dwell = name === "start_to_tag" ? 1200 : 0;
    const r = await oneSwitch(fromPath, label, dwell);
    href = r.href;
    samples.push(r.ms);
    await sleep(80);
  }
  warm[name] = { href, samples, medianMs: Math.round(median(samples)) };
}

// cold: einmal Server-Neustart simuliert via leerem Kontext
const cold = {};
const coldCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const coldPage = await coldCtx.newPage();
for (const [name, from, label] of [
  ["start_to_tag", "/", "Tag"],
  ["tag_to_monat", null, "Monat"],
  ["monat_to_start", "/monat/2026-10?faktor=1", "Start"],
]) {
  const fromPath = from ?? (await oneSwitch("/", "Tag")).href?.replace(base, "") ?? "/";
  const samples = [];
  let href = null;
  for (let i = 0; i < 3; i += 1) {
    const dwell = name === "start_to_tag" ? 0 : 0;
    const r = await (async () => {
      await coldPage.goto(`${base}${fromPath}`, { waitUntil: "domcontentloaded" });
      await coldPage.waitForSelector("nav#site-desktop-nav");
      const sel =
        label === "Tag"
          ? 'nav#site-desktop-nav a[href^="/tag/"]'
          : label === "Monat"
            ? 'nav#site-desktop-nav a[href^="/monat/"]'
            : 'nav#site-desktop-nav a[href="/"]';
      const t0 = Date.now();
      await Promise.all([
        coldPage.waitForURL((u) => {
          if (label === "Start") return u.pathname === "/";
          if (label === "Tag") return u.pathname.startsWith("/tag/");
          return u.pathname.startsWith("/monat/");
        }),
        coldPage.click(sel),
      ]);
      await coldPage.waitForSelector("#auffaelligkeit-h1, h1, .v4-start-h1");
      const h = await coldPage.locator(sel).first().getAttribute("href");
      return { ms: Date.now() - t0, href: h };
    })();
    href = r.href;
    samples.push(r.ms);
  }
  cold[name] = { href, samples, medianMs: Math.round(median(samples)) };
}

console.log(JSON.stringify({ port, runs, warm, cold }, null, 2));
await browser.close();
server.kill();
