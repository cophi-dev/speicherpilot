import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { getFleetRun, monthStatsFromRunSeries } from "@/lib/nationalMonthFleetModel";

const TOL = 0.02;

function relOk(actual: number, expected: number): void {
  const denom = Math.max(Math.abs(expected), 1e-6);
  expect(Math.abs(actual - expected) / denom).toBeLessThanOrEqual(TOL);
}

describe("November 2026-11 fleet reference parity", () => {
  const bundle = loadNationalFleetMonthBundle("2026-11");

  it("Überschuss lädt 0 GWh bei allen Stufen", () => {
    for (const factor of [2, 5, 10] as const) {
      const run = getFleetRun(bundle, factor, "ueberschuss");
      const st = monthStatsFromRunSeries(run, factor);
      expect(st.chargeGwh).toBeLessThan(0.01);
    }
  });

  it("Spitze ×2 Monatshorizont −2,62 GW", () => {
    const st = monthStatsFromRunSeries(getFleetRun(bundle, 2, "spitze"), 2);
    relOk(st.peakReductionGw, 2.62);
  });

  it("Spitze ×10 Monatshorizont −9,54 GW", () => {
    const st = monthStatsFromRunSeries(getFleetRun(bundle, 10, "spitze"), 10);
    relOk(st.peakReductionGw, 9.54);
  });

  it("Markt ×2 lädt an allen verfügbaren Tagen im laufenden Monatslauf", () => {
    const run = getFleetRun(bundle, 2, "markt");
    const allDays = new Set<string>();
    const chargeDays = new Set<string>();
    for (let i = 0; i < run.intervalCount; i += 1) {
      const day = run.timestamp_berlin[i]!.slice(0, 10);
      allDays.add(day);
      if (run.c_mw[i] > 0.5) {
        chargeDays.add(day);
      }
    }
    expect(allDays.size).toBeGreaterThanOrEqual(16);
    expect(chargeDays.size).toBe(allDays.size);
    const st = monthStatsFromRunSeries(run, 2);
    const chargePerDayGwh = st.chargeGwh / allDays.size;
    expect(chargePerDayGwh).toBeGreaterThan(8);
    expect(chargePerDayGwh).toBeLessThan(20);
  });
});