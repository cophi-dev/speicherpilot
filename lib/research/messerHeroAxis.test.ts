import {
  messerHeroAxis,
  messerHeroPlotBounds,
  messerHeroValueInPlot,
  messerHeroYValues,
} from "@/lib/research/messerHeroAxis";
import type { ResearchDayModel } from "@/lib/research/researchTypes";

function stubDay(overrides: Partial<ResearchDayModel> = {}): ResearchDayModel {
  return {
    dateKey: "2026-11-09",
    dateLabel: "9. November 2026",
    shortLabel: "09.11.",
    weekdayLabel: "Sonntag",
    peakGw: 38.2,
    peakTime: "18:30",
    residualGw: [35, 36, 37, 38.2],
    stages: [
      { factor: 2, reductionGw: 1.2, capGw: 37.0, reduction4hGw: 0.8 },
      { factor: 5, reductionGw: 2.5, capGw: 35.7, reduction4hGw: 1.5 },
      { factor: 10, reductionGw: 3.8, capGw: 34.4, reduction4hGw: 2.2 },
    ],
    series: Array.from({ length: 8 }, (_, i) => ({
      hour: i * 3,
      minute: 0,
      residualGw: 32 + i * 0.8,
      cappedGw: 32 + i * 0.8,
    })),
    saturation: [],
    saturation4h: [],
    h1: "Test",
    heroFactor: 5,
    heroReductionGw: 2.5,
    hero4hGw: 1.5,
    tenGw: 3.8,
    ...overrides,
  };
}

describe("messerHeroAxis", () => {
  it("does not pin the axis to 45–70 GW when data sits lower", () => {
    const axis = messerHeroAxis(stubDay(), 5);
    expect(axis.max).toBeLessThan(45);
    expect(axis.ticks.every((t) => t >= axis.min && t <= axis.max)).toBe(true);
  });

  it("keeps every plotted GW value inside the SVG plot band", () => {
    const model = stubDay();
    const height = 342;
    const factor = 5 as const;
    const axis = messerHeroAxis(model, factor);
    const vals = messerHeroYValues(model, factor);
    const { top, bottom } = messerHeroPlotBounds(height);

    for (const gw of vals) {
      expect(messerHeroValueInPlot(gw, axis.min, axis.max, height)).toBe(true);
    }
    for (const gw of vals) {
      const y =
        top +
        ((axis.max - gw) / (axis.max - axis.min || 1)) * (bottom - top);
      expect(y).toBeGreaterThanOrEqual(top);
      expect(y).toBeLessThanOrEqual(bottom + 0.01);
    }
  });
});