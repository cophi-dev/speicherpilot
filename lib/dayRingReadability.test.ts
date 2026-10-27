import {
  clockwiseArc,
  dayContrast,
  hourClock,
  openTail,
  shapeStroke,
  sparklinePath,
} from "@/lib/dayRingReadability";

describe("day ring readability", () => {
  it("calls a narrow residual quiet and leaves a wide day alone", () => {
    expect(dayContrast([30, 31, 30.4, 32])?.quiet).toBe(true);
    expect(dayContrast([10, 12, 28, 40])?.quiet).toBe(false);
    expect(dayContrast([1, 2])).toBeNull();
  });

  it("marks the unpublished tail and stops once the day has reached 22:00", () => {
    const morning = openTail([0, 0.25, 0.5, 8]);
    expect(morning).not.toBeNull();
    expect(morning?.fromHour).toBeCloseTo(8.25, 5);
    expect(morning!.endDeg).toBeGreaterThan(morning!.startDeg);
    expect(openTail([0, 23.75])).toBeNull();
    expect(openTail([])).toBeNull();
  });

  it("stretches a quiet form and refuses a flat or a loud series", () => {
    const quiet = shapeStroke([
      { hour: 0, gw: 20 },
      { hour: 6, gw: 22 },
      { hour: 12, gw: 21 },
      { hour: 18, gw: 24 },
    ]);
    expect(quiet?.d.startsWith("M ")).toBe(true);
    expect(quiet?.d).not.toMatch(/NaN/);
    expect(shapeStroke([
      { hour: 0, gw: 20 },
      { hour: 6, gw: 20 },
      { hour: 12, gw: 20 },
      { hour: 18, gw: 20 },
    ])).toBeNull();
    expect(shapeStroke([
      { hour: 0, gw: -4 },
      { hour: 6, gw: 10 },
      { hour: 12, gw: 30 },
      { hour: 18, gw: 40 },
    ])).toBeNull();
  });

  it("breaks the stretched line across a missing quarter", () => {
    const broken = shapeStroke([
      { hour: 0, gw: 10 },
      { hour: 0.25, gw: 12 },
      { hour: 0.5, gw: 11 },
      { hour: 0.75, gw: 13 },
      { hour: 3, gw: 14 },
    ]);
    expect(broken?.d.match(/M /g)?.length).toBe(2);
  });

  it("scales a sparkline to the series and formats the clock", () => {
    const path = sparklinePath([10, 10.2, 10.4]);
    expect(path.startsWith("M ")).toBe(true);
    expect(sparklinePath([4])).toBe("");
    expect(hourClock(16.5)).toBe("16:30");
    expect(clockwiseArc(100, 10, 200)).toContain("A 100.00 100.00");
  });
});
