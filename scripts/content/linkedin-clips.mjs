#!/usr/bin/env node
/**
 * LinkedIn motion assets from LIVE https://www.speicherpilot.app
 * Playwright frame capture + ffmpeg H.264. No product code changes.
 *
 * Usage: node scripts/content/linkedin-clips.mjs
 * Env: CONTENT_BASE_URL, CONTENT_OUT (default /opt/cursor/artifacts/linkedin-clips)
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CONTENT_BASE_URL ?? "https://www.speicherpilot.app";
const OUT = process.env.CONTENT_OUT ?? "/opt/cursor/artifacts/linkedin-clips";
const FPS = 30;
const HOLD_FRAMES = Math.round(FPS * 1.5);
const W = 1080;
const H45 = 1350;
const H11 = 1080;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function encodeClip(framesDir, baseName) {
  const count = readdirSync(framesDir).filter((f) => f.endsWith(".png")).length;
  const duration = count / FPS;
  const vf45 = `scale=${W}:${H45}:force_original_aspect_ratio=decrease,pad=${W}:${H45}:(ow-iw)/2:(oh-ih)/2:black`;
  const vf11 = `scale=${W}:${H45}:force_original_aspect_ratio=decrease,pad=${W}:${H45}:(ow-iw)/2:(oh-ih)/2:black,crop=${W}:${H11}:0:(ih-${H11})/3`;
  const mp4_45 = join(OUT, `${baseName}_1080x1350.mp4`);
  const mp4_11 = join(OUT, `${baseName}_1080x1080.mp4`);
  const pattern = join(framesDir, "frame-%05d.png");
  const enc = (out, vf) =>
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -framerate ${FPS} -i "${pattern}" -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${out}"`,
    );
  enc(mp4_45, vf45);
  enc(mp4_11, vf11);
  return { mp4_45, mp4_11, duration, frameCount: count };
}

async function writeFrames(framesDir, buffers) {
  mkdirSync(framesDir, { recursive: true });
  let i = 0;
  for (const buf of buffers) {
    writeFileSync(join(framesDir, `frame-${String(i).padStart(5, "0")}.png`), buf);
    i += 1;
  }
}

async function captureSequence(page, clip, seconds, tick) {
  const frames = [];
  const steps = Math.max(1, Math.round(seconds * FPS));
  const dt = 1000 / FPS;
  for (let i = 0; i < steps; i += 1) {
    await tick(i, steps);
    const buf = await page.screenshot({ type: "png", clip, animations: "disabled" });
    frames.push(buf);
    await sleep(dt);
  }
  const last = frames[frames.length - 1];
  for (let h = 0; h < HOLD_FRAMES; h += 1) frames.push(last);
  return frames;
}

async function darkPage(browser, w = W, h = H45) {
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    recordVideo: undefined,
  });
  await context.addInitScript(() => {
    localStorage.setItem("speicherpilot-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  return { context, page };
}

async function clipGestern(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.locator('[class*="heroNum"]').waitFor({ state: "visible", timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  const chart = await page.locator('[class*="chartClip"]').first().boundingBox();
  const clipH = chart ? Math.min(H45, Math.ceil(chart.y + chart.height + 72)) : H45;
  const clip = { x: 0, y: 0, width: W, height: clipH };
  const factors = [2, 5, 10];
  const boundaries = [0, Math.floor(0.33 * FPS * 8), Math.floor(0.66 * FPS * 8)];
  let applied = -1;
  return captureSequence(page, clip, 8, async (i) => {
    const stage = i < boundaries[1] ? 0 : i < boundaries[2] ? 1 : 2;
    if (stage !== applied) {
      applied = stage;
      await page.getByRole("button", { name: `×${factors[stage]}`, exact: true }).click();
      await sleep(200);
    }
  });
}

async function clipWoche(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector("#woche", { timeout: 60_000 });
  const scrollState = await page.evaluate(() => {
    const el = document.querySelector("#woche");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const docTop = r.top + window.scrollY;
    return { docTop, height: r.height };
  });
  if (!scrollState) throw new Error("woche");
  await page.locator("#woche h2").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const h = document.querySelector("#woche h2");
    if (!h) return;
    const y = h.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo(0, Math.max(0, y));
  });
  const scrollTop = await page.evaluate(() => window.scrollY);
  await sleep(300);
  const clip = { x: 0, y: 0, width: W, height: H45 };
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const scrollEnd = scrollTop + Math.max(0, scrollState.height - H45 + 200);
  return captureSequence(page, clip, 9, async (i, steps) => {
    const dayIdx = Math.min(6, Math.floor((i / steps) * 7));
    const t = dayIdx / 6;
    const y = scrollTop + t * (scrollEnd - scrollTop);
    await page.evaluate((sy) => window.scrollTo(0, sy), y);
    const day = days[dayIdx];
    const label = page.locator("#woche svg text").filter({ hasText: new RegExp(`^${day}$`) });
    if (await label.count()) await label.first().scrollIntoViewIfNeeded();
  });
}

async function clipVision(page) {
  await page.addInitScript(() => {
    localStorage.setItem("speicherpilot-vision-guess-skip", "1");
  });
  await page.goto(`${BASE}/vision`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[aria-label="NEP-Stufe"]', { timeout: 60_000 });
  const twoH = page.getByRole("button", { name: /^2 h$/ });
  if (await twoH.count()) await twoH.click();
  await sleep(500);
  const clip = { x: 0, y: 0, width: W, height: H45 };
  const slider = page.locator('[aria-label="NEP-Stufe"]');
  const box = await slider.boundingBox();
  if (!box) throw new Error("slider bbox");
  const y = box.y + box.height / 2;
  const stageX = await page.evaluate(() => {
    const root = document.querySelector('svg[aria-label="Vision Sättigung Oktober"]');
    if (!root) return null;
    const texts = [...root.querySelectorAll("text")];
    const pick = (label) => {
      const el = texts.find((t) => t.textContent?.trim() === label);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };
    return { start: pick("×2") ?? 60, end: pick("×10") ?? window.innerWidth - 60 };
  });
  if (!stageX) throw new Error("vision stage labels");
  const startX = stageX.start;
  const endX = stageX.end;
  const targetStage = 3; // ×10 (slider index 0=×2 … 3=×10)
  await slider.focus();
  for (let k = 0; k < 6; k += 1) await page.keyboard.press("ArrowLeft");
  let stageNow = Number(await slider.getAttribute("aria-valuenow"));
  return captureSequence(page, clip, 9, async (i, steps) => {
    await slider.focus();
    const want = Math.min(targetStage, Math.round((i / Math.max(1, steps - 1)) * targetStage));
    while (stageNow < want) {
      await page.keyboard.press("ArrowRight");
      await sleep(50);
      stageNow = Number(await slider.getAttribute("aria-valuenow"));
    }
    while (stageNow > want) {
      await page.keyboard.press("ArrowLeft");
      await sleep(50);
      stageNow = Number(await slider.getAttribute("aria-valuenow"));
    }
    const t = i / Math.max(1, steps - 1);
    const cx = startX + t * (endX - startX);
    await page.mouse.move(cx, y);
    await sleep(12);
  });
}

function qaFrames(framesDir, outPrefix) {
  const files = readdirSync(framesDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (files.length === 0) return;
  const pick = (idx) => join(OUT, `${outPrefix}_qa_${idx}.png`);
  copyFileSync(join(framesDir, files[0]), pick("first"));
  copyFileSync(join(framesDir, files[Math.floor(files.length / 2)]), pick("middle"));
  copyFileSync(join(framesDir, files[files.length - 1]), pick("last"));
  return {
    first: pick("first"),
    middle: pick("middle"),
    last: pick("last"),
    poster: pick("last"),
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const only = process.env.CLIPS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!only?.length) {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const report = [];

  try {
    for (const [id, fn, posterName] of [
      ["gestern", clipGestern, "linkedin_gestern"],
      ["woche", clipWoche, "linkedin_woche"],
      ["vision", clipVision, "linkedin_vision"],
    ]) {
      if (only?.length && !only.includes(id)) continue;
      const { context, page } = await darkPage(browser);
      const framesDir = join(OUT, `_frames_${id}`);
      rmSync(framesDir, { recursive: true, force: true });
      const frames = await fn(page);
      await writeFrames(framesDir, frames);
      const enc = encodeClip(framesDir, posterName);
      const qa = qaFrames(framesDir, posterName);
      const posterPath = join(OUT, `${posterName}_poster.png`);
      copyFileSync(join(framesDir, readdirSync(framesDir).sort().at(-1)), posterPath);
      report.push({
        id,
        ...enc,
        poster: posterPath,
        qa,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
