/**
 * DOM typographic measurements for design round 2 (PR #121).
 * Usage: node scripts/design-round2-measure.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const widths = [1280, 1024, 768, 390];
const factors = [2, 5, 10];
const ARTIFACT = "/opt/cursor/artifacts/design-round2-measurements.json";

async function typographicFontSize(locator) {
  return locator.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const rect = el.getBoundingClientRect();
    const svg = el.ownerSVGElement;
    const vbW = svg?.viewBox?.baseVal?.width;
    const scale = svg && vbW ? rect.width / vbW : 1;
    return { fontSizePx: fs, svgUserFont: parseFloat(el.getAttribute("font-size") || "0"), scale };
  });
}

async function contrastRatio(page, textEl) {
  return textEl.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    const fg = cs.fill && cs.fill !== "none" ? cs.fill : cs.color;
    const parse = (c) => {
      const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return null;
      return [+m[1], +m[2], +m[3]].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
    };
    const fgRgb = parse(fg);
    let bgEl = el.parentElement;
    let bgRgb = null;
    while (bgEl && !bgRgb) {
      const bcs = window.getComputedStyle(bgEl);
      const bg = bcs.fill && bcs.fill !== "none" ? bcs.fill : bcs.backgroundColor;
      bgRgb = parse(bg);
      bgEl = bgEl.parentElement;
    }
    if (!fgRgb || !bgRgb) return null;
    const L = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    const l1 = L(fgRgb);
    const l2 = L(bgRgb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  });
}

function passMin12(px) {
  return px != null && px >= 11.95;
}

async function measureHero(page, w, factor) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const group = page.locator('[class*="heroAside"]').getByRole("group", { name: "Flottenstufe" });
  await group.getByRole("button", { name: `×${factor}`, exact: true }).click();
  await page.waitForTimeout(250);
  const svg = page.getByRole("img", { name: /Restlast national mit Kappung/ });
  const labels = svg.locator("text");
  const count = await labels.count();
  let minFs = 999;
  const labelTexts = [];
  for (let i = 0; i < count; i++) {
    const t = labels.nth(i);
    const { fontSizePx } = await typographicFontSize(t);
    if (fontSizePx > 0) minFs = Math.min(minFs, fontSizePx);
    const txt = (await t.textContent())?.trim();
    if (txt) labelTexts.push(txt);
  }
  const dup4h =
    labelTexts.filter((t) => /4\s*h/i.test(t)).length + labelTexts.filter((t) => /×10/.test(t)).length;
  const unified = labelTexts.some((t) => /×10.*×5.*4 h|×5.*4 h/i.test(t));
  const ghostMid = await svg.locator('line[stroke-dasharray], path[stroke-dasharray]').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, y: r.y + r.height / 2, z: el.compareDocumentPosition(el.parentElement) };
    }),
  );
  const dashedYs = ghostMid.filter((e) => e.tag === "LINE").map((e) => e.y);
  const solidCap = await svg.locator('line[stroke="var(--research-accent)"], line[stroke-dasharray=""]').first().boundingBox().catch(() => null);
  let zOrderPass = true;
  if (factor === 10 && dashedYs.length && solidCap) {
    const dashedBelowAccent = dashedYs.some((dy) => dy > solidCap.y + solidCap.height / 2 + 2);
    zOrderPass = !dashedBelowAccent;
  }
  return {
    check: "A+2+3",
    width: w,
    factor,
    minLabelPx: minFs === 999 ? null : minFs,
    minLabelPass: passMin12(minFs === 999 ? null : minFs),
    unifiedOrSingle4h: unified || dup4h <= 2,
    ghostLineCount: dashedYs.length,
    zOrderPass: factor !== 10 ? true : zOrderPass,
  };
}

async function measureWeek(page, w, factor) {
  await page.setViewportSize({ width: w, height: 1400 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  const group = page.getByRole("group", { name: "Woche Flottenstufe" });
  await group.getByRole("button", { name: `×${factor}`, exact: true }).click();
  await page.waitForTimeout(200);
  const svg = page.getByRole("img", { name: new RegExp(`Spitzensenkung je Tag · ×${factor}`) });
  const stats = await svg.evaluate((root) => {
    const texts = [...root.querySelectorAll("text")].filter((el) => {
      const t = (el.textContent ?? "").trim();
      if (!/^−\d,\d|^−\d$/.test(t)) return false;
      const x = parseFloat(el.getAttribute("x") ?? "0");
      return x > 45;
    });
  const luma = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parseRgb = (c) => {
      const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    };
    let minFs = 999;
    let haloLabels = 0;
    let insideLabels = 0;
    let minInsideContrast = 0;
    for (const el of texts) {
      const fs = parseFloat(window.getComputedStyle(el).fontSize);
      if (fs > 0) minFs = Math.min(minFs, fs);
      const hasHalo = [...(el.parentElement?.querySelectorAll("rect") ?? [])].some((r) => {
        const fill = r.getAttribute("fill") ?? "";
        const op = parseFloat(r.getAttribute("opacity") ?? "1");
        return op >= 0.85 && /research-bg|blog-bg/i.test(fill);
      });
      if (hasHalo) haloLabels += 1;
      else {
        insideLabels += 1;
        const fg = parseRgb(window.getComputedStyle(el).fill);
        const bg = parseRgb(window.getComputedStyle(el.parentElement?.parentElement ?? el).fill);
        if (fg && bg) {
          const cr = (Math.max(luma(fg), luma(bg)) + 0.05) / (Math.min(luma(fg), luma(bg)) + 0.05);
          minInsideContrast = Math.max(minInsideContrast, cr);
        }
      }
    }
    return {
      barValueCount: texts.length,
      minValueLabelPx: minFs === 999 ? null : minFs,
      insideLabels,
      haloLabels,
      minInsideContrast: insideLabels ? minInsideContrast || null : null,
      contrastPass:
        texts.length === 0 ||
        (haloLabels === texts.length && insideLabels === 0) ||
        (insideLabels > 0 && minInsideContrast >= 4.5),
    };
  });
  return { check: "4", width: w, factor, ...stats };
}

async function measureKw46(page, w) {
  await page.setViewportSize({ width: w, height: 1600 });
  await page.goto(`${base}/beitraege/netz-updates-kw-46`, { waitUntil: "domcontentloaded" });
  const svg = page.getByRole("img", {
    name: /Tagesprofil 21\.10\.2026: beobachtete Restlast/,
  });
  const texts = svg.locator("text");
  const n = await texts.count();
  let minFs = 999;
  const boxes = [];
  for (let i = 0; i < n; i++) {
    const t = texts.nth(i);
    const { fontSizePx } = await typographicFontSize(t);
    if (fontSizePx > 0) minFs = Math.min(minFs, fontSizePx);
    const box = await t.boundingBox();
    if (box) boxes.push({ text: (await t.textContent())?.trim(), ...box });
  }
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      ) {
        const gapY = Math.min(Math.abs(a.y - b.y), Math.abs(a.y + a.height - (b.y + b.height)));
        if (gapY < 4) overlaps.push({ a: a.text, b: b.text, gapY });
      }
    }
  }
  const axisOverlap = boxes.some((a) =>
    a.text?.includes("Europe/Berlin")
      ? boxes.some(
          (b) => b.text === "12" && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y,
        )
      : false,
  );
  return {
    check: "B",
    width: w,
    minLabelPx: minFs,
    minLabelPass: passMin12(minFs),
    badOverlaps: overlaps,
    overlapsPass: overlaps.length === 0,
    axisTitleOverlap: axisOverlap,
    axisPass: !axisOverlap,
  };
}

async function measureSim21(page, w) {
  await page.setViewportSize({ width: w, height: 2800 });
  await page.goto(`${base}/simulator`, { waitUntil: "domcontentloaded" });
  const svg = page.locator('[data-testid="simulator-g3-21"]');
  const unit = svg.locator("text", { hasText: "€/MWh" });
  const tick200 = svg.locator("text", { hasText: /^200$/ });
  const unitBox = await unit.boundingBox();
  const tickBox = await tick200.boundingBox();
  const gap = unitBox && tickBox ? tickBox.y - (unitBox.y + unitBox.height) : null;
  return { check: "C", width: w, eurMwhToTick200GapPx: gap, gapPass: gap != null && gap >= 4 };
}

async function measurePareto(page, w) {
  await page.setViewportSize({ width: w, height: 3200 });
  await page.goto(`${base}/simulator`, { waitUntil: "domcontentloaded" });
  const cell = page.getByText("Kompromiss (70 % der Senkung)", { exact: true });
  const epsVisible = await page.locator("text=ε").count();
  return {
    check: "D",
    width: w,
    paretoLabelPass: (await cell.count()) > 0,
    epsilonGlyphCount: epsVisible,
    epsilonPass: epsVisible === 0,
  };
}

async function saturationHeadline(page) {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const h2 = page.locator("section").filter({ has: page.getByRole("img", { name: /Sättigungskurve/ }) }).locator("h2");
  return { check: "5", text: (await h2.textContent())?.trim() ?? "" };
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(60_000);
page.setDefaultNavigationTimeout(60_000);
const out = { measuredAt: new Date().toISOString(), base, hero: [], week: [], kw46: [], sim21: [], pareto: [], saturation: null };

try {
  for (const w of widths) {
    for (const f of factors) {
      out.hero.push(await measureHero(page, w, f));
      out.week.push(await measureWeek(page, w, f));
    }
    out.kw46.push(await measureKw46(page, w));
    out.sim21.push(await measureSim21(page, w));
    out.pareto.push(await measurePareto(page, w));
  }
  out.saturation = await saturationHeadline(page);
} finally {
  await browser.close();
  writeFileSync(ARTIFACT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}