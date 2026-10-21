import { labelBox, layoutChartLabels } from "@/lib/chartLabelLayout";

function overlaps(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe("chart label layout", () => {
  it("pulls a discharge label that would leave the right edge back inside", () => {
    const text = "14,1 GWh entladen";
    const [placed] = layoutChartLabels(
      [{ text, x: 860, y: 80, anchor: "start", prefers: "down" }],
      { minX: 8, maxX: 892, minY: 16, maxY: 320 }
    );
    const box = labelBox(placed.x, placed.y, placed.anchor, text);
    expect(box.left).toBeGreaterThanOrEqual(8);
    expect(box.right).toBeLessThanOrEqual(892);
  });

  it("separates the evening cluster without leaving the frame", () => {
    const labels = [
      { text: "38,1 GW ohne Speicher", x: 700, y: 48, anchor: "middle" as const, prefers: "up" as const },
      { text: "31,7 GW mit ×2", x: 690, y: 78, anchor: "middle" as const, prefers: "up" as const },
      { text: "14,1 GWh entladen", x: 820, y: 96, anchor: "start" as const, prefers: "down" as const },
    ];
    const frame = { minX: 8, maxX: 892, minY: 16, maxY: 340 };
    const placed = layoutChartLabels(labels, frame);
    const boxes = placed.map((item, index) => labelBox(item.x, item.y, item.anchor, labels[index].text));
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(frame.minX - 0.1);
      expect(box.right).toBeLessThanOrEqual(frame.maxX + 0.1);
      expect(box.top).toBeGreaterThanOrEqual(frame.minY - 0.1);
      expect(box.bottom).toBeLessThanOrEqual(frame.maxY + 0.1);
    }
    expect(overlaps(boxes[0], boxes[1])).toBe(false);
    expect(overlaps(boxes[0], boxes[2])).toBe(false);
    expect(overlaps(boxes[1], boxes[2])).toBe(false);
  });
});
