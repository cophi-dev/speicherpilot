import {
  nearestIndexFromClientX,
  nearestIndexFromClientXWithPlotPad,
  nearestIndexFromFraction,
  nearestIndexFromXs,
  viewBoxXFromClientX,
} from "@/lib/chartNearestIndex";

describe("chartNearestIndex", () => {
  it("mappt Pointer-X auf den nächstliegenden Datenindex", () => {
    const rect = { left: 100, width: 96 };
    expect(nearestIndexFromClientX(100, rect, 97)).toBe(0);
    expect(nearestIndexFromClientX(148, rect, 97)).toBe(48);
    expect(nearestIndexFromClientX(196, rect, 97)).toBe(96);
  });

  it("nearestIndexFromFraction rundet auf ganze Indizes", () => {
    expect(nearestIndexFromFraction(0, 10)).toBe(0);
    expect(nearestIndexFromFraction(0.51, 10)).toBe(5);
    expect(nearestIndexFromFraction(1, 10)).toBe(9);
  });

  it("findet den nächsten Punkt auf ungleichmäßiger X-Achse", () => {
    const xs = [40, 80, 200, 310];
    expect(nearestIndexFromXs(40, xs)).toBe(0);
    expect(nearestIndexFromXs(90, xs)).toBe(1);
    expect(nearestIndexFromXs(250, xs)).toBe(2);
    expect(nearestIndexFromXs(400, xs)).toBe(3);
  });

  it("berücksichtigt linkes Plot-Padding und skalierte Containerbreite", () => {
    const rect = { left: 0, width: 400 };
    const plotPad = 42;
    const count = 97;
    // Mitte der Plot-Fläche (ohne Gutter) ≈ Index 48
    const midClientX = plotPad + (400 - plotPad) / 2;
    expect(nearestIndexFromClientXWithPlotPad(midClientX, rect, count, plotPad)).toBe(48);
    // Pointer über dem Gutter → Index 0, nicht versetzt
    expect(nearestIndexFromClientXWithPlotPad(plotPad, rect, count, plotPad)).toBe(0);
  });

  it("viewBoxXFromClientX skaliert clientX in ViewBox-Koordinaten", () => {
    const rect = { left: 10, width: 390 };
    expect(viewBoxXFromClientX(10, rect, 780)).toBe(0);
    expect(viewBoxXFromClientX(205, rect, 780)).toBe(390);
    expect(viewBoxXFromClientX(400, rect, 780)).toBeCloseTo(780, 0);
  });
});
