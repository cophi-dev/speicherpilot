/**
 * Design round 5 — Hero typo ≥12 px, gutter gap ≥4 px, clip; KW46 x-tick gap @390.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const widths = [1280, 1024, 768, 390];
const factors = [2, 5, 10];
const ARTIFACT = "/opt/cursor/artifacts/design-round5-measurements.json";

const typographicPx = (root, el) => {
  const fs = parseFloat(el.getAttribute("font-size") || "0");
  const vbW = root.viewBox.baseVal.width || root.getBoundingClientRect().width;
  const r = root.getBoundingClientRect();
  return fs * (r.width / vbW);
};

const HERO_MEASURE = () => {
  const root = document.querySelector('svg[aria-label="Restlast national mit Kappung"]');
  if (!root) return { error: "no-svg" };
  const typoPx = (el) => {
    const fs = parseFloat(el.getAttribute("font-size") || "0");
    const vbW = root.viewBox.baseVal.width || root.getBoundingClientRect().width;
    const r = root.getBoundingClientRect();
    return fs * (r.width / vbW);
  };
  const sr = root.getBoundingClientRect();
  const gutterTexts = [...root.querySelectorAll("text[data-gutter-key]")];
  let minTypo = 999;
  for (const t of gutterTexts) minTypo = Math.min(minTypo, typoPx(t));
  for (const t of [...root.querySelectorAll("text")].filter((el) => /GW ·|^\d/.test((el.textContent ?? "").trim()))) {
    minTypo = Math.min(minTypo, typoPx(t));
  }
  const boxes = gutterTexts.map((t) => {
    const bb = t.getBoundingClientRect();
    return { text: (t.textContent ?? "").trim(), left: bb.left, right: bb.right, top: bb.top, bottom: bb.bottom };
  });
  let minGutterGap = 999;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const gap = a.bottom <= b.top ? b.top - a.bottom : b.bottom <= a.top ? a.top - b.bottom : 0;
      if (Number.isFinite(gap) && gap >= 0) minGutterGap = Math.min(minGutterGap, gap);
    }
  }
  let clipFails = 0;
  for (const t of gutterTexts) {
    const bb = t.getBoundingClientRect();
    const overflow = Math.max(0, bb.right - sr.right, sr.left - bb.left);
    if (overflow > 0.5) clipFails += 1;
  }
  return {
    minTypo: minTypo === 999 ? null : minTypo,
    typoPass: minTypo >= 11.99,
    minGutterGapPx: minGutterGap === 999 ? null : minGutterGap,
    gutterGapPass: minGutterGap >= 4,
    clipFails,
    clipPass: clipFails === 0,
    gutterCount: gutterTexts.length,
  };
};

async function setTheme(page, dark) {
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const out = { measuredAt: new Date().toISOString(), base, hero: [], kw46: [] };

try {
  await page.setViewportSize({ width: 1280, height: 1400 });
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 1400 });
    await setTheme(page, false);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    const heroGroup = page.locator('[class*="heroAside"]').getByRole("group", { name: "Flottenstufe" });
    for (const f of factors) {
      await heroGroup.getByRole("button", { name: `×${f}` }).click();
      await page.waitForTimeout(180);
      const stats = await page.evaluate(HERO_MEASURE);
      out.hero.push({ width: w, factor: f, ...stats });
    }
    await page.goto(`${base}/beitraege/netz-updates-kw-46`, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
    const kw = await page.getByRole("img", { name: /Tagesprofil 21\.10\.2026/ }).evaluate((root) => {
      const boxes = [...root.querySelectorAll("text")].map((t) => {
        const bb = t.getBoundingClientRect();
        return { text: (t.textContent ?? "").trim(), top: bb.top, bottom: bb.bottom, left: bb.left, right: bb.right };
      });
      const xHour = boxes.filter((b) => /^\d{2}$/.test(b.text) || b.text === "24 Uhr");
      const has24 = xHour.some((b) => b.text === "24 Uhr");
      const axisY = Math.max(...xHour.map((b) => b.top), 0);
      const hours = xHour.filter((b) => Math.abs(b.top - axisY) < 3);
      let minTickGap = 999;
      for (let i = 0; i < hours.length; i++) {
        for (let j = i + 1; j < hours.length; j++) {
          const a = hours[i];
          const b = hours[j];
          if (Math.abs(a.top - b.top) > 2) continue;
          const sep =
            a.right <= b.left
              ? b.left - a.right
              : b.right <= a.left
                ? a.left - b.right
                : -Math.min(a.right - b.left, b.right - a.left);
          if (sep >= 0) minTickGap = Math.min(minTickGap, sep);
        }
      }
      return {
        hourLabels: hours.map((h) => h.text).sort(),
        has24Uhr: has24,
        minHourTickSepPx: minTickGap === 999 ? null : minTickGap,
      };
    });
    out.kw46.push({
      width: w,
      ...kw,
      tickGapPass: w > 420 || (kw.minHourTickSepPx ?? 0) >= 4,
    });
  }
  const heroOk = out.hero.every((h) => h.typoPass && h.gutterGapPass && h.clipPass);
  const kw390 = out.kw46.find((k) => k.width === 390);
  const kwOk = kw390?.has24Uhr && kw390?.tickGapPass;
  out.summary = { heroOk, kwOk, pass: heroOk && kwOk };
} finally {
  await browser.close();
  writeFileSync(ARTIFACT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log(JSON.stringify({ hero: out.hero, kw46: out.kw46 }, null, 2));
}