import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../docs/audit-2026-11/design-audit-p1-1611/screens");
const base = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000";

const shots = [
  { route: "/", name: "home", methodik: false },
  { route: "/methodik", name: "methodik", methodik: true },
];

async function snap(page, file) {
  await page.screenshot({ path: path.join(outDir, file), fullPage: false });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  for (const { route, name } of shots) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        colorScheme: theme,
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      await snap(page, `${name}-1280-${theme}.png`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await snap(page, `${name}-390-${theme}.png`);
      await context.close();
    }
  }
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      localStorage.setItem("speicherpilot-theme", "dark");
    });
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: "commit" });
    await page.waitForTimeout(100);
    const darkOnHtml = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (!darkOnHtml) {
      throw new Error("Expected .dark on <html> on first paint with stored theme");
    }
    await snap(page, "home-390-dark-stored-localStorage.png");
    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});