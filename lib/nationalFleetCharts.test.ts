import { DISPLAY_NBSP } from "@/lib/displayUnitFormat";

import {
  dayResidualLoadScale,
  formatDayPeakKpiFromSlice,
  formatTagDayPeakHeadline,
  peakReductionPctVsReference,
  REF_RESIDUAL_PEAK_GW,
  formatPeakKpi,
  formatPeakKpiParts,
  formatPeakEffectLine,
  formatReferencePeakCaption,
  defaultMonthPeakReference,
} from "@/lib/nationalFleetCharts";
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
  it("Referenzspitze nennt Oktober 2026", () => {
    expect(formatReferencePeakCaption(defaultMonthPeakReference(), "de")).toBe(
      `Höchste Restlast Oktober 2026: 64,41${DISPLAY_NBSP}GW`,
    );
    expect(formatReferencePeakCaption(defaultMonthPeakReference(), "en")).toBe(
      `Highest residual load October 2026: 64.41${DISPLAY_NBSP}GW`,
    );
  });

  it("Tagesspitze statt Monats-Referenz bei Tagesdaten", () => {
    const slice = formatDayPeakKpiFromSlice(51.68, 54.3, "2026-11-16");
    expect(slice.reference.kind).toBe("day");
    expect(formatReferencePeakCaption(slice.reference, "de")).toMatch(
      new RegExp(`Höchste Restlast am 16\\.11\\.2026: 54,30${DISPLAY_NBSP}GW, Verbrauch minus Wind und Sonne`),
    );
    const parts = formatPeakKpiParts(51.68, slice.reductionGw, slice.reductionPct, { reference: slice.reference });
    expect(parts.note).toMatch(/16\.11\.2026/);
    expect(parts.note).not.toMatch(/Oktober 2026/);
  });

  it("positive peak reduction", () => {
    expect(formatPeakKpi(59.5, 4.9, 7.6)).toMatch(/Senkung.*4,9/);
    expect(formatPeakKpi(59.5, 4.9, 7.6)).not.toMatch(/\(-/);
    expect(formatPeakKpi(59.5, 4.9, 7.6)).toMatch(
      new RegExp(`Höchste Restlast Oktober 2026: 64,41${DISPLAY_NBSP}GW`),
    );
    const parts = formatPeakKpiParts(62.16, 2.24, 3.478);
    expect(parts.value).toBe(`62,16${DISPLAY_NBSP}GW`);
    expect(parts.note).toBe(
      `(Senkung 2,24${DISPLAY_NBSP}GW, 3,5${DISPLAY_NBSP}% bezogen auf Höchste Restlast Oktober 2026: 64,41${DISPLAY_NBSP}GW)`,
    );
    expect(formatPeakKpi(62.16, 2.24, 3.478)).toBe(`${parts.value} ${parts.note}`);
  });

  it("Monatskontext-Prozent bezogen auf Oktober-Referenz aus Daten", () => {
    const after = REF_RESIDUAL_PEAK_GW - 2.62;
    expect(peakReductionPctVsReference(REF_RESIDUAL_PEAK_GW, after)).toBeCloseTo(4.07, 1);
  });

  it("formatTagDayPeakHeadline ohne doppelte End-GW", () => {
    const line = formatTagDayPeakHeadline(34.79, 32.86, 1.93, 5.6);
    expect(line).toMatch(/34,79 → 32,86\u00a0GW/);
    expect(line).toMatch(/−1,93\u00a0GW/);
    expect(line).toMatch(/5,6\u00a0% der Spitze/);
    expect(line).not.toMatch(/−5,6/);
    expect(line).not.toMatch(/32,86.*32,86/);
  });

  it("negative peak reduction uses höher wording", () => {
    const line = formatPeakEffectLine(73.8, -9.45, -14.7);
    expect(line).toMatch(/höher/);
    expect(line).toMatch(/Oktober 2026/);
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
