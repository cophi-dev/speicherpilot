#!/usr/bin/env node
/**
 * Writes public/build-provenance.json after production build (HEAD must match deployed bits).
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const commit = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: root }).trim();
const dirtyLines = execSync("git status --porcelain", { encoding: "utf8", cwd: root }).trim();
const buildId = process.env.BUILD_ID ?? execSync("date -u +%Y%m%dT%H%MZ", { encoding: "utf8" }).trim();
const payload = {
  commit,
  buildId,
  builtAt: new Date().toISOString(),
  node: process.version,
  dirty: Boolean(dirtyLines),
};
mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public/build-provenance.json"), `${JSON.stringify(payload, null, 2)}\n`);
console.log("Wrote public/build-provenance.json", commit.slice(0, 7), buildId);
