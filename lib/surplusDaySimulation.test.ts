import type { GermanyDispatchSlot } from "@/lib/energyChartsApi";
import {
  buildSurplusDayReport,
  evaluateSurplusDayFactor,
  sumWindSolarSurplusGwh,
  windSolarSurplusMwhForSlot,
} from "@/lib/surplusDaySimulation";

/** Reference fleet from nachrechner (Battery Charts live stand). */
const REF_FLEET = { powerMw: 4_580, energyMwh: 8_000 };

function slot(partial: Partial<GermanyDispatchSlot> & Pick<GermanyDispatchSlot, "timestampIso">): GermanyDispatchSlot {
  const windOn = partial.windOnshoreMw ?? 0;
  const windOff = partial.windOffshoreMw ?? 0;
  const solar = partial.solarMw ?? 0;
  const windSolarMw =
    partial.windSolarMw ??
    (windOn !== null && windOff !== null && solar !== null ? windOn + windOff + solar : null);
  return {
    hourBerlin: 10,
    residualLoadMw: 0,
    loadMw: 30_000,
    totalGenerationMw: 40_000,
    renewableGenerationMw: 35_000,
    windOnshoreMw: windOn,
    windOffshoreMw: windOff,
    solarMw: solar,
    windSolarMw,
    crossBorderElectricityTradingMw: -5_000,
    curtailmentMw: null,
    ...partial,
  };
}

describe("surplusDaySimulation", () => {
  it("returns zero absorption when wind+solar surplus is zero", () => {
    const slots = [
      slot({
        timestampIso: "2026-05-07T10:00:00+02:00",
        loadMw: 30_000,
        windOnshoreMw: 5_000,
        windOffshoreMw: 2_000,
        solarMw: 3_000,
        totalGenerationMw: 50_000,
      }),
      slot({
        timestampIso: "2026-05-07T10:15:00+02:00",
        loadMw: 30_000,
        windOnshoreMw: 4_000,
        windOffshoreMw: 1_000,
        solarMw: 2_000,
        totalGenerationMw: 40_000,
      }),
    ];
    for (const factor of [1, 2, 5, 10] as const) {
      const result = evaluateSurplusDayFactor(slots, REF_FLEET, factor);
      expect(result.absorbedMwh).toBeCloseTo(0, 6);
    }
  });

  it("never absorbs more than wind+solar surplus", () => {
    const slots = Array.from({ length: 8 }, (_, index) => {
      const hour = 10 + Math.floor((index * 15) / 60);
      const minute = (index * 15) % 60;
      return slot({
        timestampIso: `2026-05-07T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`,
        hourBerlin: hour,
        loadMw: 30_000,
        windOnshoreMw: 25_000,
        windOffshoreMw: 5_000,
        solarMw: 5_000,
        crossBorderElectricityTradingMw: -8_000,
      });
    });
    const surplusMwh = slots.reduce((sum, s) => sum + windSolarSurplusMwhForSlot(s), 0);
    for (const factor of [1, 2, 5, 10] as const) {
      const result = evaluateSurplusDayFactor(slots, REF_FLEET, factor);
      expect(result.absorbedMwh).toBeLessThanOrEqual(surplusMwh + 1e-6);
    }
  });

  it("caps absorption at usable fleet capacity", () => {
    const slots = Array.from({ length: 8 }, (_, index) => {
      const hour = 10 + Math.floor((index * 15) / 60);
      const minute = (index * 15) % 60;
      return slot({
        timestampIso: `2026-05-07T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`,
        hourBerlin: hour,
        loadMw: 10_000,
        windOnshoreMw: 25_000,
        windOffshoreMw: 5_000,
        solarMw: 5_000,
      });
    });
    const fleet = { powerMw: 50_000, energyMwh: 1_000 };
    const result = evaluateSurplusDayFactor(slots, fleet, 1);
    const usable = fleet.energyMwh * 0.8;
    expect(result.absorbedMwh).toBeLessThanOrEqual(usable + 1e-6);
  });

  it("starts charging from an empty usable window", () => {
    const slots = [slot({ timestampIso: "2026-05-07T10:00:00+02:00", loadMw: 10_000, windOnshoreMw: 20_000, solarMw: 5_000 })];
    const fleet = { powerMw: 50_000, energyMwh: 1_000 };
    const result = evaluateSurplusDayFactor(slots, fleet, 1);
    expect(result.absorbedMwh).toBeCloseTo(Math.min(15_000 * 0.25, fleet.energyMwh * 0.8), 1);
  });

  it("strictly lowers simulated export when surplus charging overlaps export", () => {
    const slots = [
      slot({
        timestampIso: "2026-05-07T10:00:00+02:00",
        hourBerlin: 10,
        loadMw: 20_000,
        windOnshoreMw: 30_000,
        solarMw: 5_000,
        crossBorderElectricityTradingMw: -8_000,
      }),
    ];
    const result = evaluateSurplusDayFactor(slots, { powerMw: 5_000, energyMwh: 5_000 }, 1);
    expect(result.observedExportGwh!).toBeCloseTo(2, 3);
    expect(result.simulatedExportGwh!).toBeLessThan(result.observedExportGwh! - 0.001);
    expect(result.exportDeltaGwh!).toBeLessThan(-0.001);
  });

  it("discharge does not increase simulated export", () => {
    const slots = [
      slot({
        timestampIso: "2026-06-21T10:00:00+02:00",
        hourBerlin: 10,
        loadMw: 20_000,
        windOnshoreMw: 40_000,
        solarMw: 10_000,
        crossBorderElectricityTradingMw: -5_000,
      }),
      slot({
        timestampIso: "2026-06-21T18:00:00+02:00",
        hourBerlin: 18,
        loadMw: 50_000,
        windOnshoreMw: 5_000,
        solarMw: 0,
        crossBorderElectricityTradingMw: 2_000,
      }),
    ];
    const result = evaluateSurplusDayFactor(slots, REF_FLEET, 1);
    expect(result.simulatedExportGwh!).toBeLessThanOrEqual(result.observedExportGwh! + 1e-9);
  });

  it("quarter series matches aggregate totals and invariants", () => {
    const slots = Array.from({ length: 8 }, (_, index) => {
      const hour = 10 + Math.floor((index * 15) / 60);
      const minute = (index * 15) % 60;
      return slot({
        timestampIso: `2026-05-07T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`,
        hourBerlin: hour,
        loadMw: 10_000,
        windOnshoreMw: 25_000,
        windOffshoreMw: 5_000,
        solarMw: 5_000,
        crossBorderElectricityTradingMw: -8_000,
      });
    });
    const result = evaluateSurplusDayFactor(slots, REF_FLEET, 1);
    const capMwh = REF_FLEET.energyMwh * 0.8;
    const absorbedFromSeries = result.quarters.reduce((sum, row) => sum + row.chargeMw * 0.25, 0);
    const exportSimFromSeries = result.quarters.reduce((sum, row) => sum + row.exportSimulatedMw * 0.25, 0);
    expect(absorbedFromSeries / 1000).toBeCloseTo(result.absorbedGwh, 6);
    expect(exportSimFromSeries / 1000).toBeCloseTo(result.simulatedExportGwh!, 6);
    for (const row of result.quarters) {
      expect(row.chargeMw).toBeLessThanOrEqual(row.surplusMw + 1e-6);
      expect(row.socMwh).toBeGreaterThanOrEqual(-1e-6);
      expect(row.socMwh).toBeLessThanOrEqual(capMwh + 1e-6);
      expect(row.chargeMw <= 1e-6 || row.dischargeMw <= 1e-6).toBe(true);
    }
  });

  it("builds factor rows with monotonic absorption when surplus is large", () => {
    const slots = [slot({ timestampIso: "2026-05-07T10:00:00+02:00", loadMw: 10_000, windOnshoreMw: 40_000, solarMw: 10_000 })];
    const report = buildSurplusDayReport(
      {
        dateBerlin: "2026-05-07",
        samplePoints: 1,
        pointFractionOfDay: 1,
        source: "energy-charts.total_power",
        slots,
      },
      REF_FLEET
    );
    expect(report?.factors[1].absorbedGwh).toBeLessThan(report!.factors[10].absorbedGwh);
    expect(sumWindSolarSurplusGwh(slots)).toBeCloseTo(report!.observed.windSolarSurplusGwh, 6);
  });
});
