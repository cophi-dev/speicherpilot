import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3000";
const WIDTHS = [375, 320];

async function left(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().left);
  }, selector);
}

async function gapBelowAxis(page) {
  return page.evaluate(() => {
    const axis = document.querySelector(".v4-luecke-compact-foot .v4-luecke-mobile-axis");
    const peak = document.querySelector(".v4-luecke-compact-foot .v4-luecke-peak-banner-value");
    if (!axis || !peak) return null;
    const a = axis.getBoundingClientRect();
    const p = peak.getBoundingClientRect();
    return Math.round(p.top - a.bottom);
  });
}

async function maxRightOverflow(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const box = root.getBoundingClientRect();
    let maxRight = 0;
    root.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect().right;
      if (r > maxRight) maxRight = r;
    });
    return Math.round(maxRight - box.right);
  }, selector);
}

async function main() {
  const browser = await chromium.launch();
  let failed = false;
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 740 } });
    console.log(`\n=== ${width}px ===`);

    await page.goto(`${BASE}/methodik`, { waitUntil: "networkidle" });
    const mk = await left(page, ".methodik-hero-copy .v4-kicker");
    console.log("methodik kicker left", mk, mk === 20 ? "OK" : "FAIL");
    if (mk !== 20) failed = true;

    await page.goto(`${BASE}/beitraege#extern-gelesen`, { waitUntil: "networkidle" });
    const ov = await maxRightOverflow(page, ".beitraege-extern .news-sheet");
    console.log("extern news overflow px", ov, ov <= 0 ? "OK" : "FAIL");
    if (ov !== null && ov > 0) failed = true;

    await page.goto(`${BASE}/impressum`, { waitUntil: "networkidle" });
    const ih = await left(page, ".legal-doc h1");
    console.log("impressum h1 left", ih, ih === 20 ? "OK" : "FAIL");
    if (ih !== 20) failed = true;

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const gap = await gapBelowAxis(page);
    console.log("luecke axis->peak gap", gap, gap !== null && gap >= 12 ? "OK" : "FAIL");
    if (gap === null || gap < 12) failed = true;

    const scroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log("home overflow", scroll ? "FAIL" : "OK");
    if (scroll) failed = true;

    await page.close();
  }
  await browser.close();
  if (failed) process.exit(1);
  console.log("\nAll R4 gate checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
