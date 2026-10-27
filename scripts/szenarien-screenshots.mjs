import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SZENARIEN_URL ?? "http://127.0.0.1:3456";
const out = process.env.SZENARIEN_OUT ?? "/opt/cursor/artifacts";

const cases = [
  ["normal", "p=103.5&e=238.5&g=51.75&form=fest&v=12&start=1&jahr=12m"],
  ["g0", "g=0"],
  ["g-ueber-p", "g=200"],
  ["v36", "v=36"],
  ["fehler", "g=-1"],
];

const themes = ["light", "dark"];
const widths = [1280, 390];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const overflows = [];

for (const theme of themes) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
    await page.addInitScript((value) => {
      localStorage.setItem("speicherpilot-theme", value);
    }, theme);
    for (const [name, query] of cases) {
      await page.goto(`${base}/szenarien?${query}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(
        (mode) => {
          const text = document.body.innerText;
          if (mode === "fehler") {
            return text.includes("Bitte eine Zahl von 0 oder größer eingeben.");
          }
          return text.includes("im Modell") && !text.includes("konnte nicht geladen");
        },
        name,
      );
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (overflow) {
        overflows.push(`${name}-${theme}-${width}`);
      }
      await page.screenshot({ path: `${out}/szenarien-${name}-${theme}-${width}.png`, fullPage: true });
    }
    await page.close();
  }
}

await browser.close();
if (overflows.length > 0) {
  console.error("horizontal overflow", overflows.join(", "));
  process.exit(1);
}
console.log("screenshots ok");
