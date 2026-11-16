/**
 * Emits indexable app routes for sitemap verification (stdout + artifact file).
 * Avoids `server-only` imports — reads roll-snapshot JSON directly.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import sitemap from "@/app/sitemap";
import { getBlogPosts } from "@/content/blog/posts";
import { formatBerlinDateKeyFromUtcDate, addBerlinCalendarDays } from "@/lib/berlinCalendar";
import { pickLastCompleteDayKey } from "@/lib/completeBerlinDay";
import { tagSelectWindowStart } from "@/lib/germanyViewCachePolicy";
import {
  berlinMonthKeyFromDateKey,
  daysInBerlinMonth,
  monthsWithData,
  monthHasAnyRecord,
} from "@/lib/monatCalendar";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { nationalFleetMonthAvailable } from "@/lib/nationalMonthFleetModel";
import type { ResidualDay } from "@/lib/windSolarResidual";

type RollSnap = {
  records: TagesKennzahlRecord[];
  days: ResidualDay[];
};

const outDir = process.env.VERIFY_ARTIFACT_DIR ?? join(process.cwd(), ".verify-artifacts");

function loadRollSnapshot(): RollSnap {
  const path = join(process.cwd(), "data/tag-pages/roll-snapshot.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as RollSnap;
  return { records: raw.records ?? [], days: raw.days ?? [] };
}

function enumerateTagPaths(todayKey: string): string[] {
  const start = tagSelectWindowStart(todayKey);
  const paths: string[] = [];
  let cursor = start;
  while (cursor <= todayKey) {
    paths.push(`/tag/${cursor}`);
    cursor = addBerlinCalendarDays(cursor, 1);
  }
  return paths;
}

function enumerateMonatPaths(snap: RollSnap, todayKey: string): string[] {
  const records = snap.records;
  const monthSet = new Set(monthsWithData(records));
  const lastComplete = pickLastCompleteDayKey(snap.days, todayKey);
  const currentMonth = berlinMonthKeyFromDateKey(todayKey);
  if (monthHasAnyRecord(currentMonth, records)) {
    monthSet.add(currentMonth);
  }
  if (nationalFleetMonthAvailable(currentMonth)) {
    monthSet.add(currentMonth);
  }
  for (const m of [...monthSet]) {
    if (nationalFleetMonthAvailable(m)) {
      monthSet.add(m);
    }
  }
  const partialMonth = berlinMonthKeyFromDateKey(lastComplete);
  if (daysInBerlinMonth(partialMonth).some((d) => records.some((r) => r.dateKey === d))) {
    monthSet.add(partialMonth);
  }
  return [...monthSet].sort().map((m) => `/monat/${m}`);
}

function main() {
  const todayKey = process.env.VERIFY_TODAY_KEY?.trim() || formatBerlinDateKeyFromUtcDate(new Date());
  const snap = loadRollSnapshot();
  const staticPaths = sitemap().map((e) => new URL(e.url).pathname);

  const articlePaths = getBlogPosts().map((p) => `/beitraege/${p.slug}`);
  const tagPaths = enumerateTagPaths(todayKey);
  const monatPaths = enumerateMonatPaths(snap, todayKey);

  const hubPaths = ["/tag", "/monat"];

  const indexable = [...new Set([...staticPaths, ...hubPaths, ...articlePaths, ...tagPaths, ...monatPaths])].sort();

  const manifest = {
    generatedAt: new Date().toISOString(),
    todayKey,
    lastCompleteDayKey: pickLastCompleteDayKey(snap.days, todayKey),
    sitemapStaticPaths: staticPaths,
    indexablePaths: indexable,
    counts: {
      static: staticPaths.length,
      articles: articlePaths.length,
      tags: tagPaths.length,
      monate: monatPaths.length,
      total: indexable.length,
    },
  };

  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "indexable-routes.json");
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

main();