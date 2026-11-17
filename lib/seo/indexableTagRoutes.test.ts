/**
 * @jest-environment node
 */
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { addBerlinCalendarDays } from "@/lib/berlinCalendar";
import { collectIndexableRoutes } from "@/lib/seo/indexableRoutes";
import {
  INDEXABLE_TAG_VORLAUF_EXCLUSIVE,
  indexableTagDayCap,
  indexableTagPathsFromRecords,
} from "@/lib/seo/indexableTagRoutes";
import { loadGermanyView, type GermanyView } from "@/lib/germanyView";

jest.mock("@/lib/germanyView", () => ({
  loadGermanyView: jest.fn(),
}));

const loadGermanyViewMock = loadGermanyView as jest.MockedFunction<typeof loadGermanyView>;

function syntheticRecords(endKey: string, count: number): TagesKennzahlRecord[] {
  const start = addBerlinCalendarDays(endKey, -(count - 1));
  const records: TagesKennzahlRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const dateKey = addBerlinCalendarDays(start, i);
    records.push({
      dateKey,
      surplusGwh: 0,
      surplusH: 0,
      spread: null,
      pmin: null,
      pminAt: null,
      pmax: null,
      pmaxAt: null,
      negH: null,
      eveningPeakGw: null,
      eveningPeakAt: null,
      peakCutGw: null,
      absorbedGwh: 0,
      fullAt: null,
      fullMin: null,
      wsShare: 0,
      dryStreak: 0,
    });
  }
  return records;
}

describe("indexable tag sitemap", () => {
  it("indexableTagDayCap: heute nicht in Sitemap auch wenn lastComplete heute", () => {
    expect(indexableTagDayCap("2026-11-16", "2026-11-16")).toBe("2026-11-15");
    expect(indexableTagDayCap("2026-11-15", "2026-11-16")).toBe("2026-11-15");
    expect(indexableTagDayCap("2026-11-14", "2026-11-16")).toBe("2026-11-14");
  });

  it("indexableTagPathsFromRecords hält Fenster- und today-Regel", () => {
    const records = syntheticRecords("2026-11-20", 45);
    const paths = indexableTagPathsFromRecords(records, "2026-11-16", "2026-11-16");
    expect(paths[0]).toBe(`/tag/${records[INDEXABLE_TAG_VORLAUF_EXCLUSIVE]!.dateKey}`);
    expect(paths[paths.length - 1]).toBe(`/tag/${indexableTagDayCap("2026-11-16", "2026-11-16")}`);
    expect(paths).not.toContain("/tag/2026-11-16");
    expect(paths).toContain("/tag/2026-11-15");
  });

  it("collectIndexableRoutes: Tag-Pfade konsistent mit gemockter View", async () => {
    const fixedNow = new Date("2026-11-16T12:00:00.000Z");
    const records = syntheticRecords("2026-11-16", 45);
    const view: Pick<GermanyView, "auffaelligkeitRecords" | "lastCompleteDayKey" | "todayKey"> = {
      todayKey: "2026-11-16",
      lastCompleteDayKey: "2026-11-16",
      auffaelligkeitRecords: records,
    };
    loadGermanyViewMock.mockResolvedValue(view as GermanyView);

    const tagPaths = indexableTagPathsFromRecords(
      records,
      view.lastCompleteDayKey,
      view.todayKey,
    );
    expect(tagPaths[tagPaths.length - 1]).toBe(`/tag/${indexableTagDayCap(view.lastCompleteDayKey, view.todayKey)}`);

    const routes = await collectIndexableRoutes(fixedNow);
    const routePaths = routes.map((r) => r.path);
    for (const path of tagPaths) {
      expect(routePaths).toContain(path);
    }
    expect(routePaths).not.toContain("/tag/2026-11-16");
  });
});