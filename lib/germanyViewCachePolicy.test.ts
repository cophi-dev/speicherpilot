/**
 * @jest-environment node
 */
import type { GermanyView } from "@/lib/germanyView";
import {
  assertGermanyViewTagIsrCacheable,
  GermanyViewNotCacheableError,
  germanyViewFailedPowerLoad,
  isTagDateInSelectWindow,
} from "@/lib/germanyViewCachePolicy";

function minimalView(overrides: Partial<GermanyView> = {}): GermanyView {
  return {
    todayKey: "2026-11-11",
    dispatch: { fleet: null, day: null, fallback: false },
    exampleDispatch: { fleet: null, day: null, fallback: false },
    until: null,
    board: {} as GermanyView["board"],
    stand: "—",
    readings: [],
    surplusDay: null,
    overviews: null,
    dayOverview: null,
    requestedTag: "2026-11-09",
    requestedTagStatus: "ausserhalb",
    auffaelligkeitRecords: [{ dateKey: "2026-11-08" } as GermanyView["auffaelligkeitRecords"] extends (infer R)[] | null ? R : never],
    kopfDayKey: "2026-11-08",
    homeTagesDayKey: null,
    lastCompleteDayKey: "2026-11-08",
    homeDayPanel: null,
    kopfDay: null,
    preisTag: [],
    ...overrides,
  };
}

describe("germanyViewCachePolicy", () => {
  it("erkennt Daten im 30-Tage-Fenster", () => {
    expect(isTagDateInSelectWindow("2026-11-09", "2026-11-11")).toBe(true);
    expect(isTagDateInSelectWindow("2026-10-01", "2026-11-11")).toBe(false);
  });

  it("verwirft ISR-Cache bei fehlgeschlagener Power-Ladung", () => {
    expect(germanyViewFailedPowerLoad(minimalView({ auffaelligkeitRecords: null }))).toBe(true);
    expect(() => assertGermanyViewTagIsrCacheable(minimalView({ auffaelligkeitRecords: [] }), "2026-11-09")).toThrow(
      GermanyViewNotCacheableError,
    );
  });

  it("verwirft ISR-Cache wenn ein Fenster-Tag fälschlich als ausserhalb gilt", () => {
    const view = minimalView({
      requestedTag: "2026-11-09",
      requestedTagStatus: "ausserhalb",
      auffaelligkeitRecords: [{ dateKey: "2026-11-08" } as never],
    });
    expect(() => assertGermanyViewTagIsrCacheable(view, "2026-11-09")).toThrow(GermanyViewNotCacheableError);
  });

  it("erlaubt ISR-Cache für echtes ausserhalb", () => {
    const view = minimalView({
      requestedTag: "2026-10-01",
      requestedTagStatus: "ausserhalb",
    });
    expect(() => assertGermanyViewTagIsrCacheable(view, "2026-10-01")).not.toThrow();
  });
});
