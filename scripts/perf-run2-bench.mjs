#!/usr/bin/env node
/**
 * Median TTFB + HTML bytes (build + next start). Usage:
 *   node scripts/perf-run2-bench.mjs --port=3098 --runs=7
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3098);
const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 7);
const base = `http://127.0.0.1:${port}`;

const routes = [
  { name: "tag", path: "/tag/2026-10-29?faktor=1" },
  { name: "monat", path: "/monat/2026-10?faktor=1&fahrweise=spitze" },
];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function measure(path) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`, { headers: { Accept: "text/html" } });
  const body = await res.text();
  return { status: res.status, ttfbMs: Math.round(performance.now() - t0), bytes: body.length };
}

const server = spawn("pnpm", ["start", "-p", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let ready = false;
server.stdout.on("data", (d) => {
  if (String(d).includes("Ready")) {
    ready = true;
  }
});

for (let i = 0; i < 60 && !ready; i += 1) {
  await sleep(500);
  try {
    if ((await fetch(base)).ok) {
      ready = true;
      break;
    }
  } catch {
    /* wait */
  }
}

if (!ready) {
  server.kill();
  process.exit(2);
}

const out = {};
for (const route of routes) {
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    samples.push(await measure(route.path));
    await sleep(80);
  }
  out[route.name] = {
    path: route.path,
    runs,
    ttfbMs: samples.map((s) => s.ttfbMs),
    bytes: samples.map((s) => s.bytes),
    medianTtfbMs: Math.round(median(samples.map((s) => s.ttfbMs))),
    medianBytes: Math.round(median(samples.map((s) => s.bytes))),
    status: samples[0]?.status,
  };
}

server.kill();
console.log(JSON.stringify({ port, measuredAt: new Date().toISOString(), routes: out }, null, 2));
