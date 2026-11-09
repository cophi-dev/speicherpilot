import { layoutSurplusChart, weekLabelIndexes } from "@/lib/systemSurplusChart";

function addDays(dateBerlin: string, days: number): string {
  const [year, month, day] = dateBerlin.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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
    expect(layout.bars[0]?.labelAnchor).toBe("start");
    expect(layout.bars[0]?.labelX).toBe(layout.plotLeft);
    expect(layout.bars[layout.bars.length - 1]?.label).toBeNull();
  });

  it("labels only week ticks and keeps the last label inside the plot", () => {
    const month = Array.from({ length: 30 }, (_, index) => ({
      dateBerlin: addDays("2026-10-10", index),
      surplusGwh: index === 14 ? 61.1 : 0,
      absorbedGwh: 0,
    }));
    const layout = layoutSurplusChart(month, 350);
    const labels = layout.bars.filter((bar) => bar.label);
    expect(weekLabelIndexes(30)).toEqual([0, 7, 14, 21, 28]);
    expect(labels.map((bar) => bar.label)).toEqual(["10.10.", "17.10.", "24.10.", "31.10.", "7.11."]);
    expect(labels[0]?.labelAnchor).toBe("start");
    expect(labels[0]?.labelX).toBe(layout.plotLeft);
    const last = labels[labels.length - 1];
    expect(last?.labelAnchor).toBe("end");
    expect(last?.labelX).toBe(layout.gridX2);
    expect(last?.labelX).toBeLessThanOrEqual(layout.width - layout.plotRight);
    expect(layout.bars.some((bar) => bar.label === "8.11.")).toBe(false);
  });

  it("starts grid lines 8 px to the right of the y labels", () => {
    const layout = layoutSurplusChart(rows, 350);
    expect(layout.yLabelGap).toBe(8);
    expect(layout.gridX1 - layout.yLabelX).toBe(8);
    expect(layout.gridX1).toBe(layout.plotLeft);
    expect(layout.gridX2).toBeGreaterThan(layout.gridX1);
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
