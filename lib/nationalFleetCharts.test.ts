import { formatPeakKpi, formatPeakEffectLine } from "@/lib/nationalFleetCharts";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { monthStatsForRun, parseFleetMarginal } from "@/lib/nationalMonthFleetModel";

describe("nationalFleetCharts copy", () => {
  it("positive peak reduction", () => {
    expect(formatPeakKpi(59.5, 4.9, 7.6)).toMatch(/Senkung.*4,9/);
    expect(formatPeakKpi(59.5, 4.9, 7.6)).not.toMatch(/\(-/);
  });

  it("negative peak reduction uses höher wording", () => {
    const line = formatPeakEffectLine(73.8, -9.45, -14.7);
    expect(line).toMatch(/höher/);
    expect(line).not.toMatch(/−−|--/);
    expect(formatPeakKpi(73.8, -9.45, -14.7)).toMatch(/höher/);
  });
});

describe("fleet marginal bundle", () => {
  it("has three expansion steps", () => {
    const bundle = loadNationalFleetMonthBundle();
    const marginal = parseFleetMarginal(bundle);
    expect(marginal.length).toBe(3);
    expect(marginal.map((m) => m.delta_factor_units)).toEqual([1, 3, 5]);
  });

  it("month peak stats differ between markt x5 and x1", () => {
    const bundle = loadNationalFleetMonthBundle();
    const x1 = monthStatsForRun(bundle, 1, "markt");
    const x5 = monthStatsForRun(bundle, 5, "markt");
    expect(x5.peakReductionGw).toBeLessThan(x1.peakReductionGw);
  });
});
