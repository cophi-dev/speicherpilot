import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outScreens = path.resolve(__dirname, "../docs/audit-2026-11/vision-jahr-1611/screens");
const base = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000";

async function snap(page, file) {
  await page.screenshot({ path: path.join(outScreens, file), fullPage: true });
}

async function main() {
  await mkdir(outScreens, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const theme of ["light", "dark"]) {
    for (const [w, suffix] of [
      [1280, "1280"],
      [390, "390"],
    ]) {
      const context = await browser.newContext({
        colorScheme: theme,
        viewport: { width: w, height: w === 390 ? 844 : 900 },
      });
      const page = await context.newPage();
      await page.addInitScript((t) => {
        localStorage.removeItem("speicherpilot-vision-guess-skip");
        localStorage.setItem("speicherpilot-theme", t);
      }, theme);
      await page.goto(`${base}/vision`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      await snap(page, `vision-${suffix}-${theme}.png`);
      if (w === 390) {
        const g2 = page.locator("#vision-g2").locator("xpath=ancestor::section[1]");
        await g2.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await g2.screenshot({ path: path.join(outScreens, `vision-g2-${suffix}-${theme}.png`) });
      }
      await context.close();
    }
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});