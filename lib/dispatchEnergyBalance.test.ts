import { evaluateSurplusDayFactor } from "@/lib/surplusDaySimulation";
import type { GermanyDispatchSlot as Slot } from "@/lib/energyChartsApi";
import { verifySurplusDispatchEnergyBalance } from "@/lib/dispatchEnergyBalance";

function slot(partial: Partial<Slot> & Pick<Slot, "timestampIso">): Slot {
  return {
    hourBerlin: 10,
    residualLoadMw: 0,
    loadMw: 30_000,
    totalGenerationMw: 40_000,
    renewableGenerationMw: 35_000,
    windOnshoreMw: 25_000,
    windOffshoreMw: 5_000,
    solarMw: 5_000,
    windSolarMw: 35_000,
    crossBorderElectricityTradingMw: -5_000,
    curtailmentMw: null,
    ...partial,
  };
}

describe("dispatchEnergyBalance", () => {
  it("recomputes SoC within tolerance for a synthetic surplus day", () => {
    const slots: Slot[] = Array.from({ length: 20 }, (_, index) => {
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
    const fleet = { powerMw: 500, energyMwh: 1000 };
    const result = evaluateSurplusDayFactor(slots, fleet, 1);
    const report = verifySurplusDispatchEnergyBalance(result.quarters);
    expect(report.maxResidualMwh).toBeLessThan(1e-4);
  });
});
