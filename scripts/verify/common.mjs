#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = join(__dir, "../..");
export const VERIFY_DIR = join(REPO_ROOT, "verify");
export const ARTIFACT_DIR = process.env.VERIFY_ARTIFACT_DIR ?? join(REPO_ROOT, ".verify-artifacts");

export function loadJson(relPath) {
  return JSON.parse(readFileSync(join(REPO_ROOT, relPath), "utf8"));
}

export function ensureArtifactDir(sub = "") {
  const dir = join(ARTIFACT_DIR, sub);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeReport(name, data) {
  const dir = ensureArtifactDir();
  const path = join(dir, name);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  return path;
}

export function getBaseUrl() {
  const raw = process.env.VERIFY_BASE_URL?.trim() || process.env.SITE_E2E_BASE_URL?.trim();
  if (!raw) {
    throw new Error("VERIFY_BASE_URL or SITE_E2E_BASE_URL required");
  }
  return raw.replace(/\/$/, "");
}

export async function probeUrl(base, path = "/") {
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "speicherpilot-verify/1.0" },
    });
    const text = await res.text();
    return { url: res.url, status: res.status, ok: res.ok, text, headers: res.headers };
  } catch (error) {
    return { url, status: 0, ok: false, text: "", error: String(error) };
  }
}

/** Prefer Vercel preview when reachable; otherwise keep the given base. */
export async function chooseReachableBase(primary, fallback) {
  for (const candidate of [primary, fallback].filter(Boolean)) {
    const probe = await probeUrl(candidate, "/");
    if (probe.status >= 200 && probe.status < 400) {
      return { base: candidate.replace(/\/$/, ""), via: candidate === primary ? "preview" : "fallback" };
    }
  }
  throw new Error(`No reachable base (tried: ${[primary, fallback].filter(Boolean).join(", ")})`);
}

export function extractHrefs(html, baseOrigin) {
  const hrefs = [];
  const seen = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)) {
    const raw = m[1];
    if (seen.has(raw)) continue;
    seen.add(raw);
    const hashIdx = raw.indexOf("#");
    if (hashIdx >= 0) {
      hrefs.push({ href: raw.slice(0, hashIdx) || "/", hash: raw.slice(hashIdx + 1) });
    } else {
      hrefs.push({ href: raw, hash: "" });
    }
  }
  const ids = new Set();
  for (const m of html.matchAll(/\sid=["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    null;
  return { hrefs, ids, canonical };
}

export function isInternalHref(href, origin) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
    return false;
  }
  if (href.startsWith("/")) return true;
  try {
    const u = new URL(href);
    const o = new URL(origin);
    return u.origin === o.origin;
  } catch {
    return false;
  }
}

export function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function pathMatchesAny(path, patterns) {
  return patterns.some((p) => {
    if (p.includes("*")) {
      const re = new RegExp(`^${p.replace(/\*/g, ".*").replace(/\//g, "\\/")}$`);
      return re.test(path);
    }
    return path === p || path.startsWith(`${p}/`);
  });
}

import { execSync } from "node:child_process";

export function gitPathsChanged(baseRef = "origin/main") {
  try {
    const out = execSync(`git merge-base HEAD ${baseRef}`, { encoding: "utf8", cwd: REPO_ROOT }).trim();
    const files = execSync(`git diff --name-only ${out}...HEAD`, { encoding: "utf8", cwd: REPO_ROOT })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return files;
  } catch {
    return [];
  }
}

export function summarizeFailure(report) {
  return {
    ok: report.ok ?? false,
    summary: report.summary ?? null,
    reportPath: report.reportPath ?? null,
  };
}

export function exitIfReportsFailed(reports) {
  const failed = reports.filter((r) => !r.ok);
  if (failed.length) {
    console.error(JSON.stringify({ failed: failed.map((f) => f.name) }, null, 2));
    process.exit(1);
  }
}

export function loadEnumerateRoutes() {
  const manifestPath = join(ARTIFACT_DIR, "indexable-routes.json");
  if (existsSync(manifestPath)) {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  }
  throw new Error(`Missing ${manifestPath} — run enumerate-indexable-routes first`);
}