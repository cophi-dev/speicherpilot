import { nearestIndexFromClientX, nearestIndexFromFraction } from "@/lib/chartNearestIndex";

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
});
