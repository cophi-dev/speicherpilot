import { formatBerlinDayButtonLabel } from "@/lib/displayLocale";

describe("formatBerlinDayButtonLabel", () => {
  const octoberTwentieth = new Date(2026, 9, 20);

  it("uses German weekday and month names on the German view", () => {
    expect(formatBerlinDayButtonLabel(octoberTwentieth, "de", true)).toBe(
      "Dienstag, 20. Oktober 2026"
    );
    expect(formatBerlinDayButtonLabel(octoberTwentieth, "de", false)).toBe("20.10.2026");
  });

  it("uses English names on the English view", () => {
    expect(formatBerlinDayButtonLabel(octoberTwentieth, "en", true)).toBe(
      "Tuesday, October 20, 2026"
    );
    expect(formatBerlinDayButtonLabel(octoberTwentieth, "en", false)).toBe("Oct 20, 2026");
  });
});
