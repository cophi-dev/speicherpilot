import { expectedQuartersBerlinDay } from "@/lib/berlinDayQuarters";

describe.each(["UTC", "Europe/Berlin"])("expectedQuartersBerlinDay (TZ=%s)", (tz) => {
  const prev = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = tz;
  });

  afterAll(() => {
    process.env.TZ = prev;
  });

  it("normale Tage haben 96 Viertelstunden", () => {
    expect(expectedQuartersBerlinDay("2026-11-15")).toBe(96);
    expect(expectedQuartersBerlinDay("2026-11-01")).toBe(96);
  });

  it("DST-Ende Oktober: 100 Viertelstunden", () => {
    expect(expectedQuartersBerlinDay("2026-10-25")).toBe(100);
  });

  it("DST-Start Frühjahr: 92 Viertelstunden", () => {
    expect(expectedQuartersBerlinDay("2026-03-29")).toBe(92);
  });
});