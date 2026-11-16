/**
 * Design round 3 — owner-aligned measurements (compact runner).
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const widths = [1280, 1024, 768, 390];
const factors = [2, 5, 10];
const ARTIFACT = "/opt/cursor/artifacts/design-round3-measurements.json";

const HERO_EVAL = () => {
  const root = document.querySelector('svg[aria-label="Restlast national mit Kappung"]');
  if (!root) return { error: "no-svg" };
  const typographicPx = (el) => {
    const fs = parseFloat(el.getAttribute("font-size") || "0");
    const r = root.getBoundingClientRect();
    const vbW = root.viewBox.baseVal.width || r.width;
    return fs * (r.width / vbW);
  };
  const texts = [...root.querySelectorAll("text")].filter((t) =>
    /×10|· 4 h|GW ·/.test((t.textContent ?? "").trim()),
  );
  let minTypo = 999;
  for (const t of texts) minTypo = Math.min(minTypo, typographicPx(t));
  const pathEl = [...root.querySelectorAll('path[fill="none"]')].find((p) => parseFloat(p.getAttribute("stroke-width") ?? "0") >= 1.2);
  const ctm = root.getScreenCTM();
  if (!pathEl || !ctm) {
    return { minTypo: minTypo === 999 ? null : minTypo, minLabelPass: minTypo >= 11.95, collisions: null, collisionPass: false };
  }
  const segs = [];
  const len = pathEl.getTotalLength();
  let prev = pathEl.getPointAtLength(0);
  for (let i = 1; i <= 100; i++) {
    const p = pathEl.getPointAtLength((len * i) / 100);
    const a = { x: prev.x * ctm.a + ctm.e, y: prev.y * ctm.d + ctm.f };
    const b = { x: p.x * ctm.a + ctm.e, y: p.y * ctm.d + ctm.f };
    segs.push([a, b]);
    prev = p;
  }
  const pointIn = (px, py, box) => px >= box.left && px <= box.right && py >= box.top && py <= box.bottom;
  const cross = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const den = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (Math.abs(den) < 1e-9) return false;
    const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / den;
    const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  const segHitsBox = (box, ax, ay, bx, by) => {
    if (pointIn(ax, ay, box) || pointIn(bx, by, box)) return true;
    const edges = [
      [box.left, box.top, box.right, box.top],
      [box.left, box.bottom, box.right, box.bottom],
      [box.left, box.top, box.left, box.bottom],
      [box.right, box.top, box.right, box.bottom],
    ];
    return edges.some(([x1, y1, x2, y2]) => cross(ax, ay, bx, by, x1, y1, x2, y2));
  };
  let collisions = 0;
  for (const t of texts) {
    const bb = t.getBoundingClientRect();
    const box = { left: bb.left, right: bb.right, top: bb.top, bottom: bb.bottom };
    if (segs.some(([a, b]) => segHitsBox(box, a.x, a.y, b.x, b.y))) collisions += 1;
  }
  return { minTypo: minTypo === 999 ? null : minTypo, minLabelPass: minTypo >= 11.95, collisions, collisionPass: collisions === 0 };
};

async function setTheme(page, dark) {
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(45_000);
const out = { measuredAt: new Date().toISOString(), base, hero: [], kw46: [], week: [], saturation: null };

try {
  for (const dark of [false, true]) {
    for (const w of widths) {
      try {
      await page.setViewportSize({ width: w, height: 1400 });
      await setTheme(page, dark);
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      const heroGroup = page.locator('[class*="heroAside"]').getByRole("group", { name: "Flottenstufe" });
      for (const f of factors) {
        await heroGroup.getByRole("button", { name: `×${f}` }).click();
        await page.waitForTimeout(120);
        const stats = await page.evaluate(HERO_EVAL);
        out.hero.push({ check: "1", width: w, factor: f, dark, ...stats });
      }

      for (const f of [5, 10]) {
        for (const fh of [false, true]) {
          await page.locator("#woche").scrollIntoViewIfNeeded();
          await page.getByRole("group", { name: "Woche Flottenstufe" }).getByRole("button", { name: `×${f}` }).click();
          await page.getByRole("group", { name: "Woche Speicherdauer" }).getByRole("button", { name: fh ? "4 h" : "1,76 h" }).click();
          await page.waitForTimeout(100);
          const dur = fh ? "4 h" : "1,76 h";
          const stats = await page.locator("#woche").getByRole("img").evaluate((root) => {
            const r = root.getBoundingClientRect();
            const typographicPx = (el) => {
              const fs = parseFloat(el.getAttribute("font-size") || "0");
              const vbW = root.viewBox.baseVal.width || r.width;
              return fs * (r.width / vbW);
            };
            const valueTexts = [...root.querySelectorAll("text")].filter((el) => /^−\d,\d/.test((el.textContent ?? "").trim()) && parseFloat(el.getAttribute("x") ?? "0") > 45);
            let minTypo = 999;
            let minContrast = 999;
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
              const fg = rgb(getComputedStyle(el).fill);
              const halo = el.parentElement?.querySelector('rect');
              let bg = halo ? rgb(getComputedStyle(halo).fill) : null;
              if (!bg) {
                const bb = el.getBoundingClientRect();
                const under = document.elementFromPoint(bb.left + bb.width / 2, bb.top - 2);
                bg = under ? rgb(getComputedStyle(under).backgroundColor) ?? rgb(getComputedStyle(under).fill) : null;
              }
              if (fg && bg) {
                const cr = (Math.max(luma(fg), luma(bg)) + 0.05) / (Math.min(luma(fg), luma(bg)) + 0.05);
                minContrast = Math.min(minContrast, cr);
              }
            }
            return {
              minTypo: minTypo === 999 ? null : minTypo,
              typoPass: minTypo >= 11.95,
              minContrast: minContrast === 999 ? null : minContrast,
              contrastPass: valueTexts.length === 0 || minContrast >= 4.5,
            };
          });
          out.week.push({ check: "3", width: w, factor: f, fourHour: fh, dark, ...stats });
        }
      }

      await page.goto(`${base}/beitraege/netz-updates-kw-46`, { waitUntil: "domcontentloaded" });
      const kw = await page.getByRole("img", { name: /Tagesprofil 21\.10\.2026/ }).evaluate((root) => {
        const r = root.getBoundingClientRect();
        const typographicPx = (el) => {
          const fs = parseFloat(el.getAttribute("font-size") || "0");
          const vbW = root.viewBox.baseVal.width || r.width;
          return fs * (r.width / vbW);
        };
        const texts = [...root.querySelectorAll("text")];
        let minTypo = 999;
        const boxes = texts.map((t) => {
          minTypo = Math.min(minTypo, typographicPx(t));
          const bb = t.getBoundingClientRect();
          return { text: (t.textContent ?? "").trim(), ...bb };
        });
        const endLabels = boxes.filter((b) => ["Markt", "beobachtet", "gegen die Spitze"].includes(b.text));
        let minGap = 999;
        for (let i = 0; i < endLabels.length; i++) {
          for (let j = i + 1; j < endLabels.length; j++) {
            const a = endLabels[i];
            const b = endLabels[j];
            const gap =
              a.bottom <= b.top
                ? b.top - a.bottom
                : b.bottom <= a.top
                  ? a.top - b.bottom
                  : Math.max(0, Math.min(b.top - a.bottom, a.top - b.bottom));
            minGap = Math.min(minGap, gap);
          }
        }
        const clipped = boxes.filter((b) => b.right > r.right + 0.5 || b.left < r.left - 0.5 || b.top < r.top - 0.5 || b.bottom > r.bottom + 0.5);
        return {
          minTypo,
          minTypoPass: minTypo >= 11.95,
          endLabelMinGapPx: minGap === 999 ? null : minGap,
          gapPass: minGap >= 4,
          clippedCount: clipped.length,
          clipPass: clipped.length === 0,
        };
      });
      out.kw46.push({ check: "2", width: w, dark, ...kw });
      } catch (e) {
        out.errors = [...(out.errors ?? []), { width: w, dark, error: String(e) }];
      }
    }
  }
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const text = (await page.locator("section").filter({ has: page.getByRole("img", { name: /Sättigungskurve/ }) }).locator("h2").textContent())?.trim() ?? "";
  out.saturation = {
    check: "4",
    text,
    dupPass: !/kaum noch etwas.*kaum weiter/i.test(text),
    pass: /^Gestern senkte ab ×5/.test(text) || /^Am \d{2}\.\d{2}\. senkte ab ×5/.test(text),
  };
} finally {
  await browser.close();
  writeFileSync(ARTIFACT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}