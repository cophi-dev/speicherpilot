import type { GermanyDispatchSlot } from "@/lib/energyChartsApi";
import {
  buildSurplusDayReport,
  evaluateSurplusDayFactor,
  sumStructuralSurplusGwh,
} from "@/lib/surplusDaySimulation";

function slot(partial: Partial<GermanyDispatchSlot> & Pick<GermanyDispatchSlot, "timestampIso">): GermanyDispatchSlot {
  return {
    hourBerlin: 10,
    residualLoadMw: 0,
    loadMw: 30_000,
    totalGenerationMw: 40_000,
    renewableGenerationMw: 35_000,
    crossBorderElectricityTradingMw: -5_000,
    curtailmentMw: null,
    ...partial,
  };
}

describe("surplusDaySimulation", () => {
  it("returns zero absorption on a day without structural surplus", () => {
    const slots = [
      slot({ timestampIso: "2026-05-07T10:00:00+02:00", totalGenerationMw: 20_000, loadMw: 30_000 }),
      slot({ timestampIso: "2026-05-07T10:15:00+02:00", totalGenerationMw: 20_000, loadMw: 30_000 }),
    ];
    const result = evaluateSurplusDayFactor(slots, { powerMw: 4_500, energyMwh: 7_900 }, 1);
    expect(result.absorbedMwh).toBeCloseTo(0, 6);
    expect(result.remainingSurplusMwh).toBeCloseTo(0, 6);
  });

  it("absorbs surplus smaller than usable fleet capacity", () => {
    const slots = Array.from({ length: 4 }, (_, index) =>
      slot({
        timestampIso: `2026-05-07T10:${String(index * 15).padStart(2, "0")}:00+02:00`,
        totalGenerationMw: 40_000,
        loadMw: 30_000,
      })
    );
    const result = evaluateSurplusDayFactor(slots, { powerMw: 50_000, energyMwh: 50_000 }, 1);
    expect(result.absorbedMwh).toBeCloseTo(10_000, 1);
    expect(result.absorbedMwh + result.remainingSurplusMwh).toBeCloseTo(10_000, 1);
  });

  it("caps absorption when surplus exceeds usable capacity", () => {
    const slots = Array.from({ length: 8 }, (_, index) => {
      const hour = 10 + Math.floor((index * 15) / 60);
      const minute = (index * 15) % 60;
      return slot({
        timestampIso: `2026-05-07T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`,
        hourBerlin: hour,
        totalGenerationMw: 40_000,
        loadMw: 30_000,
      });
    });
    const fleet = { powerMw: 50_000, energyMwh: 1_000 };
    const result = evaluateSurplusDayFactor(slots, fleet, 1);
    const usable = fleet.energyMwh * 0.8;
    expect(result.absorbedMwh).toBeLessThanOrEqual(usable + 1e-6);
    expect(result.remainingSurplusMwh).toBeGreaterThan(0);
    expect(result.absorbedMwh + result.remainingSurplusMwh).toBeCloseTo(20_000, 1);
  });

  it("charges less from a nearly full usable window", () => {
    const slots = [slot({ timestampIso: "2026-05-07T10:00:00+02:00", totalGenerationMw: 50_000, loadMw: 10_000 })];
    const fleet = { powerMw: 50_000, energyMwh: 1_000 };
    const empty = evaluateSurplusDayFactor(slots, fleet, 1, { initialSocMwh: 0 });
    const full = evaluateSurplusDayFactor(slots, fleet, 1, {
      initialSocMwh: fleet.energyMwh * 0.8,
    });
    expect(full.absorbedMwh).toBeLessThan(empty.absorbedMwh);
  });

  it("does not treat missing curtailment as zero in the report", () => {
    const report = buildSurplusDayReport(
      {
        dateBerlin: "2026-05-07",
        samplePoints: 1,
        pointFractionOfDay: 1,
        source: "energy-charts.total_power",
        curtailmentStatus: "unavailable_upstream",
        slots: [slot({ timestampIso: "2026-05-07T10:00:00+02:00" })],
      },
      { powerMw: 100, energyMwh: 100 }
    );
    expect(report?.observed.curtailmentGwh).toBeNull();
  });

  it("keeps simulated export between zero and observed while charging reduces exports", () => {
    const slots = [
      slot({
        timestampIso: "2026-05-07T10:00:00+02:00",
        totalGenerationMw: 45_000,
        loadMw: 30_000,
        crossBorderElectricityTradingMw: -8_000,
      }),
      slot({
        timestampIso: "2026-05-07T10:15:00+02:00",
        totalGenerationMw: 45_000,
        loadMw: 30_000,
        crossBorderElectricityTradingMw: -6_000,
      }),
    ];
    const result = evaluateSurplusDayFactor(slots, { powerMw: 20_000, energyMwh: 20_000 }, 1);
    expect(result.observedExportGwh).not.toBeNull();
    expect(result.simulatedExportGwh).not.toBeNull();
    expect(result.simulatedExportGwh!).toBeGreaterThanOrEqual(0);
    expect(result.simulatedExportGwh!).toBeLessThanOrEqual(result.observedExportGwh! + 1e-9);
    expect(result.exportDeltaGwh!).toBeLessThanOrEqual(0);
  });

  it("builds factor rows for ×1, ×2, ×5 and ×10", () => {
    const slots = [slot({ timestampIso: "2026-05-07T10:00:00+02:00", totalGenerationMw: 50_000, loadMw: 10_000 })];
    const report = buildSurplusDayReport(
      {
        dateBerlin: "2026-05-07",
        samplePoints: 1,
        pointFractionOfDay: 1,
        source: "energy-charts.total_power",
        curtailmentStatus: "loaded",
        slots,
      },
      { powerMw: 4_500, energyMwh: 7_900 }
    );
    expect(report?.factors[1].absorbedGwh).toBeLessThan(report!.factors[10].absorbedGwh);
    expect(sumStructuralSurplusGwh(slots)).toBeCloseTo(report!.observed.structuralSurplusGwh, 6);
  });
});
