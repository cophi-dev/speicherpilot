import { layoutSurplusChart } from "@/lib/systemSurplusChart";

describe("layoutSurplusChart", () => {
  const rows = [
    { dateBerlin: "2026-10-10", surplusGwh: 0, absorbedGwh: 0 },
    { dateBerlin: "2026-10-24", surplusGwh: 61.1, absorbedGwh: 8.2 },
    { dateBerlin: "2026-10-25", surplusGwh: 4, absorbedGwh: 12 },
    { dateBerlin: "2026-11-08", surplusGwh: 0.01, absorbedGwh: 0 },
  ];

  it("draws one bar per day and keeps the axis above the largest surplus", () => {
    const layout = layoutSurplusChart(rows);
    expect(layout.bars).toHaveLength(4);
    expect(layout.yMax).toBeGreaterThanOrEqual(61.1);
    expect(layout.bars[0]?.label).toBe("10.10.");
    expect(layout.bars[layout.bars.length - 1]?.label).toBe("8.11.");
  });

  it("gives a zero-surplus day no bar height", () => {
    const layout = layoutSurplusChart(rows);
    expect(layout.bars[0]?.surplusH).toBe(0);
    expect(layout.bars[0]?.absorbedH).toBe(0);
  });

  it("never paints charged energy above that day's surplus", () => {
    const layout = layoutSurplusChart(rows);
    const capped = layout.bars[2];
    expect(capped?.absorbedGwh).toBe(12);
    expect(capped?.absorbedDrawnGwh).toBe(4);
    expect(capped?.absorbedH).toBeCloseTo(capped?.surplusH ?? 0, 5);
    const open = layout.bars[1];
    expect(open && open.absorbedH).toBeLessThan(open?.surplusH ?? 0);
  });

  it("does not invent a euro figure", () => {
    const layout = layoutSurplusChart(rows);
    expect(JSON.stringify(layout)).not.toMatch(/€|EUR/i);
  });
});
