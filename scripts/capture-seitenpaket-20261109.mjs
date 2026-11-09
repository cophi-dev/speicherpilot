import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "review-artifacts/seitenpaket-20261109/screens");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3099";

const shots = [
  { file: "start", path: "/" },
  { file: "tag-2026-10-29-f1", path: "/tag/2026-10-29?faktor=1", waitFleet: true },
  { file: "monat-2026-10-f1", path: "/monat/2026-10?faktor=1&fahrweise=spitze", waitFleet: true },
  { file: "monat-2026-10-f5", path: "/monat/2026-10?faktor=5&fahrweise=spitze", waitFleet: true },
];

async function applyTheme(page, theme) {
  await page.evaluate((mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
    localStorage.setItem("speicherpilot-theme", mode);
  }, theme);
  await new Promise((r) => setTimeout(r, 350));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const { file, path, waitFleet } of shots) {
    for (const width of [375, 1280]) {
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
        await applyTheme(page, theme);
        if (waitFleet) {
          const tooltip = page.locator('[data-testid="fleet-ts-tooltip"]');
          try {
            await tooltip.waitFor({ state: "visible", timeout: 15_000 });
            if (await tooltip.evaluate((el) => el.classList.contains("muted"))) {
              await page.locator(".v4-fleet-ts-interactive").hover({ timeout: 5000 });
            }
          } catch {
            /* chart optional */
          }
        }
        await page.screenshot({
          path: join(OUT, `${file}-${width}-${theme}.png`),
          fullPage: true,
        });
      }
    }
  }
  await browser.close();
  writeFileSync(
    join(process.cwd(), "review-artifacts/seitenpaket-20261109/screens/manifest-skeleton.json"),
    JSON.stringify({ base: BASE, shots }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
