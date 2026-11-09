/**
 * Prod-ähnliche Messung: TTFB-Proxy via route handlers / built pages timing.
 * Usage: node scripts/seitenpaket-perf-baseline.mjs [--port 3000]
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3099);
const base = `http://127.0.0.1:${port}`;

const paths = [
  { name: "tag", path: "/tag/2026-10-29?faktor=1" },
  { name: "monat", path: "/monat/2026-10?faktor=1" },
  { name: "monat-x5", path: "/monat/2026-10?faktor=5&fahrweise=spitze" },
];

async function measure(path) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`, { headers: { Accept: "text/html" } });
  const body = await res.text();
  const t1 = performance.now();
  return {
    status: res.status,
    ttfbMs: Math.round(t1 - t0),
    bytes: body.length,
    hasFleetInitial: body.includes("v4-fleet-ts-wrap"),
    hasFleetLoading: body.includes("Zeitreihe wird geladen"),
  };
}

const server = spawn("pnpm", ["start", "-p", String(port)], {
  cwd: new URL("..", import.meta.url).pathname,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let ready = false;
server.stdout.on("data", (d) => {
  if (String(d).includes("Ready") || String(d).includes("started")) {
    ready = true;
  }
});

for (let i = 0; i < 90 && !ready; i += 1) {
  await sleep(500);
  try {
    const r = await fetch(base);
    if (r.ok) {
      ready = true;
      break;
    }
  } catch {
    /* wait */
  }
}

if (!ready) {
  server.kill();
  console.error(JSON.stringify({ error: "server_not_ready", port }));
  process.exit(1);
}

const results = {};
for (const item of paths) {
  results[item.name] = await measure(item.path);
}

server.kill();
console.log(JSON.stringify({ port, measuredAt: new Date().toISOString(), results }, null, 2));
