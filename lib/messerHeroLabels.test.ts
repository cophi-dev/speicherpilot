import { collidesWithPolyline, labelBoxPx, placeLineEndLabel } from "@/lib/messerHeroLabels";

describe("messerHeroLabels polyline collision", () => {
  const path = [
    { x: 40, y: 200 },
    { x: 120, y: 80 },
    { x: 200, y: 160 },
    { x: 280, y: 60 },
  ];

  it("finds segment intersections, not only vertex hits", () => {
    const box = labelBoxPx(150, 120, "end", "×10 = ×5 mit 4 h", 12);
    expect(collidesWithPolyline(box, path)).toBe(true);
  });

  it("places label outside plot when internal slots collide", () => {
    const placed = placeLineEndLabel({
      text: "×10 = ×5 mit 4 h",
      lineY: 120,
      x: 300,
      path,
      plotLeft: 40,
      plotRight: 306,
      plotTop: 26,
      plotBottom: 280,
      fontSize: 12,
    });
    const box = labelBoxPx(placed.x, placed.y, placed.anchor, "×10 = ×5 mit 4 h", 12);
    expect(collidesWithPolyline(box, path)).toBe(false);
  });
});