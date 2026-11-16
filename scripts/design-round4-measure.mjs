/**
 * Design round 4 — clip, gutter overlap, KW46 gaps, week contrast (+ round 3 hero collision).
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const widths = [1280, 1024, 768, 390];
const factors = [2, 5, 10];
const ARTIFACT = "/opt/cursor/artifacts/design-round4-measurements.json";

const HERO_CLIP = () => {
  const root = document.querySelector('svg[aria-label="Restlast national mit Kappung"]');
  if (!root) return { error: "no-svg" };
  const sr = root.getBoundingClientRect();
  const gutterTexts = [...root.querySelectorAll("text")].filter((t) => {
    const tx = (t.textContent ?? "").trim();
    return /×10 = ×5|· 4 h|^×(?:2|5|10)$/.test(tx);
  });
  let maxOverflow = 0;
  let clipFails = 0;
  for (const t of gutterTexts) {
    const bb = t.getBoundingClientRect();
    const overflow = Math.max(0, bb.right - sr.right, sr.left - bb.left);
    maxOverflow = Math.max(maxOverflow, overflow);
    if (overflow > 0.5) clipFails += 1;
  }
  return { gutterLabelCount: gutterTexts.length, maxOverflow, clipFails, clipPass: clipFails === 0 };
};

const HERO_GUTTER_OVERLAP = () => {
  const root = document.querySelector('svg[aria-label="Restlast national mit Kappung"]');
  if (!root) return { error: "no-svg" };
  const texts = [...root.querySelectorAll("text")].filter((t) => {
    const tx = (t.textContent ?? "").trim();
    return /×10 = ×5|· 4 h|^×(?:2|5|10)$/.test(tx);
  });
  const boxes = texts.map((t) => ({ text: (t.textContent ?? "").trim(), ...t.getBoundingClientRect() }));
  let maxOverlap = 0;
  let overlapPairs = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 0 && oy > 0) {
        maxOverlap = Math.max(maxOverlap, Math.min(ox, oy));
        overlapPairs += 1;
      }
    }
  }
  return { maxOverlap, overlapPairs, overlapPass: overlapPairs === 0 };
};

const HERO_EVAL = () => {
  const root = document.querySelector('svg[aria-label="Restlast national mit Kappung"]');
  if (!root) return { collisionPass: false };
  const pathEl = [...root.querySelectorAll('path[fill="none"]')].find((p) => parseFloat(p.getAttribute("stroke-width") ?? "0") >= 1.2);
  const ctm = root.getScreenCTM();
  if (!pathEl || !ctm) return { collisionPass: false };
  const texts = [...root.querySelectorAll("text")].filter((t) =>
    /×10|· 4 h|GW ·/.test((t.textContent ?? "").trim()),
  );
  const segs = [];
  const len = pathEl.getTotalLength();
  let prev = pathEl.getPointAtLength(0);
  for (let i = 1; i <= 100; i++) {
    const p = pathEl.getPointAtLength((len * i) / 100);
    segs.push([
      { x: prev.x * ctm.a + ctm.e, y: prev.y * ctm.d + ctm.f },
      { x: p.x * ctm.a + ctm.e, y: p.y * ctm.d + ctm.f },
    ]);
    prev = p;
  }
  let collisions = 0;
  for (const t of texts) {
    const bb = t.getBoundingClientRect();
    const box = { left: bb.left, right: bb.right, top: bb.top, bottom: bb.bottom };
    const pointIn = (px, py, b) => px >= b.left && px <= b.right && py >= b.top && py <= b.bottom;
    const cross = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      const den = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
      if (Math.abs(den) < 1e-9) return false;
      const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / den;
      const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / den;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };
    const hit = segs.some(([a, b]) => {
      if (pointIn(a.x, a.y, box) || pointIn(b.x, b.y, box)) return true;
      const edges = [
        [box.left, box.top, box.right, box.top],
        [box.left, box.bottom, box.right, box.bottom],
        [box.left, box.top, box.left, box.bottom],
        [box.right, box.top, box.right, box.bottom],
      ];
      return edges.some(([x1, y1, x2, y2]) => cross(a.x, a.y, b.x, b.y, x1, y1, x2, y2));
    });
    if (hit) collisions += 1;
  }
  return { collisions, collisionPass: collisions === 0 };
};

async function setTheme(page, dark) {
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(45_000);
const out = { measuredAt: new Date().toISOString(), base, hero: [], kw46: [], week: [], regression: {} };

try {
  for (const dark of [false, true]) {
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 1400 });
      await setTheme(page, dark);
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      const heroGroup = page.locator('[class*="heroAside"]').getByRole("group", { name: "Flottenstufe" });
      for (const f of factors) {
        await heroGroup.getByRole("button", { name: `×${f}` }).click();
        await page.waitForTimeout(120);
        const clip = await page.evaluate(HERO_CLIP);
        const overlap = await page.evaluate(HERO_GUTTER_OVERLAP);
        const r3 = await page.evaluate(HERO_EVAL);
        out.hero.push({ width: w, factor: f, dark, clip, overlap, regressionR3: r3 });
      }

      for (const f of [2, 5, 10]) {
        for (const fh of [false, true]) {
          await page.locator("#woche").scrollIntoViewIfNeeded();
          await page.getByRole("group", { name: "Woche Flottenstufe" }).getByRole("button", { name: `×${f}` }).click();
          await page.getByRole("group", { name: "Woche Speicherdauer" }).getByRole("button", { name: fh ? "4 h" : "1,76 h" }).click();
          await page.waitForTimeout(100);
          const stats = await page.locator("#woche").getByRole("img").evaluate((root) => {
            const r = root.getBoundingClientRect();
            const typographicPx = (el) => {
              const fs = parseFloat(el.getAttribute("font-size") || "0");
              const vbW = root.viewBox.baseVal.width || r.width;
              return fs * (r.width / vbW);
            };
            const valueTexts = [...root.querySelectorAll("text")].filter(
              (el) => /^−\d,\d/.test((el.textContent ?? "").trim()) && parseFloat(el.getAttribute("x") ?? "0") > 45,
            );
            let minTypo = 999;
            let minContrast = 999;
            let minBarGap = 999;
            const luma = (rgb) => {
              const v = rgb.map((c) => {
                const s = c / 255;
                return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              });
              return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
            };
            const rgb = (c) => {
              const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
              return m ? [+m[1], +m[2], +m[3]] : null;
            };
            for (const el of valueTexts) {
              minTypo = Math.min(minTypo, typographicPx(el));
              const style = getComputedStyle(el);
              const fg = rgb(style.fill);
              const bb = el.getBoundingClientRect();
              const bars = [...root.querySelectorAll("rect")].filter((rect) => {
                const h = parseFloat(rect.getAttribute("height") ?? "0");
                const x = parseFloat(rect.getAttribute("x") ?? "0");
                return h > 2 && h < 180 && x > 45;
              });
              const bar = bars.find((rect) => {
                const br = rect.getBoundingClientRect();
                return Math.abs(br.left + br.width / 2 - (bb.left + bb.width / 2)) < br.width * 1.5;
              });
              if (bar) {
                const br = bar.getBoundingClientRect();
                minBarGap = Math.min(minBarGap, br.top - bb.bottom);
              }
              const stroke = rgb(style.stroke);
              let bg = stroke && parseFloat(style.strokeWidth) > 0 ? stroke : null;
              if (!bg) bg = rgb(getComputedStyle(document.documentElement).backgroundColor);
              if (fg && bg) {
                const cr = (Math.max(luma(fg), luma(bg)) + 0.05) / (Math.min(luma(fg), luma(bg)) + 0.05);
                minContrast = Math.min(minContrast, cr);
              }
            }
            return {
              minTypo: minTypo === 999 ? null : minTypo,
              minContrast: minContrast === 999 ? null : minContrast,
              minBarGap: minBarGap === 999 ? null : minBarGap,
              contrastPass: valueTexts.length === 0 || minContrast >= 4.5,
              gapPass: minBarGap >= 4,
            };
          });
          out.week.push({ width: w, factor: f, fourHour: fh, dark, ...stats });
        }
      }

      await page.goto(`${base}/beitraege/netz-updates-kw-46`, { waitUntil: "domcontentloaded" });
      const kw = await page.getByRole("img", { name: /Tagesprofil 21\.10\.2026/ }).evaluate((root) => {
        const r = root.getBoundingClientRect();
        const boxes = [...root.querySelectorAll("text")].map((t) => {
          const bb = t.getBoundingClientRect();
          return {
            text: (t.textContent ?? "").trim(),
            left: bb.left,
            right: bb.right,
            top: bb.top,
            bottom: bb.bottom,
          };
        });
        const endLabels = boxes.filter((b) => ["Markt", "beobachtet", "gegen die Spitze"].includes(b.text));
        let minGap = 999;
        for (let i = 0; i < endLabels.length; i++) {
          for (let j = i + 1; j < endLabels.length; j++) {
            const a = endLabels[i];
            const b = endLabels[j];
            const gap = a.bottom <= b.top ? b.top - a.bottom : b.bottom <= a.top ? a.top - b.bottom : 0;
            if (Number.isFinite(gap)) minGap = Math.min(minGap, gap);
          }
        }
        const xAxisY = Math.max(...boxes.filter((b) => ["00", "06", "12", "18", "24 Uhr"].includes(b.text)).map((b) => b.top), 0);
        const hourLabels = boxes.filter((b) => /^\d{2}$/.test(b.text) && Math.abs(b.top - xAxisY) < 3);
        let minHourGap = 999;
        for (let i = 0; i < hourLabels.length; i++) {
          for (let j = i + 1; j < hourLabels.length; j++) {
            const a = hourLabels[i];
            const b = hourLabels[j];
            if (Math.abs(a.top - b.top) > 2) continue;
            const gap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const sep = Math.max(a.left, b.left) > Math.min(a.right, b.right)
              ? Math.min(Math.abs(a.right - b.left), Math.abs(b.right - a.left))
              : -gap;
            if (sep >= 0) minHourGap = Math.min(minHourGap, sep);
          }
        }
        return {
          endLabelMinGapPx: minGap === 999 ? null : minGap,
          gapPass: minGap >= 4,
          hourTickCount: hourLabels.length,
          minHourTickSepPx: minHourGap === 999 ? null : minHourGap,
        };
      });
      out.kw46.push({ width: w, dark, ...kw });
    }
  }
  const allClip = out.hero.every((h) => h.clip?.clipPass);
  const allOverlap = out.hero.every((h) => h.overlap?.overlapPass);
  const allKw = out.kw46.every((k) => k.gapPass);
  const allWeek = out.week.every((w) => w.contrastPass && w.gapPass);
  const allR3 = out.hero.every((h) => h.regressionR3?.collisionPass);
  out.summary = { allClip, allOverlap, allKw, allWeek, allR3, pass: allClip && allOverlap && allKw && allWeek && allR3 };
} finally {
  await browser.close();
  writeFileSync(ARTIFACT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary));
}