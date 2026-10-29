/**
 * @jest-environment node
 */
import {
  buildSurplusDayReport,
} from "@/lib/surplusDaySimulation";

/** Reference fleet from nachrechner (Battery Charts live stand). */
const REF_FLEET = { powerMw: 4_580, energyMwh: 8_000 };

describe("surplusDaySimulation reference days (Energy-Charts)", () => {
  const live = process.env.SURPLUS_REFERENCE_LIVE === "1" ? it : it.skip;

  live("matches nachrechner reference values", async () => {
    const { getGermanyEnergyFlowForBerlinRange } = await import("@/lib/energyChartsApi");
    const { resolveGermanyEnergyFlowBerlinRangeForDate } = await import("@/lib/germanyEnergyFlowPeriod");
    const now = new Date("2026-10-29T10:00:00+02:00");

    async function reportFor(dateBerlin: string) {
      const flow = await getGermanyEnergyFlowForBerlinRange(
        resolveGermanyEnergyFlowBerlinRangeForDate(dateBerlin, now),
        now
      );
      expect(flow).not.toBeNull();
      return buildSurplusDayReport(flow!, REF_FLEET);
    }

    const oct28 = await reportFor("2026-10-28");
    for (const factor of [1, 2, 5, 10] as const) {
      expect(oct28!.factors[factor].absorbedGwh).toBeCloseTo(0, 2);
    }

    const oct25 = await reportFor("2026-10-25");
    expect(oct25!.factors[1].absorbedGwh).toBeCloseTo(6.4, 2);
    expect(oct25!.factors[2].absorbedGwh).toBeCloseTo(9.64, 2);

    const jun21 = await reportFor("2026-06-21");
    expect(jun21!.factors[10].absorbedGwh).toBeCloseTo(58.17, 2);
    expect(jun21!.factors[10].simulatedExportGwh).toBeCloseTo(5.96, 2);
  }, 120_000);
});
