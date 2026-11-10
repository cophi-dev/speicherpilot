/**
 * Playwright: open / and /vision at 390×? and 1440×?, count intersecting SVG text bboxes.
 * Exit 0 only when overlap count is 0.
 */
import { chromium } from "playwright";

const VIEWPORTS = [
  { name: "390-dark", width: 390, height: 844, theme: "dark" },
  { name: "390-light", width: 390, height: 844, theme: "light" },
  { name: "1440-dark", width: 1440, height: 900, theme: "dark" },
  { name: "1440-light", width: 1440, height: 900, theme: "light" },
];

const PATHS = ["/", "/vision"];

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function countOverlaps(page) {
  return page.evaluate(() => {
    let n = 0;
    const pairs = [];
    for (const svg of document.querySelectorAll("svg")) {
      const texts = [...svg.querySelectorAll("text")];
      const boxes = texts
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter((r) => r.box.width > 0 && r.box.height > 0);
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i].box;
          const b = boxes[j].box;
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            n += 1;
            pairs.push([boxes[i].el.textContent?.trim(), boxes[j].el.textContent?.trim()]);
          }
        }
      }
    }
    return { n, pairs: pairs.slice(0, 20) };
  });
}

const base = process.env.RESEARCH_QA_BASE ?? "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
let total = 0;
const report = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: vp.theme });
  for (const path of PATHS) {
    if (path === "/vision") {
      await page.addInitScript(() => {
        window.localStorage.setItem("speicherpilot-vision-guess-skip", "1");
      });
    }
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const { n, pairs } = await countOverlaps(page);
    total += n;
    report.push({ viewport: vp.name, path, overlaps: n, sample: pairs });
  }
  await context.close();
}

await browser.close();

console.log(JSON.stringify({ totalOverlaps: total, report }, null, 2));
process.exit(total === 0 ? 0 : 1);
