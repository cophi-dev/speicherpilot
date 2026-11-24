import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const base = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "review-artifacts/netzbetreiber-v4");
mkdirSync(outDir, { recursive: true });

const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

const shots = [
  ["netzbetreiber-v4-light-1280", "/netzbetreiber", 1280, "light"],
  ["netzbetreiber-v4-dark-1280", "/netzbetreiber", 1280, "dark"],
  ["netzbetreiber-v4-light-390", "/netzbetreiber", 390, "light"],
  ["netzbetreiber-v4-dark-390", "/netzbetreiber", 390, "dark"],
  ["tag-ref-light-1280", "/tag/2026-11-23", 1280, "light"],
];

const browser = await chromium.launch();
for (const [name, path, width, theme] of shots) {
  const page = await browser.newPage({ viewport: { width, height: width <= 400 ? 2400 : 1800 } });
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  console.log("saved", name);
}
await browser.close();

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    {
      commit,
      builtAt: new Date().toISOString(),
      shots: shots.map(([name]) => `${name}.png`),
      fullPage: true,
    },
    null,
    2,
  ),
);