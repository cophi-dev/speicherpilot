import { frontIndexFromKey, snapFrontIndex } from "@/lib/frontSlider";

describe("snapFrontIndex", () => {
  const start = 100;
  const span = 170; // 18 points → 17 steps
  const n = 18;

  it("snaps to the nearest of 18 front points", () => {
    expect(snapFrontIndex(100, start, span, n)).toBe(0);
    expect(snapFrontIndex(270, start, span, n)).toBe(17);
    // Midway between 8 and 9: 100 + 8.4*(170/17) ≈ 184
    expect(snapFrontIndex(100 + (8 * span) / 17, start, span, n)).toBe(8);
    expect(snapFrontIndex(100 + (8.6 * span) / 17, start, span, n)).toBe(9);
  });

  it("clamps outside the track", () => {
    expect(snapFrontIndex(0, start, span, n)).toBe(0);
    expect(snapFrontIndex(400, start, span, n)).toBe(17);
  });

  it("returns 0 for empty or zero-span tracks", () => {
    expect(snapFrontIndex(150, start, 0, n)).toBe(0);
    expect(snapFrontIndex(150, start, span, 1)).toBe(0);
    expect(snapFrontIndex(150, start, span, 0)).toBe(0);
  });
});

describe("frontIndexFromKey", () => {
  it("moves by one on arrows and jumps on Home, End, PageUp, PageDown", () => {
    expect(frontIndexFromKey("ArrowRight", 8, 18)).toBe(9);
    expect(frontIndexFromKey("ArrowUp", 8, 18)).toBe(9);
    expect(frontIndexFromKey("ArrowLeft", 8, 18)).toBe(7);
    expect(frontIndexFromKey("ArrowDown", 0, 18)).toBe(0);
    expect(frontIndexFromKey("Home", 8, 18)).toBe(0);
    expect(frontIndexFromKey("End", 8, 18)).toBe(17);
    expect(frontIndexFromKey("PageUp", 8, 18)).toBe(11);
    expect(frontIndexFromKey("PageDown", 2, 18)).toBe(0);
    expect(frontIndexFromKey("PageDown", 8, 18)).toBe(5);
  });

  it("ignores other keys", () => {
    expect(frontIndexFromKey("Enter", 8, 18)).toBeNull();
    expect(frontIndexFromKey("ArrowRight", 0, 0)).toBeNull();
  });
});
