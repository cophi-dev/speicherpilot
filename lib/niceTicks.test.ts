import { mirrorShareAxis, niceAxis, niceStep } from "@/lib/niceTicks";

describe("niceAxis", () => {
  it("uses a 1, 2 or 5 step", () => {
    expect(niceStep(816)).toBe(1000);
    expect(niceStep(39)).toBe(50);
    expect(niceStep(0.14)).toBe(0.2);
  });

  it("replaces crooked padded ticks with a readable grid", () => {
    const megawatts = niceAxis(613, 3877);
    expect(megawatts.ticks).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(megawatts.step).toBe(1000);

    const tight = niceAxis(137, 295);
    expect(tight.ticks).toEqual([100, 150, 200, 250, 300]);
    expect(tight.step).toBe(50);
  });

  it("keeps zero on a range that crosses zero", () => {
    const axis = niceAxis(-18, 42);
    expect(axis.ticks).toContain(0);
    expect(axis.min).toBeLessThan(0);
    expect(axis.max).toBeGreaterThanOrEqual(42);
  });
});

describe("mirrorShareAxis", () => {
  it("labels percent without a minus and treats 100 as a gridline", () => {
    const axis = mirrorShareAxis([30, 140, 80]);
    expect(axis.ticks.every((tick) => tick >= 0)).toBe(true);
    expect(axis.ticks).toContain(100);
    expect(axis.lineAt100).toBe("gridline");
  });

  it("omits the 100 line when the day stays below it", () => {
    const axis = mirrorShareAxis([12, 40]);
    expect(axis.max).toBeLessThan(100);
    expect(axis.lineAt100).toBe("none");
  });
});
