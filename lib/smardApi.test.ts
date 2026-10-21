import { parseSmardSeries } from "@/lib/smardApi";

describe("SMARD series parser", () => {
  it("keeps nulls instead of turning gaps into zero", () => {
    const points = parseSmardSeries({
      series: [
        [1000, 12.5],
        [2000, null],
        [3000, 0],
      ],
    });
    expect(points).toEqual([
      { unixMs: 1000, value: 12.5 },
      { unixMs: 2000, value: null },
      { unixMs: 3000, value: 0 },
    ]);
  });
});
