import { dayResidualLoadScale, formatPeakKpi, formatPeakKpiParts, formatPeakEffectLine } from "@/lib/nationalFleetCharts";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { monthStatsForRun, parseFleetMarginal } from "@/lib/nationalMonthFleetModel";

describe("dayResidualLoadScale", () => {
  it("zooms Tages-Restlast without forcing y=0", () => {
    const pts = [
      { rGw: 64.41, rpGw: 60.86 },
      { rGw: 63.95, rpGw: 60.86 },
      { rGw: 62.0, rpGw: 62.0 },
    ];
    const scale = dayResidualLoadScale(pts, null, 92, 6);
    expect(scale.min).toBeGreaterThan(55);
    expect(scale.max).toBeLessThan(67);
  });
});

describe("nationalFleetCharts copy", () => {
  it("positive peak reduction", () => {
    expect(formatPeakKpi(59.5, 4.9, 7.6)).toMatch(/Senkung.*4,9/);
    expect(formatPeakKpi(59.5, 4.9, 7.6)).not.toMatch(/\(-/);
    const parts = formatPeakKpiParts(62.16, 2.24, 3.478);
    expect(parts.value).toBe("62,16 GW");
    expect(parts.note).toBe("(Senkung 2,24 GW, 3,5 % zur Referenzspitze 64,41 GW)");
    expect(formatPeakKpi(62.16, 2.24, 3.478)).toBe(`${parts.value} ${parts.note}`);
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
