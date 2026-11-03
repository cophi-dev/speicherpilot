import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";

const HTML_ROUTES = [
  ["/", "home"],
  ["/methodik", "methodik"],
  ["/ort?sicht=projekt", "ort-projekt"],
  ["/ort?sicht=netz", "ort-netz"],
  ["/tag/2026-11-02", "tag"],
];

async function htmlBytes(path) {
  const out = execSync(`curl -sS -o /tmp/sp-html.bin -w '%{size_download}' '${BASE}${path}'`, { encoding: "utf8" });
  return Number(out.trim());
}

async function main() {
  const rows = [];

  for (const [path, name] of HTML_ROUTES) {
    const bytes = await htmlBytes(path);
    rows.push({ kind: "html_kb", route: name, path, value: Math.round(bytes / 1024), unit: "kB" });
    console.log("html", name, Math.round(bytes / 1024), "kB");
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  const home1440 = await page.evaluate(() => document.documentElement.scrollHeight);
  rows.push({ kind: "height_px", route: "home", viewport: "1440", value: home1440, unit: "px" });
  console.log("home height 1440", home1440);

  await page.setViewportSize({ width: 375, height: 740 });
  await page.reload({ waitUntil: "networkidle" });
  const home375 = await page.evaluate(() => document.documentElement.scrollHeight);
  rows.push({ kind: "height_px", route: "home", viewport: "375", value: home375, unit: "px" });

  await page.goto(`${BASE}/live?tag=2026-10-29`, { waitUntil: "networkidle" });
  const liveRedirect = page.url();
  rows.push({ kind: "redirect", route: "live?tag=2026-10-29", value: liveRedirect, unit: "url" });
  console.log("live redirect", liveRedirect);

  await page.goto(`${BASE}/tag/2026-10-01`, { waitUntil: "networkidle" });
  const earlyTag = await page.evaluate(() => document.body.textContent?.includes("Zu wenig Daten") || document.body.textContent?.includes("liegt außerhalb"));
  rows.push({ kind: "tag_unavailable", route: "tag/2026-10-01", value: earlyTag ? 1 : 0, unit: "bool" });

  await browser.close();

  writeFileSync("/opt/cursor/artifacts/v4-r2-gates.json", JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
