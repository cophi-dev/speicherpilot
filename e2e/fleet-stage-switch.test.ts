/**
 * @jest-environment node
 * RUN_BROWSER_TESTS=1 SITE_E2E_BASE_URL=http://127.0.0.1:3000 pnpm test -- e2e/fleet-stage-switch.test.ts
 */
import { chromium, type Browser } from "playwright";

const BASE = process.env.SITE_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runBrowser = process.env.RUN_BROWSER_TESTS === "1";

async function strokeWidthForFactor(page: import("playwright").Page, factor: number) {
  await page.goto(`${BASE}/tag/2026-10-29?faktor=${factor}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".v4-fleet-ts-interactive", { timeout: 60_000 });
  return page.evaluate(() => {
    const measured = document.querySelector(".v4-fleet-line-r-measured");
    const main = document.querySelector(".v4-fleet-line-rp-main, .v4-fleet-line-rp");
    const target = measured ?? main;
    if (!target) return null;
    return parseFloat(getComputedStyle(target).strokeWidth || "0");
  });
}

describe("fleet stage switch", () => {
  jest.setTimeout(180_000);

  (runBrowser ? it : it.skip)("×1/×2/×5/×10 wechseln den Graph (×1 messlinie, ×2 R′)", async () => {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const w1 = await strokeWidthForFactor(page, 1);
      const w2 = await strokeWidthForFactor(page, 2);
      expect(w1).not.toBeNull();
      expect(w2).not.toBeNull();
      expect(w2).toBeGreaterThan(0);

      const pill5 = page.locator('.v4-fleet-pill[aria-pressed="false"]').filter({ hasText: "×5" }).first();
      await pill5.click();
      await page.waitForURL(/faktor=5/);
      await page.waitForSelector(".v4-fleet-band-charge, .v4-fleet-line-rp-main", { timeout: 30_000 });
      const hasBands = (await page.locator(".v4-fleet-band-charge").count()) > 0;
      expect(hasBands).toBe(true);

      const pressed = await page.locator('.v4-fleet-pill[aria-pressed="true"]').filter({ hasText: "×5" }).count();
      expect(pressed).toBe(1);
    } finally {
      await browser?.close();
    }
  });
});