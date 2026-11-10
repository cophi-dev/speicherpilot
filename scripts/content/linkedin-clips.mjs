#!/usr/bin/env node
/**
 * LinkedIn clips — frame-by-frame via /content/clip (real model data).
 * Playwright + ffmpeg. Usage: node scripts/content/linkedin-clips.mjs
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.CONTENT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.CONTENT_OUT ?? "/opt/cursor/artifacts/linkedin-clips";
const FPS = 30;
const HOLD_FRAMES = Math.round(FPS * 1.5);
const W = 1080;
const H45 = 1350;
const H11 = 1080;

const CLIP_SPEC = {
  gestern: { durationSec: 10, aspect: "45" },
  woche: { durationSec: 10, aspect: "45" },
  vision: { durationSec: 10, aspect: "45" },
};

function encodeClip(framesDir, baseName, aspect) {
  const count = readdirSync(framesDir).filter((f) => f.endsWith(".png")).length;
  const duration = count / FPS;
  const mp4_45 = join(OUT, `${baseName}_1080x1350.mp4`);
  const mp4_11 = join(OUT, `${baseName}_1080x1080.mp4`);
  const pattern = join(framesDir, "frame-%05d.png");
  const pad = `scale=${W}:${H45}:force_original_aspect_ratio=decrease,pad=${W}:${H45}:(ow-iw)/2:(oh-ih)/2:black`;
  const enc = (out, vf) =>
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -framerate ${FPS} -i "${pattern}" -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${out}"`,
    );
  if (aspect === "45") enc(mp4_45, pad);
  const crop11 = `${pad},crop=${W}:${H11}:0:(ih-${H11})/2`;
  enc(mp4_11, crop11);
  return { mp4_45, mp4_11, duration, frameCount: count };
}

function changingFrameShare(framesDir, excludeTail = 0) {
  const files = readdirSync(framesDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  const end = Math.max(2, files.length - excludeTail);
  const slice = files.slice(0, end);
  if (slice.length < 2) return { changingFrames: 0, changingShare: 0, totalFrames: slice.length };
  let changing = 0;
  let prev = null;
  for (const f of slice) {
    const buf = readFileSync(join(framesDir, f));
    const hash = createHash("sha256").update(buf).digest("hex");
    if (prev !== null && hash !== prev) changing += 1;
    prev = hash;
  }
  const denom = slice.length - 1;
  return { changingFrames: changing, changingShare: changing / denom, totalFrames: slice.length };
}

async function captureClip(browser, id, spec) {
  const framesDir = join(OUT, `_frames_${id}`);
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: W, height: H45 + 120 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const contentFrames = Math.round(spec.durationSec * FPS);
  const total = contentFrames + HOLD_FRAMES;

  const url = `${BASE}/content/clip?id=${id}&t=0&aspect=${spec.aspect}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector("[data-clip-ready]", { timeout: 30_000 });
  const frame = page.locator("[data-clip-ready]");

  for (let f = 0; f < total; f += 1) {
    const t = Math.min(spec.durationSec, f / FPS);
    await page.evaluate(async (sec) => {
      window.__clipSetT?.(sec);
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }, t);
    await page.waitForFunction((expected) => window.__clipTApplied === expected, t, { timeout: 5000 });
    const box = await frame.boundingBox();
    if (!box) throw new Error("clip frame bbox");
    const buf = await page.screenshot({
      type: "png",
      animations: "disabled",
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    writeFileSync(join(framesDir, `frame-${String(f).padStart(5, "0")}.png`), buf);
  }

  await context.close();
  return framesDir;
}

function qaFrames(framesDir, outPrefix) {
  const files = readdirSync(framesDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (!files.length) return null;
  const pick = (tag, idx) => {
    const dest = join(OUT, `${outPrefix}_qa_${tag}.png`);
    copyFileSync(join(framesDir, files[idx]), dest);
    return dest;
  };
  const poster = pick("poster", files.length - 1);
  return {
    first: pick("first", 0),
    middle: pick("middle", Math.floor(files.length / 2)),
    last: poster,
    poster,
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const only = process.env.CLIPS?.split(",").map((s) => s.trim()).filter(Boolean);
  const browser = await chromium.launch({ headless: true });
  const report = [];

  try {
    for (const [id, spec] of Object.entries(CLIP_SPEC)) {
      if (only?.length && !only.includes(id)) continue;
      const framesDir = await captureClip(browser, id, spec);
      const baseName = `linkedin_${id}`;
      const enc = encodeClip(framesDir, baseName, spec.aspect);
      const change = changingFrameShare(framesDir);
      const qa = qaFrames(framesDir, baseName);
      report.push({
        id,
        ...enc,
        ...change,
        qa,
        notes:
          id === "gestern"
            ? "Residual trace 0–3 s, cap/fill/number ×1→×10, headline end"
            : id === "woche"
              ? "7 bars stagger, labels count up, week headline"
              : "2 h / 4 h draw, marker ×1→×10",
      });
      const contentChanging = changingFrameShare(framesDir, HOLD_FRAMES);
      report[report.length - 1].contentChangingShare = contentChanging.changingShare;
      report[report.length - 1].contentChangingFrames = contentChanging.changingFrames;
      if (contentChanging.changingShare < 0.6) {
        console.warn(`WARN ${id}: only ${(contentChanging.changingShare * 100).toFixed(1)}% content frames differ (need ≥60%)`);
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify({ clips: report, fps: FPS, base: BASE }, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
