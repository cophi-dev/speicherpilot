#!/usr/bin/env node
import {
  ARTIFACT_DIR,
  ensureArtifactDir,
  extractHrefs,
  getBaseUrl,
  isInternalHref,
  loadEnumerateRoutes,
  normalizePath,
  probeUrl,
  writeReport,
} from "./common.mjs";

const MAX_PAGES = Number(process.env.VERIFY_CRAWL_MAX_PAGES ?? 250);
const baseOrigin = new URL(getBaseUrl()).origin;

async function fetchSitemapPaths(base) {
  const res = await probeUrl(base, "/sitemap.xml");
  if (!res.ok) {
    return { ok: false, error: `sitemap.xml status ${res.status}`, paths: [] };
  }
  const paths = [];
  for (const m of res.text.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      paths.push(new URL(m[1]).pathname);
    } catch {
      /* skip */
    }
  }
  return { ok: true, paths: [...new Set(paths)] };
}

const targetIdCache = new Map();

async function idsForPath(base, targetPath) {
  const key = normalizePath(targetPath.split("?")[0]);
  if (targetIdCache.has(key)) {
    return targetIdCache.get(key);
  }
  const res = await probeUrl(base, key);
  const { ids } = extractHrefs(res.text ?? "", baseOrigin);
  targetIdCache.set(key, ids);
  return ids;
}

async function checkPage(base, path, seen) {
  const res = await probeUrl(base, path);
  const result = {
    path,
    finalUrl: res.url,
    status: res.status,
    ok: res.status >= 200 && res.status < 400,
    brokenAnchors: [],
    internalLinks: [],
    externalWarnings: [],
    parseError: res.error ?? null,
  };
  if (!res.text) {
    return result;
  }
  const { hrefs, ids } = extractHrefs(res.text, baseOrigin);
  for (const { href, hash } of hrefs) {
    if (!href) continue;
    const internal = isInternalHref(href, baseOrigin);
    if (internal) {
      let targetPath = href;
      if (href.startsWith("http")) {
        targetPath = new URL(href).pathname;
      }
      targetPath = normalizePath(targetPath.split("?")[0]);
      result.internalLinks.push(targetPath);
      if (hash) {
        const anchorPage = href.startsWith("/") || href.startsWith("http") ? targetPath : path;
        const pageIds = anchorPage === normalizePath(path) ? ids : await idsForPath(base, anchorPage);
        if (!pageIds.has(hash)) {
          result.brokenAnchors.push({ href, hash, page: path, anchorTarget: anchorPage });
        }
      }
      if (!seen.has(targetPath) && seen.size < MAX_PAGES) {
        seen.add(targetPath);
      }
    } else if (!href.startsWith("mailto:") && !href.startsWith("tel:")) {
      try {
        const ext = await fetch(href, { method: "HEAD", redirect: "follow" }).catch(() => null);
        if (ext && ext.status >= 400) {
          result.externalWarnings.push({ href, status: ext.status });
        }
      } catch {
        result.externalWarnings.push({ href, status: "unreachable" });
      }
    }
  }
  return result;
}

async function main() {
  const base = getBaseUrl();
  const sitemap = await fetchSitemapPaths(base);
  const manifest = loadEnumerateRoutes();
  const queue = ["/", ...(sitemap.paths ?? [])];
  const visited = new Set();
  const pages = [];
  const deadLinks = [];
  const anchorFails = [];
  const externalWarnings = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const path = queue.shift();
    if (!path || visited.has(path)) continue;
    visited.add(path);

    const page = await checkPage(base, path, new Set());
    pages.push(page);
    if (!page.ok) {
      deadLinks.push({ path, status: page.status, finalUrl: page.finalUrl });
    }
    for (const a of page.brokenAnchors) {
      anchorFails.push(a);
    }
    for (const w of page.externalWarnings) {
      externalWarnings.push({ from: path, ...w });
    }
    for (const link of page.internalLinks) {
      if (!visited.has(link) && !queue.includes(link) && visited.size + queue.length < MAX_PAGES) {
        queue.push(link);
      }
    }
  }

  const ok = deadLinks.length === 0 && anchorFails.length === 0;
  const report = {
    ok,
    base,
    crawled: pages.length,
    sitemap,
    deadLinks,
    brokenAnchors: anchorFails,
    externalWarnings,
    indexableCount: manifest.indexablePaths?.length ?? null,
    summary: ok
      ? `OK — ${pages.length} Seiten, 0 tote Links, 0 Anker-Fehler, ${externalWarnings.length} externe Warnungen`
      : `FAIL — ${deadLinks.length} tote Links, ${anchorFails.length} Anker-Fehler`,
  };
  const reportPath = writeReport("links-report.json", report);
  ensureArtifactDir();
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  if (!ok && process.env.VERIFY_CONTINUE !== "1") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});