import { getBlogPosts } from "@/content/blog/posts";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { berlinMonthKeyFromDateKey, monthsWithData } from "@/lib/monatCalendar";
import { BUILD_PROVENANCE } from "@/lib/buildProvenance.generated";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import { tagRollSnapshotNewestFrozenDay } from "@/lib/tagRollSnapshotPolicy";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";

const VORLAUF_INDEX_EXCLUSIVE = 30;

export type IndexableRoute = {
  path: string;
  lastModified: Date;
};

function dateFromIsoDay(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00.000Z`);
}

export function collectIndexableRoutes(now = new Date()): IndexableRoute[] {
  const snap = loadTagRollSnapshot();
  const buildModified = new Date(BUILD_PROVENANCE.builtAt);
  const snapshotModified = snap.builtAt ? new Date(snap.builtAt) : buildModified;
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const newestFrozen = tagRollSnapshotNewestFrozenDay(todayKey);
  const dataStandModified = Math.max(snapshotModified.getTime(), buildModified.getTime());

  const routes: IndexableRoute[] = [
    { path: "/", lastModified: new Date(dataStandModified) },
    { path: "/vision", lastModified: buildModified },
    { path: "/methodik", lastModified: buildModified },
    { path: "/daten", lastModified: buildModified },
    { path: "/simulator", lastModified: buildModified },
    { path: "/beitraege", lastModified: buildModified },
    { path: "/impressum", lastModified: buildModified },
    { path: "/datenschutz", lastModified: buildModified },
  ];

  for (const post of getBlogPosts()) {
    routes.push({
      path: `/beitraege/${post.slug}`,
      lastModified: dateFromIsoDay(post.published),
    });
  }

  const records = snap.records;
  for (let index = VORLAUF_INDEX_EXCLUSIVE; index < records.length; index += 1) {
    const dayKey = records[index]!.dateKey;
    if (dayKey > newestFrozen || dayKey === todayKey) {
      continue;
    }
    routes.push({
      path: `/tag/${dayKey}`,
      lastModified: dateFromIsoDay(dayKey),
    });
  }

  const lastComplete = records[records.length - 1]?.dateKey ?? newestFrozen;
  for (const monthKey of monthsWithData(records)) {
    routes.push({
      path: `/monat/${monthKey}`,
      lastModified: dateFromIsoDay(
        monthKey === berlinMonthKeyFromDateKey(lastComplete) ? lastComplete : `${monthKey}-01`,
      ),
    });
  }

  routes.sort((a, b) => a.path.localeCompare(b.path));
  return routes;
}

export function indexableOriginPaths(): string[] {
  return collectIndexableRoutes().map((route) => route.path);
}

export function indexableSitemapEntries(now = new Date()) {
  const origin = getPublicSiteOrigin();
  return collectIndexableRoutes(now).map((route) => ({
    url: `${origin}${route.path}`,
    lastModified: route.lastModified,
    changeFrequency: route.path === "/" ? ("hourly" as const) : ("weekly" as const),
    priority: route.path === "/" ? 1 : route.path.startsWith("/tag/") ? 0.6 : 0.7,
  }));
}