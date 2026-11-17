import { visionG3AxisTitleY, visionG3TitleLayout } from "@/lib/research/visionG3AxisTitle";

describe("visionG3TitleLayout", () => {
  it("mobil zweizeilig", () => {
    expect(visionG3TitleLayout(390).compact).toBe(true);
    expect(visionG3TitleLayout(390).extraTopPad).toBeGreaterThan(0);
  });

  it("trennt GWh in Zeile 2", () => {
    const title = visionG3AxisTitleY(true, "501");
    expect(title.line2).toMatch(/501\u00a0GWh/);
  });
});