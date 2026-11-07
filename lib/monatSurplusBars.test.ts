import { buildMonatGrid, berlinMonthKeyFromDateKey } from "@/lib/monatCalendar";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";
import fixture from "@/lib/__fixtures__/auffaelligkeit-records.json";

describe("monatSurplusBars", () => {
  const records = fixture as import("@/lib/auffaelligkeit").TagesKennzahlRecord[];

  it("only includes dates inside the requested month", () => {
    const monthKey = "2026-10";
    const grid = buildMonatGrid({
      monthKey,
      records,
      todayKey: "2026-11-04",
      lastCompleteDayKey: "2026-11-03",
    });
    const bars = barsFromMonatGrid(grid);
    expect(bars.every((b) => berlinMonthKeyFromDateKey(b.dateKey) === monthKey)).toBe(true);
    expect(bars[0].dateKey).toBe("2026-10-01");
    expect(bars[bars.length - 1].dateKey).toBe("2026-10-31");
  });
});
