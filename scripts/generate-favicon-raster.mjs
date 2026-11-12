#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname;
const iconSvg = readFileSync(`${root}/app/icon.svg`, "utf8");
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
await page.setContent(
  `<!doctype html><body style="margin:0;background:#0A0F14"><img src="${dataUrl}" width="180" height="180" alt=""/></body>`,
);
const png = await page.locator("img").screenshot({ type: "png" });
writeFileSync(`${root}/app/apple-icon.png`, png);

const page32 = await browser.newPage({ viewport: { width: 32, height: 32 } });
await page32.setContent(
  `<!doctype html><body style="margin:0;background:#0A0F14"><img src="${dataUrl}" width="32" height="32" alt=""/></body>`,
);
const png32 = await page32.locator("img").screenshot({ type: "png" });
writeFileSync(`${root}/app/favicon.ico`, png32);

await browser.close();
console.log("wrote app/apple-icon.png and app/favicon.ico");
