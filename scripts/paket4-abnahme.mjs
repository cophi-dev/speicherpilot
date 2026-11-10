#!/usr/bin/env node
/**
 * Paket 4 visuell — gestylte Production-Screens. `pnpm build && pnpm start -p 3001` vorher.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = join(process.cwd(), "docs/audit-2026-11/paket4/screens");
const LH = join(process.cwd(), "docs/audit-2026-11/paket4");

function patchTurbopackCssChunk() {
  const chunks = join(process.cwd(), ".next/static/chunks");
  if (!existsSync(chunks)) return;
  const cssList = readdirSync(chunks).filter((f) => f.endsWith(".css") && !f.includes(".."));
  const mainCss = cssList.sort((a, b) => statSync(join(chunks, b)).size - statSync(join(chunks, a)).size)[0];
  if (!mainCss) return;
  const linkMissing = (name) => {
    if (!name.endsWith(".css")) return;
    const target = join(chunks, name);
    if (existsSync(target)) return;
    execSync(`ln -sf ${JSON.stringify(mainCss)} ${JSON.stringify(name)}`, { cwd: chunks });
  };
  for (const name of readdirSync(chunks)) {
    if (name.endsWith(".css") && name.includes("..")) linkMissing(name);
  }
  const manifest = join(process.cwd(), ".next/app-build-manifest.json");
  if (existsSync(manifest)) {
    const walk = (node) => {
      if (Array.isArray(node)) {
        for (const v of node) {
          if (typeof v === "string" && v.includes("/_next/static/chunks/")) {
            linkMissing(v.replace(/^\//, "").split("/").pop());
          } else walk(v);
        }
      } else if (node && typeof node === "object") {
        for (const v of Object.values(node)) walk(v);
      }
    };
    walk(JSON.parse(readFileSync(manifest, "utf8")));
  }
  try {
    const html = execSync(`curl -s ${JSON.stringify(BASE + "/monat/2026-10")}`, { encoding: "utf8" });
    for (const m of html.matchAll(/\/_next\/static\/chunks\/([^"']+)/g)) {
      linkMissing(m[1]);
    }
  } catch {
    /* server may not be up yet */
  }
}

async function preparePage(page, theme) {
  await page.addInitScript((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function applyTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("speicherpilot-theme", t);
  }, theme);
}

async function waitStyled(page) {
  await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => {
      const font = getComputedStyle(document.body).fontFamily.toLowerCase();
      return font.includes("space") || font.includes("grotesk");
    },
    { timeout: 45_000 },
  );
}

const SHOTS = [
  {
    file: "monat-2026-10-1440-dark.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 1440,
    h: 900,
    theme: "dark",
    fullPage: true,
  },
  {
    file: "monat-2026-10-1440-light.png",
    path: "/monat/2026-10?faktor=1&fahrweise=spitze&morph=1",
    w: 1440,
    h: 900,
    theme: "light",
    fullPage: true,
  },
  {
    file: "monat-2026-10-390-dark.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 390,
    h: 844,
    theme: "dark",
    fullPage: true,
  },
  {
    file: "monat-2026-10-390-light.png",
    path: "/monat/2026-10?faktor=1&fahrweise=markt&morph=1",
    w: 390,
    h: 844,
    theme: "light",
    fullPage: true,
  },
  {
    file: "monat-2026-10-390-c-dark-morph1.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 390,
    h: 844,
    theme: "dark",
    scrollToDauer: true,
  },
  {
    file: "monat-2026-10-390-c-light-morph1.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 390,
    h: 844,
    theme: "light",
    scrollToDauer: true,
  },
  {
    file: "monat-2026-10-1440-c-morph0.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=0",
    w: 1440,
    h: 900,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
  {
    file: "monat-2026-10-1440-c-morph1.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 1440,
    h: 900,
    theme: "dark",
    scrollTo: "#monat-dauerlinie-title",
  },
];

const CROP_SHOTS = [
  {
    file: "crop-c-390-light.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt&morph=1",
    w: 390,
    h: 844,
    theme: "light",
    scrollTo: "#monat-dauerlinie-title",
    selector: '[data-testid="dauerlinie-svg"]',
  },
  {
    file: "crop-kopf-1440-dark.png",
    path: "/monat/2026-10?faktor=10&fahrweise=markt",
    w: 1440,
    h: 900,
    theme: "dark",
    scrollY: 0,
    clip: { selector: ".v4-kopf, [data-testid=arbeit-chart-shell]", pad: 8 },
  },
  {
    file: "crop-miniplot-markt-390-light.png",
    path: "/monat/2026-10?faktor=1&fahrweise=markt",
    w: 390,
    h: 844,
    theme: "light",
    selector: '[data-testid="arbeit-mobile-paths"] > div:nth-child(3)',
  },
];

async function assertSvgCollisions(page) {
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="arbeit-wirkung-svg"]') ||
      document.querySelector('[data-testid="arbeit-mobile-paths"]'),
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1100);
  return page.evaluate(() => {
    const violations = [];

    function boxOf(el) {
      const b = el.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }

    function overlap(a, b, pad = 2) {
      return (
        a.x < b.x + b.w - pad &&
        a.x + a.w > b.x + pad &&
        a.y < b.y + b.h - pad &&
        a.y + a.h > b.y + pad
      );
    }

    function distPointSeg(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-9) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    function boxNearSeg(box, seg, th) {
      const pts = [
        [box.x, box.y],
        [box.x + box.w, box.y],
        [box.x, box.y + box.h],
        [box.x + box.w, box.y + box.h],
        [box.x + box.w / 2, box.y + box.h / 2],
      ];
      return pts.some(([px, py]) => distPointSeg(px, py, seg.x1, seg.y1, seg.x2, seg.y2) <= th);
    }

    function pathSegs(path) {
      const d = path.getAttribute("d") || "";
      const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?,-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
      const coords = nums.map((n) => {
        const [xs, ys] = n.split(",");
        return { x: Number(xs), y: Number(ys) };
      });
      const segs = [];
      for (let i = 0; i < coords.length - 1; i++) {
        segs.push({
          x1: coords[i].x,
          y1: coords[i].y,
          x2: coords[i + 1].x,
          y2: coords[i + 1].y,
        });
      }
      return segs;
    }

    const svg = document.querySelector('[data-testid="arbeit-wirkung-svg"]');
    if (svg) {
      const plot = svg.querySelector('[data-testid="arbeit-plot-frame"]');
      const plotBox = plot ? boxOf(plot) : null;
      const labels = [...svg.querySelectorAll("[data-placement-label]")];
      const paths = [...svg.querySelectorAll("[data-chart-path]")];
      const points = [...svg.querySelectorAll("[data-chart-point]")];
      const ticks = [...svg.querySelectorAll("[data-chart-tick]")];
      const yTitles = [...svg.querySelectorAll("[data-chart-y-title]")];

      const add = (v) => {
        if (!violations.includes(v)) violations.push(v);
      };

      for (const label of labels) {
        const lb = boxOf(label);
        const id = label.getAttribute("data-placement-label") || "label";
        for (const other of labels) {
          if (other === label) continue;
          if (overlap(lb, boxOf(other))) {
            add(`label×label:${id}×${other.getAttribute("data-placement-label")}`);
          }
        }
        for (const path of paths) {
          const strat = path.getAttribute("data-chart-path");
          let hit = false;
          for (const seg of pathSegs(path)) {
            if (boxNearSeg(lb, seg, 3)) {
              hit = true;
              break;
            }
          }
          if (hit) add(`label×path:${id}×${strat}`);
        }
        for (const pt of points) {
          const c = pt.querySelector("circle");
          if (!c) continue;
          const cx = Number(c.getAttribute("cx"));
          const cy = Number(c.getAttribute("cy"));
          const r = Number(c.getAttribute("r")) + 4;
          if (overlap(lb, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }, 1)) {
            add(`label×point:${id}×${pt.getAttribute("data-chart-point")}`);
          }
        }
        for (const factor of svg.querySelectorAll("[data-chart-factor]")) {
          if (overlap(lb, boxOf(factor), 1)) {
            add(`label×factor:${id}×${factor.getAttribute("data-chart-factor")}`);
          }
        }
        for (const tick of ticks) {
          if (overlap(lb, boxOf(tick), 1)) add(`label×tick:${id}×${tick.getAttribute("data-chart-tick")}`);
        }
        void plotBox;
      }

      for (const yt of yTitles) {
        const yb = boxOf(yt);
        const key = yt.getAttribute("data-chart-y-title");
        for (const tick of ticks) {
          const tid = tick.getAttribute("data-chart-tick") || "";
          if (!tid.startsWith("y-")) continue;
          if (overlap(yb, boxOf(tick), 1)) violations.push(`y-title×tick:${key}×${tid}`);
        }
      }

      for (const factor of svg.querySelectorAll("[data-chart-factor]")) {
        const pt = factor.closest("[data-chart-point]");
        const c = pt?.querySelector("circle");
        if (!c) continue;
        const cx = Number(c.getAttribute("cx"));
        const cy = Number(c.getAttribute("cy"));
        const r = Number(c.getAttribute("r")) + 2;
        if (overlap(boxOf(factor), { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }, 1)) {
          add(`factor×own-point:${factor.getAttribute("data-chart-factor")}`);
        }
      }
    }

    const dauer = document.querySelector('[data-testid="dauerlinie-svg"]');
    if (dauer) {
      const add = (v) => {
        if (!violations.includes(v)) violations.push(v);
      };
      const dTicks = [...dauer.querySelectorAll("[data-chart-tick]")];
      for (let i = 0; i < dTicks.length; i++) {
        for (let j = i + 1; j < dTicks.length; j++) {
          const idA = dTicks[i].getAttribute("data-chart-tick");
          const idB = dTicks[j].getAttribute("data-chart-tick");
          if (idA === "x-title" || idB === "x-title") continue;
          if (overlap(boxOf(dTicks[i]), boxOf(dTicks[j]), 1)) {
            add(`dauer-tick×tick:${idA}×${idB}`);
          }
        }
      }
      const tal = dauer.querySelector('[data-testid="dauer-tal-label"]');
      const xTitle = dauer.querySelector('[data-chart-tick="x-title"]');
      if (tal && xTitle && overlap(boxOf(tal), boxOf(xTitle), 2)) add("dauer-tal×x-title");
      const layout = dauer.getAttribute("data-dauer-layout");
      if (layout === "mobile") {
        const plot = dauer.querySelector('[data-testid="dauer-plot-frame"]');
        if (plot) {
          const ph = plot.getBoundingClientRect().height;
          if (ph < 280) add(`dauer-plot-height:${ph.toFixed(1)}`);
        }
        for (const tick of dTicks) {
          const th = tick.getBoundingClientRect().height;
          if (th < 11) {
            add(`dauer-tick-font:${tick.getAttribute("data-chart-tick")}:${th.toFixed(1)}`);
          }
        }
        const vb = dauer.viewBox.baseVal;
        const vw = vb.width;
        const vh = vb.height;
        const textEls = [
          ...dauer.querySelectorAll("[data-chart-tick]"),
          ...dauer.querySelectorAll('[data-testid="dauer-hero-gw"]'),
          ...dauer.querySelectorAll('[data-testid="dauer-tal-label"]'),
        ];
        for (const el of textEls) {
          const bb = el.getBBox();
          if (bb.x < -1 || bb.y < -1 || bb.x + bb.width > vw + 1 || bb.y + bb.height > vh + 1) {
            add(
              `dauer-text-clip:${el.getAttribute("data-chart-tick") || el.getAttribute("data-testid")}:${bb.x.toFixed(0)},${bb.y.toFixed(0)},${bb.width.toFixed(0)},${bb.height.toFixed(0)}`,
            );
          }
        }
      }
    }

    const mobileRoot = document.querySelector('[data-testid="arbeit-mobile-paths"]');
    const mobileVisible =
      mobileRoot && window.getComputedStyle(mobileRoot).display !== "none" && mobileRoot.getClientRects().length > 0;
    if (mobileVisible) {
      const inner = window.innerWidth - 12;
      const screenOverlap = (a, b, pad = 2) =>
        a.left < b.right - pad &&
        a.right > b.left + pad &&
        a.top < b.bottom - pad &&
        a.bottom > b.top + pad;

      mobileRoot.querySelectorAll("[data-mobile-value]").forEach((value) => {
        const vr = value.getBoundingClientRect();
        if (vr.top < 4) violations.push(`mobile-clip:value-top:${value.textContent}`);
        const g = value.parentElement;
        const circle = g?.querySelector("circle");
        if (circle) {
          const cr = circle.getBoundingClientRect();
          if (screenOverlap(vr, cr, 1)) violations.push(`mobile-value×point:${value.textContent}`);
          if (vr.bottom > cr.top - 3) violations.push(`mobile-value-not-above:${value.textContent}`);
        }
      });
      mobileRoot.querySelectorAll("text").forEach((el, idx) => {
        const r = el.getBoundingClientRect();
        if (r.top < 0) violations.push(`mobile-clip:top:${idx}`);
        if (r.right > inner + 0.5 && !el.hasAttribute("data-mobile-gwh")) {
          violations.push(`mobile-clip:right:${idx}`);
        }
      });
      mobileRoot.querySelectorAll("svg").forEach((svg) => {
        const gwhEnds = [...svg.querySelectorAll("[data-mobile-gwh]")];
        const last = gwhEnds[gwhEnds.length - 1];
        if (last && last.getBoundingClientRect().right > inner + 0.5) {
          violations.push(`mobile-clip:gwh-last:${last.textContent}`);
        }
      });
    }

    const nav = document.querySelector(".v4-kopf-inner.v4-content");
    const kopfLeft = nav ? nav.getBoundingClientRect().left : 16;
    const minContentLeft = Math.max(16, kopfLeft) - 1;
    for (const id of ["monat-arbeit-wirkung-title", "monat-dauerlinie-title"]) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().left < minContentLeft) violations.push(`content-left:${id}`);
    }

    const unique = [...new Set(violations)];
    return { ok: unique.length === 0, violations: unique, labelCount: svg?.querySelectorAll("[data-placement-label]").length ?? 0 };
  });
}

async function main() {
  patchTurbopackCssChunk();
  mkdirSync(OUT, { recursive: true });
  if (existsSync(OUT)) {
    for (const name of readdirSync(OUT)) {
      if (name.endsWith(".png")) rmSync(join(OUT, name), { force: true });
    }
  }
  const browser = await chromium.launch({ headless: true });
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    await preparePage(page, s.theme);
    await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await applyTheme(page, s.theme);
    await waitStyled(page);
    await page.waitForSelector("[data-testid=konzept-root], #monat-arbeit-wirkung-title, [data-testid=ort-unb-hinweis]", {
      timeout: 120_000,
    }).catch(() => {});
    if (s.scrollY != null) {
      await page.evaluate((y) => window.scrollTo(0, y), s.scrollY);
    }
    if (s.scrollToDauer) {
      await page.waitForSelector('[data-testid="dauerlinie-svg"]', { state: "attached", timeout: 120_000 });
      await page.waitForFunction(
        () => document.querySelector('[data-testid="dauerlinie-svg"]')?.getAttribute("data-dauer-layout") === "mobile",
        { timeout: 60_000 },
      );
      const dauerLoc = page.locator('[data-testid="dauerlinie-svg"]');
      await dauerLoc.scrollIntoViewIfNeeded({ timeout: 60_000 });
      await page.waitForTimeout(600);
    } else if (s.scrollTo) {
      await page.waitForSelector(s.scrollTo, { state: "visible", timeout: 120_000 });
      await page.locator(s.scrollTo).scrollIntoViewIfNeeded({ timeout: 60_000 });
    }
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(OUT, s.file), fullPage: Boolean(s.fullPage) });
    await page.close();
  }
  for (const s of CROP_SHOTS) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    await preparePage(page, s.theme);
    await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await applyTheme(page, s.theme);
    await waitStyled(page);
    await page.waitForSelector("[data-testid=konzept-root]", { timeout: 60_000 }).catch(() => {});
    if (s.scrollY != null) await page.evaluate((y) => window.scrollTo(0, y), s.scrollY);
    if (s.scrollTo) {
      await page.waitForSelector(s.scrollTo, { state: "visible", timeout: 120_000 });
      await page.locator(s.scrollTo).scrollIntoViewIfNeeded({ timeout: 60_000 });
    }
    await page.waitForTimeout(350);
    if (s.clip?.selector) {
      const box = await page.evaluate(({ sel, pad }) => {
        const nodes = [...document.querySelectorAll(sel)];
        if (!nodes.length) return null;
        let x1 = Infinity;
        let y1 = Infinity;
        let x2 = -Infinity;
        let y2 = -Infinity;
        for (const n of nodes) {
          const r = n.getBoundingClientRect();
          x1 = Math.min(x1, r.left);
          y1 = Math.min(y1, r.top);
          x2 = Math.max(x2, r.right);
          y2 = Math.max(y2, r.bottom);
        }
        return { x: Math.max(0, x1 - pad), y: Math.max(0, y1 - pad), width: x2 - x1 + 2 * pad, height: y2 - y1 + 2 * pad };
      }, { sel: s.clip.selector, pad: s.clip.pad ?? 0 });
      if (box) await page.screenshot({ path: join(OUT, s.file), clip: box });
    } else if (s.selector) {
      const loc = page.locator(s.selector).first();
      await loc.waitFor({ state: "visible", timeout: 60_000 });
      await loc.screenshot({ path: join(OUT, s.file) });
    }
    await page.close();
  }
  const collisionByViewport = {};
  for (const vp of [
    { name: "1440", w: 1440, h: 900 },
    { name: "1024", w: 1024, h: 900 },
    { name: "390", w: 390, h: 844, mobile: true },
  ]) {
    const collisionPage = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await preparePage(collisionPage, "dark");
    const collisionPath =
      vp.mobile && vp.name === "390"
        ? "/monat/2026-10?faktor=10&fahrweise=markt&morph=1"
        : "/monat/2026-10?faktor=10&fahrweise=markt";
    await collisionPage.goto(`${BASE}${collisionPath}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await applyTheme(collisionPage, "dark");
    await waitStyled(collisionPage);
    if (vp.mobile && vp.name === "390") {
      await collisionPage.waitForSelector("#monat-dauerlinie-title", { timeout: 60_000 }).catch(() => {});
      await collisionPage.locator("#monat-dauerlinie-title").scrollIntoViewIfNeeded({ timeout: 60_000 });
      await collisionPage.waitForTimeout(400);
    }
    const result = await assertSvgCollisions(collisionPage);
    if (vp.mobile) {
      const mobileOnly = result.violations.filter(
        (v) =>
          v.startsWith("mobile-") ||
          v.startsWith("content-left") ||
          v.startsWith("dauer-"),
      );
      collisionByViewport[vp.name] = { ...result, violations: mobileOnly, ok: mobileOnly.length === 0 };
    } else {
      const deskOnly = result.violations.filter(
        (v) => !v.startsWith("mobile-"),
      );
      collisionByViewport[vp.name] = { ...result, violations: deskOnly, ok: deskOnly.length === 0 };
    }
    await collisionPage.close();
  }
  await browser.close();

  const allViolations = [
    ...new Set(
      Object.entries(collisionByViewport).flatMap(([vp, r]) => r.violations.map((v) => `${vp}:${v}`)),
    ),
  ];
  const ok = allViolations.length === 0;
  writeFileSync(
    join(process.cwd(), "docs/audit-2026-11/paket4/label-collision.json"),
    JSON.stringify({ ok, violations: allViolations, viewports: collisionByViewport }, null, 2),
  );
  if (!ok) {
    throw new Error(`SVG collision: ${allViolations.join(", ")}`);
  }

  const lhSummary = [];
  for (const route of ["/monat/2026-10?faktor=10&fahrweise=markt", "/ort"]) {
    const outFile = join(LH, `lighthouse-${route.includes("monat") ? "monat" : "ort"}-mobile.json`);
    execSync(
      `pnpm dlx lighthouse@12.6.1 ${JSON.stringify(BASE + route)} --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile=true --output=json --output-path=${JSON.stringify(outFile)} --chrome-flags="--headless --no-sandbox" --quiet`,
      { stdio: "inherit" },
    );
    const report = JSON.parse(readFileSync(outFile, "utf8"));
    lhSummary.push({
      route,
      perf: Math.round((report.categories.performance?.score ?? 0) * 100),
      a11y: Math.round((report.categories.accessibility?.score ?? 0) * 100),
      cls: report.audits["cumulative-layout-shift"]?.numericValue ?? null,
    });
  }
  writeFileSync(join(LH, "lighthouse-summary.json"), JSON.stringify(lhSummary, null, 2));
  console.log("OK", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  throw e;
});
