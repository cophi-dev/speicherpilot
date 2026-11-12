#!/usr/bin/env node
/**
 * Replace literal font-size px values with typography CSS variables.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";

function walkCss(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkCss(full, acc);
    } else if (ent.name.endsWith(".css")) {
      acc.push(full);
    }
  }
  return acc;
}

const SIZE_MAP = new Map([
  ["9px", "var(--type-12)"],
  ["10px", "var(--type-12)"],
  ["11px", "var(--type-12)"],
  ["12px", "var(--type-12)"],
  ["13px", "var(--type-14)"],
  ["14px", "var(--type-14)"],
  ["15px", "var(--type-16)"],
  ["16px", "var(--type-16)"],
  ["17px", "var(--type-18)"],
  ["18px", "var(--type-18)"],
  ["19px", "var(--type-18)"],
  ["20px", "var(--type-24)"],
  ["22px", "var(--type-24)"],
  ["24px", "var(--type-24)"],
  ["26px", "var(--type-32)"],
  ["28px", "var(--type-32)"],
  ["32px", "var(--type-32)"],
  ["34px", "var(--type-32)"],
  ["36px", "var(--type-48)"],
  ["40px", "var(--type-48)"],
  ["42px", "var(--type-48)"],
  ["44px", "var(--type-48)"],
  ["48px", "var(--type-48)"],
  ["52px", "var(--type-48)"],
  ["56px", "var(--type-display)"],
  ["60px", "var(--type-display)"],
  ["72px", "var(--type-display)"],
]);

const root = path.resolve(import.meta.dirname, "..");
const files = [
  path.join(root, "app/globals.css"),
  ...walkCss(path.join(root, "components")).filter((f) => f.endsWith(".module.css") || f.endsWith("research.module.css")),
];

for (const file of files) {
    let src = readFileSync(file, "utf8");
    let changed = false;
    for (const [px, token] of SIZE_MAP) {
      const re = new RegExp(`font-size:\\s*${px.replace("px", "")}px`, "g");
      const next = src.replace(re, `font-size: ${token}`);
      if (next !== src) {
        changed = true;
        src = next;
      }
    }
  if (changed) {
    writeFileSync(file, src);
    console.log("updated", path.relative(root, file));
  }
}
