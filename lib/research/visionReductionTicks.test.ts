import { visionReductionYTicks } from "@/lib/research/visionReductionTicks";

describe("visionReductionYTicks", () => {
  it("lässt bei yMax=16 nicht −15 und −16 doppelt", () => {
    expect(visionReductionYTicks(16)).toEqual([0, 5, 10, 16]);
  });

  it("behält 15 wenn yMax kleiner", () => {
    expect(visionReductionYTicks(15)).toContain(15);
  });
});