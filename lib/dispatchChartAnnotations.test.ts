import { clampChartAnnotationInPlot, labelBox } from "@/lib/chartLabelLayout";

describe("dispatch chart annotation clamp", () => {
  it("keeps wide labels inside the plot right edge", () => {
    const plotLeft = 46;
    const plotRight = 758;
    const text = "8,3 GW mit ×5";
    const placed = clampChartAnnotationInPlot(720, 40, "start", text, plotLeft, plotRight);
    const box = labelBox(placed.x, placed.y, placed.anchor, text);
    expect(box.right).toBeLessThanOrEqual(plotRight + 0.01);
    expect(box.left).toBeGreaterThanOrEqual(plotLeft - 0.01);
  });
});
