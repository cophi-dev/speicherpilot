import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import { buildMoreStorage } from "@/lib/moreStorage";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

const fleet: LargeBatteryFleet = {
  powerGw: 1,
  energyGwh: 1,
  durationHours: 1,
  year: "2026",
  updatedAtIso: "2026-10-21T12:00:00.000Z",
  updatedLabel: { de: "21. Oktober 2026", en: "21 October 2026" },
  datasource: "MaStR",
  source: "battery-charts",
  jsonUrl: "https://battery-charts.de/de/battery-charts-de/",
  chartUrl: "https://battery-charts.de/de/battery-charts-de/",
};

function slot(hour: number, count: number, loadMw: number, windMw: number, solarMw: number): ResidualSlot[] {
  return Array.from({ length: count }, (_, index) => {
    const minute = (index % 4) * 15;
    const hourBerlin = hour + Math.floor(index / 4);
    return {
      timestampIso: `2026-09-27T${String(hourBerlin).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
      hourBerlin,
      minuteBerlin: minute,
      loadMw,
      windMw,
      solarMw,
    };
  });
}

const day: ResidualDay = {
  dateBerlin: "2026-09-27",
  slots: [
    ...slot(12, 8, 40_000, 10_000, 32_000),
    ...slot(18, 8, 50_000, 20_000, 0),
  ],
};

describe("buildMoreStorage", () => {
  const report = buildMoreStorage({
    fleet,
    day,
    fallback: true,
    berlinTodayKey: "2026-10-21",
  });

  it("stores only surplus before 17:00 and shaves the evening peak with 90% round-trip", () => {
    expect(report.available).toBe(true);
    const today = report.steps.find((step) => step.id === "today");
    const double = report.steps.find((step) => step.id === "double");
    const five = report.steps.find((step) => step.id === "five");
    expect(today?.storedSurplusGwh).toBeCloseTo(1, 5);
    expect(today?.storedShare).toBeCloseTo(0.25, 5);
    expect(double?.storedShare).toBeCloseTo(0.5, 5);
    expect(five?.storedShare).toBeCloseTo(1, 5);
    expect(today?.peakReductionGw).toBeCloseTo(0.45, 2);
    expect(five?.peakReductionGw).toBeCloseTo(1.8, 2);
    expect(today?.points.some((point) => point.hour >= 17 && point.chargeMw > 0)).toBe(false);
    expect(today?.points.some((point) => point.hour < 17 && point.dischargeMw > 0)).toBe(false);
    const triple = report.steps.find((step) => step.id === "triple");
    const ten = report.steps.find((step) => step.id === "ten");
    expect(today?.shareLabel.de).toBe("25 %");
    expect(five?.shareLabel.de).toBe("100 %");
    expect(triple?.storedShare).toBeCloseTo(0.75, 5);
    expect(ten?.storedShare).toBeCloseTo(1, 5);
    expect(report.steps.map((step) => step.factor)).toEqual([1, 2, 3, 5, 10]);
    expect(today?.estimateNote).toBeNull();
    for (const step of [double, triple, five, ten]) {
      expect(step?.estimateNote?.de).toBe("Modellschätzung · kein Ausbauziel");
      expect(step?.estimateNote?.en).toContain("Model estimate");
    }
    expect(five?.reading.de).toContain("fünfmal");
    expect(ten?.reading.de).toContain("zehnmal");
    expect(ten?.reading.de).toContain("kein Ausbauziel");
    expect(today?.reading.de).not.toContain("kein Ausbauziel");
    expect(report.yTicksGw).toContain(0);
  });

  it("names the fallback day in the headline and stays a Germany model estimate", () => {
    expect(report.headline.de).toBe("Letzter Überschusstag: 27.09.");
    expect(report.sentence.de).toContain("Letzter Überschusstag: 27.09.");
    expect(report.sentence.de).toContain("in Deutschland");
    expect(report.sentence.de).toContain("Modellschätzung, keine Messung");
    expect(report.sentence.de).toContain("Abendspitze");
    expect(report.sentence.en).toContain("model estimate, not a measurement");
    expect(report.sentence.de).not.toMatch(/Hamburg|50Hertz|Engpass|Regelzone|Norddeutschland/);
    expect(report.footnote?.de).toContain("Battery Charts");
    expect(report.footnote?.de).toContain("90 %");
  });

  it("says when the evening is not published instead of drawing a fake peak", () => {
    const morning = buildMoreStorage({
      fleet,
      day: { dateBerlin: "2026-10-21", slots: slot(10, 4, 30_000, 10_000, 30_000) },
      fallback: false,
      berlinTodayKey: "2026-10-21",
    });
    expect(morning.fallback).toBe(false);
    expect(morning.headline.de).toBe("Was wäre mit mehr Großspeichern?");
    expect(morning.steps[0]?.peakReductionGw).toBeNull();
    expect(morning.steps[0]?.peakLabel.de).toBe("Abend noch nicht veröffentlicht");
    expect(morning.sentence.de).toContain("noch nicht veröffentlicht");
    expect(morning.steps[0]?.points.length).toBeGreaterThan(0);
  });

  it("does not build a chart for a day without surplus", () => {
    const missing = buildMoreStorage({
      fleet,
      day: { dateBerlin: "2026-10-21", slots: slot(9, 4, 60_000, 10_000, 5_000) },
      fallback: false,
      berlinTodayKey: "2026-10-21",
    });
    expect(missing.available).toBe(false);
    expect(missing.steps).toHaveLength(0);
    const shown = buildMoreStorage({
      fleet,
      day: { dateBerlin: "2026-10-21", slots: slot(9, 4, 60_000, 10_000, 5_000) },
      fallback: false,
      berlinTodayKey: "2026-10-21",
      showWithoutSurplus: true,
    });
    expect(shown.available).toBe(true);
    expect(shown.steps[0]?.storedShare).toBe(0);
    expect(shown.steps[0]?.reading.de).toContain("nicht über der Last");
    expect(shown.steps.every((step) => step.factor === 1 || step.estimateNote !== null)).toBe(true);
  });
});
