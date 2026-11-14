import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildLiveDayPlausibility } from "@/lib/liveDayPlausibility";
import {
  chartPointsWithinStand,
  hmToHourFraction,
  lastChartHourFraction,
  plotXFromBerlinHour,
  standHourFraction,
} from "@/lib/liveTagChartGeometry";
import { parseWindSolarDays } from "@/lib/windSolarResidual";

const FIXTURE = join(__dirname, "..", "__fixtures__", "live_tag_1411", "tp_today.json");

describe("liveTagChartGeometry (Fixture Abruf 16:27)", () => {
  const day = parseWindSolarDays(JSON.parse(readFileSync(FIXTURE, "utf8"))).find(
    (entry) => entry.dateBerlin === "2026-11-14",
  )!;
  const plausibility = buildLiveDayPlausibility(day.slots);

  it("endet spätestens bei Stand; kein Punkt nach Stand", () => {
    const visible = chartPointsWithinStand(plausibility);
    expect(visible.length).toBeGreaterThan(10);
    for (const point of visible) {
      expect(Date.parse(point.slot.timestampIso)).toBeLessThan(plausibility.standEndUnixMs);
    }
    const lastHour = lastChartHourFraction(plausibility);
    expect(lastHour).not.toBeNull();
    const standHour = standHourFraction(plausibility.standEndUnixMs);
    expect(lastHour!).toBeLessThanOrEqual(standHour - 1 / 96);
    expect(plausibility.standLabelHm).toMatch(/^1[34]:/);
  });

  it("mappt die letzte sichtbare x-Position auf 14:30–15:00, nicht auf Tagesende", () => {
    const plotW = 900;
    const lastHour = lastChartHourFraction(plausibility)!;
    const xLast = plotXFromBerlinHour(lastHour, 56, plotW);
    const xStand = plotXFromBerlinHour(standHourFraction(plausibility.standEndUnixMs), 56, plotW);
    const xEndDay = plotXFromBerlinHour(24, 56, plotW);
    expect(xLast).toBeLessThan(xStand + 1);
    expect(xLast).toBeLessThan(xEndDay * 0.65);
    expect(lastHour).toBeGreaterThanOrEqual(hmToHourFraction("14:30"));
    expect(lastHour).toBeLessThan(hmToHourFraction("15:15"));
  });
});