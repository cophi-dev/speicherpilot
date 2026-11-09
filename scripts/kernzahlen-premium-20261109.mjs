import { readFileSync, writeFileSync } from "node:fs";

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "https://www.speicherpilot.app";
const OUT = process.env.OUT ?? "docs/audit-2026-11-premium/kernzahlen-vorher.json";
const COMPARE = process.env.COMPARE;

const ROUTES = [
  "/",
  "/tag/2026-11-08",
  "/tag/2026-10-24",
  "/tag/2026-10-25",
  "/monat/2026-10?faktor=1&fahrweise=ueberschuss",
  "/monat/2026-10?faktor=5&fahrweise=spitze",
];

const FIGURE = /[−-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?\s?(?:GWh|GW|MWh|MW|%|€\/MWh|Tage)/g;

function figures(text) {
  const counts = {};
  for (const m of text.replace(/\u00a0/g, " ").matchAll(FIGURE)) {
    const key = m[0].replace(/\s/g, " ").replace("-", "−");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/local/bin/google-chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const result = {};
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 120_000 });
    const text = await page.evaluate(() => {
      document.querySelectorAll("details").forEach((d) => {
        d.open = true;
      });
      return document.querySelector("main")?.innerText ?? document.body.innerText;
    });
    result[route] = { euroSigns: (text.match(/€(?!\/MWh)/g) ?? []).length, figures: figures(text) };
  }
  await browser.close();
  writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);

  if (COMPARE) {
    const before = JSON.parse(readFileSync(COMPARE, "utf8"));
    let missing = 0;
    for (const route of ROUTES) {
      const a = before[route].figures;
      const b = result[route].figures;
      const lost = Object.keys(a).filter((k) => (b[k] ?? 0) < a[k]);
      const added = Object.keys(b).filter((k) => (a[k] ?? 0) < b[k]);
      missing += lost.length;
      console.log(route, "fehlt:", lost.join(" | ") || "–", "· neu:", added.join(" | ") || "–");
    }
    process.exit(missing === 0 ? 0 : 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
