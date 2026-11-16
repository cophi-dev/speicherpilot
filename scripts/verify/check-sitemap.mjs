#!/usr/bin/env node
import {
  extractHrefs,
  getBaseUrl,
  loadEnumerateRoutes,
  loadJson,
  normalizePath,
  pathMatchesAny,
  probeUrl,
  writeReport,
} from "./common.mjs";

function parseSitemapUrls(xml, baseOrigin) {
  const entries = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    const u = new URL(loc);
    entries.push({
      loc,
      pathname: normalizePath(u.pathname),
      host: u.origin,
    });
  }
  return entries;
}

async function main() {
  const base = getBaseUrl();
  const baseOrigin = new URL(base).origin;
  const exceptions = loadJson("verify/sitemap.exceptions.json");
  const manifest = loadEnumerateRoutes();

  const smRes = await probeUrl(base, "/sitemap.xml");
  const errors = [];
  const sitemapUrls = smRes.ok ? parseSitemapUrls(smRes.text, baseOrigin) : [];

  if (!smRes.ok) {
    errors.push({ kind: "sitemap-fetch", message: `sitemap.xml HTTP ${smRes.status}` });
  }

  const sitemapPathSet = new Set(sitemapUrls.map((e) => e.pathname));
  const omitPatterns = exceptions.indexableOmittedFromSitemap ?? [];

  for (const entry of sitemapUrls) {
    const page = await probeUrl(base, entry.pathname);
    if (page.status !== 200 && page.status !== 308) {
      errors.push({ kind: "sitemap-url-status", path: entry.pathname, status: page.status });
    }
    const allowedHosts = [...(exceptions.sitemapCanonicalHostAllowList ?? []), baseOrigin];
    const hostOk = allowedHosts.some((h) => {
      try {
        return new URL(h).origin === entry.host || h === entry.host;
      } catch {
        return entry.loc.startsWith(h);
      }
    });
    if (!hostOk) {
      errors.push({ kind: "sitemap-host", loc: entry.loc, expected: allowedHosts });
    }
    if (page.text) {
      const { canonical } = extractHrefs(page.text, baseOrigin);
      if (canonical) {
        const canonPath = normalizePath(new URL(canonical, baseOrigin).pathname);
        const entryPath = normalizePath(entry.pathname);
        if (canonPath !== entryPath && !canonical.includes(entry.pathname)) {
          errors.push({ kind: "sitemap-canonical-mismatch", path: entry.pathname, canonical });
        }
      }
    }
  }

  const redirectOnly = new Set(exceptions.redirectOnlyPaths ?? []);
  const notIndexable = exceptions.notIndexablePathPatterns ?? [];

  for (const path of manifest.indexablePaths ?? []) {
    if (redirectOnly.has(path)) continue;
    if (pathMatchesAny(path, notIndexable)) continue;
    if (pathMatchesAny(path, omitPatterns)) continue;
    if (!sitemapPathSet.has(normalizePath(path))) {
      errors.push({ kind: "missing-in-sitemap", path });
    }
  }

  for (const path of sitemapPathSet) {
    if (pathMatchesAny(path, notIndexable)) continue;
    const page = await probeUrl(base, path);
    if (page.status >= 400) {
      errors.push({ kind: "sitemap-dead", path, status: page.status });
    }
  }

  const ok = errors.length === 0;
  const report = {
    ok,
    base,
    sitemapUrlCount: sitemapUrls.length,
    indexableCount: manifest.indexablePaths?.length ?? 0,
    errors,
    missingInSitemap: errors.filter((e) => e.kind === "missing-in-sitemap").map((e) => e.path),
    summary: ok
      ? `OK — ${sitemapUrls.length} Sitemap-URLs, ${manifest.indexablePaths?.length ?? 0} indexierbar`
      : `FAIL — ${errors.length} Abweichungen (${errors.filter((e) => e.kind === "missing-in-sitemap").length} fehlen in Sitemap)`,
  };
  const reportPath = writeReport("sitemap-report.json", report);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  if (!ok && process.env.VERIFY_CONTINUE !== "1") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});