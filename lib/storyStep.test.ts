import { stepFromLayout } from "@/lib/storyStep";

describe("stepFromLayout", () => {
  it("stays on the first step before anything is laid out", () => {
    expect(stepFromLayout([0, 0, 0], [0, 0, 0], 400)).toBe(0);
  });

  it("keeps the last step whose top has crossed the reading line", () => {
    expect(stepFromLayout([800, 1400, 2000], [600, 600, 600], 500)).toBe(0);
    expect(stepFromLayout([-200, 420, 1100], [700, 700, 700], 500)).toBe(1);
    expect(stepFromLayout([-900, -200, 480], [700, 700, 900], 500)).toBe(2);
  });

  it("does not skip backwards when only the first step has crossed", () => {
    expect(stepFromLayout([40, 900, 1600], [800, 800, 800], 500)).toBe(0);
  });
});
