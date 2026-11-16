import { contrastRatio } from "@/lib/research/colorContrast";
import {
  boxesOverlap,
  labelHitsPolyline,
  overlapsYTickColumn,
  svgLabelBox,
  textBoxesCollide,
  topYTickBaselineY,
  yAxisGwUnitPosition,
} from "@/lib/monatV1HeroLayout";

describe("monat v1 hero layout", () => {
  it("platziert GW-Einheit außerhalb der Tick-Spalte", () => {
    const topBaseline = 36;
    const pos = yAxisGwUnitPosition({ padL: 52, plotTop: 32, topTickBaselineY: topBaseline });
    const unitBox = svgLabelBox(pos.x, pos.y, pos.anchor, "GW", 14);
    const tickBox = svgLabelBox(48, topBaseline, "end", "100", 14);
    expect(overlapsYTickColumn(unitBox, 52)).toBe(false);
    expect(boxesOverlap(unitBox, tickBox)).toBe(false);
  });

  it("oberster Tick aus yTicks", () => {
    const yGw = (gw: number) => 32 + 400 - ((gw - 0) / 100) * 400;
    const baseline = topYTickBaselineY([40, 60, 80, 100], 0, 100, 400, 32, yGw);
    expect(baseline).toBe(yGw(100) + 4);
  });

  it("beobachtet-Farbe ≥ 4,5:1 auf Monatsfläche", () => {
    expect(contrastRatio("#58606a", "#f6f6f3")).toBeGreaterThanOrEqual(4.5);
  });

  it("erkennt Label-Polylinien-Kollision", () => {
    const path = [
      { x: 100, y: 200 },
      { x: 200, y: 120 },
      { x: 300, y: 160 },
    ];
    expect(labelHitsPolyline(150, 130, "middle", "Kipppunkt ≈×3,9", 14, path)).toBe(true);
    expect(labelHitsPolyline(20, 20, "start", "frei", 14, path)).toBe(false);
  });

  it("textBoxesCollide", () => {
    expect(
      textBoxesCollide([
        { x: 50, y: 50, anchor: "start", text: "A", fontSize: 12 },
        { x: 52, y: 52, anchor: "start", text: "B", fontSize: 12 },
      ]),
    ).toBe(true);
  });
});