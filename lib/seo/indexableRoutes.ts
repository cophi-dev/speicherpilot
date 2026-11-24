import { getBlogPosts } from "@/content/blog/posts";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { berlinMonthKeyFromDateKey, monthsWithData } from "@/lib/monatCalendar";
import { BUILD_PROVENANCE } from "@/lib/buildProvenance.generated";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import { loadGermanyView } from "@/lib/germanyView";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
import { indexableTagPathsFromRecords } from "@/lib/seo/indexableTagRoutes";

export type IndexableRoute = {
  path: string;
  lastModified: Date;
};

function dateFromIsoDay(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00.000Z`);
}

function staticIndexableRoutes(now: Date): IndexableRoute[] {
  const snap = loadTagRollSnapshot();
  const buildModified = new Date(BUILD_PROVENANCE.builtAt);
  const snapshotModified = snap.builtAt ? new Date(snap.builtAt) : buildModified;
  const dataStandModified = Math.max(snapshotModified.getTime(), buildModified.getTime());

  const routes: IndexableRoute[] = [
    { path: "/", lastModified: new Date(dataStandModified) },
    { path: "/jahr", lastModified: buildModified },
    { path: "/netzbetreiber", lastModified: buildModified },
    { path: "/methodik", lastModified: buildModified },
    { path: "/kompromiss", lastModified: buildModified },
    { path: "/knoten", lastModified: buildModified },
    { path: "/beitraege", lastModified: buildModified },
    { path: "/ueber", lastModified: buildModified },
    { path: "/impressum", lastModified: buildModified },
    { path: "/datenschutz", lastModified: buildModified },
  ];

  for (const post of getBlogPosts()) {
    routes.push({
      path: `/beitraege/${post.slug}`,
      lastModified: dateFromIsoDay(post.published),
    });
  }

  return routes;
}

export async function collectIndexableRoutes(now = new Date()): Promise<IndexableRoute[]> {
  const buildModified = new Date(BUILD_PROVENANCE.builtAt);
  const routes = staticIndexableRoutes(now);
  const view = await loadGermanyView(now, "/", {});
  const records = view.auffaelligkeitRecords ?? [];
  const lastComplete = view.lastCompleteDayKey;
  const todayKey = view.todayKey;

  for (const path of indexableTagPathsFromRecords(records, lastComplete, todayKey)) {
    const dayKey = path.slice("/tag/".length);
    routes.push({
      path,
      lastModified: dateFromIsoDay(dayKey),
    });
  }

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

export async function indexableOriginPaths(): Promise<string[]> {
  return (await collectIndexableRoutes()).map((route) => route.path);
}

export async function indexableSitemapEntries(now = new Date()) {
  const origin = getPublicSiteOrigin();
  const routes = await collectIndexableRoutes(now);
  return routes.map((route) => ({
    url: `${origin}${route.path}`,
    lastModified: route.lastModified,
    changeFrequency: route.path === "/" ? ("hourly" as const) : ("weekly" as const),
    priority: route.path === "/" ? 1 : route.path.startsWith("/tag/") ? 0.6 : 0.7,
  }));
}