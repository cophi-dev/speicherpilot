import {
  adjacentMonthWithData,
  berlinMonthKeyFromDateKey,
  daysInBerlinMonth,
  formatBerlinMonthShort,
  formatDataStandDayDe,
  isBerlinMonthKey,
  isBerlinMonthCalendarClosed,
  isMonthArchivedComplete,
  monthHasAnyRecord,
  nextBerlinMonthKey,
  pickDefaultMonatMonthKey,
  prevBerlinMonthKey,
} from "@/lib/monatCalendar";
import fixture from "@/lib/__fixtures__/auffaelligkeit-records.json";

describe("monatCalendar", () => {
  const records = fixture as import("@/lib/auffaelligkeit").TagesKennzahlRecord[];

  it("formats the one-line month stand in German", () => {
    expect(formatBerlinMonthShort("2026-10")).toBe("Okt 2026");
    expect(formatDataStandDayDe("Energy-Charts-Snapshot · eingefroren 2026-11-09")).toBe("09.11.2026");
  });

  it("parses month keys and lists days", () => {
    expect(isBerlinMonthKey("2026-11")).toBe(true);
    expect(isBerlinMonthKey("2026-11-02")).toBe(false);
    expect(daysInBerlinMonth("2026-11")).toHaveLength(30);
    expect(daysInBerlinMonth("2026-11")[0]).toBe("2026-11-01");
  });

  it("steps prev/next month", () => {
    expect(prevBerlinMonthKey("2026-01")).toBe("2025-12");
    expect(nextBerlinMonthKey("2026-12")).toBe("2027-01");
  });

  it("picks latest archived-complete month as default", () => {
    const lastComplete = records[records.length - 1].dateKey;
    expect(isMonthArchivedComplete("2026-10", records, lastComplete)).toBe(true);
    expect(isBerlinMonthCalendarClosed("2026-10", lastComplete)).toBe(true);
    expect(isBerlinMonthCalendarClosed("2026-11", lastComplete)).toBe(false);
    expect(isMonthArchivedComplete("2026-11", records, lastComplete)).toBe(true);
    expect(pickDefaultMonatMonthKey(records, lastComplete)).toBe("2026-10");
  });

  it("finds adjacent months with data", () => {
    const month = berlinMonthKeyFromDateKey(records[records.length - 1].dateKey);
    expect(monthHasAnyRecord(month, records)).toBe(true);
    const prev = adjacentMonthWithData(month, "prev", records);
    if (prev) {
      expect(monthHasAnyRecord(prev, records)).toBe(true);
    }
  });
});
