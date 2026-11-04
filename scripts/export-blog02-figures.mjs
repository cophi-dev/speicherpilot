#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = process.cwd();
const uploadRoots = [
  path.join(ROOT, "uploads"),
  path.join(process.env.HOME ?? "", ".cursor/projects/agent-repos-speicherpilot/uploads"),
];

const jobs = [
  {
    upload: "02_visual_2_16x9.png",
    html: "scripts/blog02-export/a2-zwei-netze.html",
    out: "public/blog/A2_zwei-netze_1920x1080.png",
  },
  {
    upload: "02_visual_3_16x9.png",
    html: "scripts/blog02-export/a3-drei-bausteine.html",
    out: "public/blog/A3_drei-bausteine_1920x1080.png",
  },
];

function findUpload(name) {
  for (const root of uploadRoots) {
    const candidate = path.join(root, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function renderHtml(htmlPath, outPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(path.join(ROOT, htmlPath)).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  fs.mkdirSync(path.dirname(path.join(ROOT, outPath)), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, outPath), type: "png" });
  await browser.close();
  console.log(`rendered ${outPath}`);
}

async function main() {
  for (const job of jobs) {
    const upload = findUpload(job.upload);
    if (upload) {
      fs.mkdirSync(path.dirname(path.join(ROOT, job.out)), { recursive: true });
      fs.copyFileSync(upload, path.join(ROOT, job.out));
      console.log(`copied ${upload} -> ${job.out}`);
      continue;
    }
    await renderHtml(job.html, job.out);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
