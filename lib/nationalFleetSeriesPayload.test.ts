import { showsFleetEuroRevenue } from "@/lib/beispieltage";
import {
  fleetChartSeriesForDay,
  fleetChartSeriesForMonth,
} from "@/lib/nationalFleetSeriesPayload";
import { getFleetRun, sliceFleetDay } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

describe("fleetChartSeriesPayload", () => {
  const bundle = loadNationalFleetMonthBundle();

  it("skaliert ×5 Leistung und Energie in der Zeitreihe, ohne Euro-Felder", () => {
    const run1 = getFleetRun(bundle, 1, "spitze");
    const run5 = getFleetRun(bundle, 5, "spitze");
    const month1 = fleetChartSeriesForMonth(run1, null, 1);
    const month5 = fleetChartSeriesForMonth(run5, null, 5);

    expect(month1.selected.r_mw[0]).toBeCloseTo(run1.r_mw[0]!, 3);
    const maxC1 = Math.max(...run1.c_mw);
    const maxC5 = Math.max(...run5.c_mw);
    expect(maxC5 / maxC1).toBeCloseTo(5, 0.15);

    for (const payload of [month1.selected, month5.selected]) {
      expect(Object.keys(payload)).not.toContain("revenueEur");
      expect(Object.keys(payload)).not.toContain("euro");
    }
    expect(showsFleetEuroRevenue(5)).toBe(false);
    expect(showsFleetEuroRevenue(1)).toBe(true);
  });

  it("liefert Tages-Slice mit gleicher Punktzahl wie Berlin-Tag", () => {
    const run = getFleetRun(bundle, 1, "ueberschuss");
    const dayKey = "2026-10-29";
    const slice = sliceFleetDay(run, dayKey);
    expect(slice).not.toBeNull();
    const daySeries = fleetChartSeriesForDay(run, null, slice!.indices, 1);
    expect(daySeries.selected.timestamp_berlin.length).toBeGreaterThanOrEqual(92);
    expect(daySeries.selected.timestamp_berlin.length).toBeLessThanOrEqual(100);
  });
});
