import { dayAheadPriceUrl, parseDayAheadPrices } from "@/lib/dayAheadPrices";

describe("DE-LU day-ahead prices", () => {
  it("uses the Energy-Charts feed /live already calls", () => {
    expect(dayAheadPriceUrl("2026-10-22")).toBe("https://api.energy-charts.info/v2/price?bzn=DE-LU&start=2026-10-22&end=2026-10-22");
  });

  it("reads the quarter-hour price field and skips a broken row", () => {
    const points = parseDayAheadPrices({
      data: [
        { timestamp: "2026-10-22T00:00:00+02:00", values: { day_ahead_price: 127.74 } },
        { timestamp: "not-a-time", values: { day_ahead_price: 10 } },
        { timestamp: "2026-10-22T00:15:00+02:00", values: { day_ahead_price: null } },
        { timestamp: "2026-10-22T00:30:00+02:00", values: { day_ahead_price: 120.86 } },
      ],
    });
    expect(points).toEqual([
      { unixMs: Date.parse("2026-10-22T00:00:00+02:00"), eurPerMwh: 127.74 },
      { unixMs: Date.parse("2026-10-22T00:30:00+02:00"), eurPerMwh: 120.86 },
    ]);
  });
});
