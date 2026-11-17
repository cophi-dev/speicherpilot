import { nearestIndexFromSvgX } from "@/lib/chartSvgPointer";
import { nearestIndexFromXs } from "@/lib/chartNearestIndex";

function factorX(f: number, plotW: number, padL: number): number {
  return padL + ((f - 1) / 9) * plotW;
}

describe("chartSvgPointer", () => {
  it("snapped Faktor-Punkte: ungleiche factorX-Abstände statt gleicher Schritte", () => {
    const plotW = 700;
    const padL = 44;
    const factors = [1, 2, 3.9, 5, 10] as const;
    const xs = factors.map((f) => factorX(f, plotW, padL));
    const idx39 = factors.indexOf(3.9);
    const idx5 = factors.indexOf(5);
    const x39 = xs[idx39]!;
    const x5 = xs[idx5]!;
    expect(nearestIndexFromSvgX(x39 + 20, xs)).toBe(idx39);
    expect(nearestIndexFromSvgX(x5 - 25, xs)).toBe(idx5);
  });

  it("Flotten-Tag: Punkte mit Y-Achsen-Gutter (ungleichmäßig in Daten, gleichmäßig in Plot)", () => {
    const plotGutter = 84;
    const n = 97;
    const plotW = 900;
    const pxPerQh = plotW / n;
    const xs = Array.from({ length: n }, (_, j) => plotGutter + j * pxPerQh + pxPerQh / 2);
    const midIdx = Math.floor(n / 2);
    const midX = xs[midIdx]!;
    expect(nearestIndexFromXs(midX, xs)).toBe(midIdx);
    expect(nearestIndexFromXs(midX + pxPerQh * 0.55, xs)).toBe(midIdx + 1);
    expect(nearestIndexFromXs(plotGutter, xs)).toBe(0);
  });

  it("bei ungleichmäßigen xs den nächstliegenden Index wählen", () => {
    const xs = [40, 200, 521, 778];
    // Zeiger bei 778 → Punkt bei 778, nicht fälschlich bei 724 (alte gleichmäßige Schritte)
    expect(nearestIndexFromSvgX(778, xs)).toBe(3);
    expect(nearestIndexFromSvgX(724, xs)).toBe(3);
    expect(nearestIndexFromSvgX(90, xs)).toBe(0);
    expect(nearestIndexFromSvgX(400, xs)).toBe(2);
  });
});