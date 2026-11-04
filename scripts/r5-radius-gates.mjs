#!/usr/bin/env node
/** R5: no visible border-radius > 2px (375 + 1440), except theme toggle + slider thumb. */
import { chromium } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const MAX_PX = 2;
const VIEWPORTS = [
  { tag: "375", width: 375, height: 900 },
  { tag: "1440", width: 1440, height: 900 },
];

const ROUTES = [
  "/",
  "/methodik",
  "/beitraege",
  "/beitraege/warum-grossspeicher-das-netz-flexibler-machen",
  "/impressum",
  "/datenschutz",
  "/ort?sicht=projekt",
  "/ort?sicht=netz",
  "/tag/2026-11-03",
];

function isAllowed(el) {
  if (el.closest('[data-slot="slider-thumb"]')) return true;
  if (el.closest('button[aria-label="Darstellung"]')) return true;
  return false;
}

function maxRadiusPx(el, cs) {
  const rect = el.getBoundingClientRect();
  const minSide = Math.min(rect.width, rect.height) / 2;
  const corners = [
    cs.borderTopLeftRadius,
    cs.borderTopRightRadius,
    cs.borderBottomLeftRadius,
    cs.borderBottomRightRadius,
  ];
  let max = 0;
  for (const shorthand of corners) {
    for (const part of shorthand.split(/\s+/)) {
      if (!part || part === "0") continue;
      if (part.endsWith("%")) {
        max = Math.max(max, minSide * (parseFloat(part) / 100));
      } else {
        max = Math.max(max, parseFloat(part) || 0);
      }
    }
  }
  return max;
}

async function scanPage(page) {
  return page.evaluate(
    ({ maxPx }) => {
      function isAllowed(el) {
        if (el.closest('[data-slot="slider-thumb"]')) return true;
        if (el.closest('button[aria-label="Darstellung"]')) return true;
        return false;
      }

      function maxRadiusPx(el, cs) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return 0;
        const minSide = Math.min(rect.width, rect.height) / 2;
        const corners = [
          cs.borderTopLeftRadius,
          cs.borderTopRightRadius,
          cs.borderBottomLeftRadius,
          cs.borderBottomRightRadius,
        ];
        let max = 0;
        for (const shorthand of corners) {
          for (const part of shorthand.split(/\s+/)) {
            if (!part || part === "0") continue;
            if (part.endsWith("%")) {
              max = Math.max(max, minSide * (parseFloat(part) / 100));
            } else {
              max = Math.max(max, parseFloat(part) || 0);
            }
          }
        }
        return max;
      }

      const offenders = [];
      const all = document.querySelectorAll("body *");
      for (const el of all) {
        if (isAllowed(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        const r = maxRadiusPx(el, cs);
        if (r > maxPx + 0.5) {
          const cls =
            typeof el.className === "string"
              ? el.className.split(/\s+/).slice(0, 4).join(".")
              : "";
          const id = el.id ? `#${el.id}` : "";
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: `${id}${cls}`,
            r: Math.round(r * 10) / 10,
          });
        }
      }
      offenders.sort((a, b) => b.r - a.r);
      return offenders.slice(0, 12);
    },
    { maxPx: MAX_PX },
  );
}

async function main() {
  const browser = await chromium.launch();
  let failed = false;
  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.tag}px ===`);
    for (const path of ROUTES) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(600);
      const offenders = await scanPage(page);
      if (offenders.length === 0) {
        console.log(`${path} OK`);
      } else {
        failed = true;
        console.log(`${path} FAIL (${offenders.length}+)`, offenders[0]);
        for (const o of offenders.slice(0, 5)) {
          console.log(`  ${o.tag}.${o.cls} → ${o.r}px`);
        }
      }
      await page.close();
    }
  }
  await browser.close();
  if (failed) {
    console.error("\nR5 radius gate failed.");
    process.exit(1);
  }
  console.log("\nAll R5 radius checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
