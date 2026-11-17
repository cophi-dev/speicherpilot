import { expectedQuartersBerlinDay } from "@/lib/berlinDayQuarters";

describe("expectedQuartersBerlinDay", () => {
  it("normale Tage haben 96 Viertelstunden", () => {
    expect(expectedQuartersBerlinDay("2026-11-15")).toBe(96);
    expect(expectedQuartersBerlinDay("2026-11-01")).toBe(96);
  });

  it("DST-Ende Oktober: 100 Viertelstunden", () => {
    expect(expectedQuartersBerlinDay("2026-10-25")).toBe(100);
  });
});