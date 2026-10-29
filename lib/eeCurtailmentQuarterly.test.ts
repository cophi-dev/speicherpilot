import { formatQuarterlyCurtailmentGwh } from "@/lib/eeCurtailmentQuarterly";

describe("formatQuarterlyCurtailmentGwh", () => {
  it("uses German grouping for the Q2 2026 volume", () => {
    expect(formatQuarterlyCurtailmentGwh("de")).toContain("2.102");
  });

  it("uses English grouping for the Q2 2026 volume", () => {
    expect(formatQuarterlyCurtailmentGwh("en")).toContain("2,102");
  });
});
