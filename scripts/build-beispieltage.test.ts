import { buildBeispieltageFile, rankAndMedian, yearRevenuesFromRaw } from "@/lib/beispieltageBuild";
import { beispieltage } from "@/lib/beispieltage";

describe("beispieltage year build", () => {
  it("repeats the rank and the median from the raw prices", () => {
    const rows = yearRevenuesFromRaw();
    const { rank, medianEur, medianDate } = rankAndMedian(rows);
    expect(rows).toHaveLength(365);
    expect(rank.get("2026-05-01")).toBe(1);
    expect(rank.get("2026-06-24")).toBe(3);
    expect(rank.get("2026-09-14")).toBe(4);
    expect(rank.get("2026-04-14")).toBe(183);
    expect(medianEur).toBe(10344);
    expect(medianDate).toBe("2026-04-14");
    expect(beispieltage.medianDayRevenueX1).toBe(10344);
    expect(buildBeispieltageFile(rows)).toEqual(beispieltage);
  });
});
