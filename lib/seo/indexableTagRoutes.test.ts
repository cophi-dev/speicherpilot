/**
 * @jest-environment node
 */
import { collectIndexableRoutes } from "@/lib/seo/indexableRoutes";
import { indexableTagPathsFromRecords } from "@/lib/seo/indexableTagRoutes";
import { loadGermanyView } from "@/lib/germanyView";

describe("indexable tag sitemap", () => {
  jest.setTimeout(120_000);
  const fixedNow = new Date("2026-11-16T12:00:00.000Z");

  it("listet /tag bis lastCompleteDayKey (gleiche Records wie Routen)", async () => {
    const view = await loadGermanyView(fixedNow, "/", {});
    const records = view.auffaelligkeitRecords ?? [];
    expect(records.length).toBeGreaterThan(30);

    const tagPaths = indexableTagPathsFromRecords(records, view.lastCompleteDayKey, view.todayKey);
    expect(tagPaths.length).toBeGreaterThan(0);
    expect(tagPaths[tagPaths.length - 1]).toBe(`/tag/${view.lastCompleteDayKey}`);
    expect(tagPaths).toContain(`/tag/2026-11-15`);

    const routes = await collectIndexableRoutes(fixedNow);
    const routePaths = routes.map((r) => r.path);
    for (const path of tagPaths) {
      expect(routePaths).toContain(path);
    }
  });
});