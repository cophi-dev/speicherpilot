import { FLOWER_BERGEDORF, flowerHoursAtFullPower } from "@/lib/flowerBergedorf";

describe("Flower Bergedorf public reference", () => {
  it("uses only the published power, energy, and a duration that is their ratio", () => {
    expect(FLOWER_BERGEDORF.powerMw).toBe(100);
    expect(FLOWER_BERGEDORF.energyMwh).toBe(400);
    expect(flowerHoursAtFullPower()).toBe(4);
    expect(FLOWER_BERGEDORF.constructionStartedIso).toBe("2026-09-09");
    expect(FLOWER_BERGEDORF.sources).toHaveLength(2);
  });

  it("does not carry a price, a revenue, or a connection capacity", () => {
    const blob = JSON.stringify(FLOWER_BERGEDORF);
    expect(blob).not.toMatch(/eur|revenue|price|kV|MVA/i);
  });
});
