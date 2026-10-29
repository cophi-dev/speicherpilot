/**
 * @jest-environment node
 */
import { findFirstUnixSecondForBerlinDateKey } from "@/lib/berlinCalendar";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import {
  buildSurplusDayReport,
  evaluateSurplusDayFactor,
  surplusEveningPeaksGw,
  surplusQuartersToChartSamples,
  type SurplusDayQuarter,
} from "@/lib/surplusDaySimulation";

const REF_FLEET = { powerMw: 4_580, energyMwh: 8_000 };

function eveningAfterGw(quarters: SurplusDayQuarter[]): number | null {
  return surplusEveningPeaksGw(quarters).afterGw;
}

function eveningBeforeGw(quarters: SurplusDayQuarter[]): number | null {
  return surplusEveningPeaksGw(quarters).beforeGw;
}

describe("surplusDaySimulation evening peaks", () => {
  const live = process.env.SURPLUS_REFERENCE_LIVE === "1" ? it : it.skip;

  live("does not raise the evening peak when the fleet factor increases", async () => {
    const { getGermanyEnergyFlowForBerlinRange } = await import("@/lib/energyChartsApi");
    const { resolveGermanyEnergyFlowBerlinRangeForDate } = await import("@/lib/germanyEnergyFlowPeriod");
    const now = new Date("2026-10-29T10:00:00+02:00");

    async function peaks(dateBerlin: string) {
      const flow = await getGermanyEnergyFlowForBerlinRange(
        resolveGermanyEnergyFlowBerlinRangeForDate(dateBerlin, now),
        now
      );
      expect(flow).not.toBeNull();
      const report = buildSurplusDayReport(flow!, REF_FLEET);
      expect(report).not.toBeNull();
      const before = eveningBeforeGw(report!.factors[1].quarters);
      const byFactor = {} as Record<number, number | null>;
      for (const factor of LIVE_DISPATCH_FACTORS) {
        byFactor[factor] = eveningAfterGw(report!.factors[factor].quarters);
      }
      return { before, byFactor, report: report! };
    }

    const oct25 = await peaks("2026-10-25");
    expect(oct25.before).toBeCloseTo(8.27, 1);
    expect(oct25.byFactor[1]).toBeCloseTo(5.74, 1);
    expect(oct25.byFactor[2]).toBeCloseTo(oct25.byFactor[5]!, 1);
    expect(oct25.byFactor[5]).toBeCloseTo(oct25.byFactor[10]!, 1);
    expect(oct25.byFactor[2]!).toBeLessThanOrEqual(oct25.byFactor[1]! + 0.05);
    for (const factor of LIVE_DISPATCH_FACTORS) {
      expect(oct25.byFactor[factor]!).toBeLessThanOrEqual(oct25.before! + 0.05);
    }

    const jun21 = await peaks("2026-06-21");
    expect(jun21.byFactor[10]!).toBeLessThanOrEqual(jun21.byFactor[5]! + 0.05);
    expect(jun21.byFactor[5]!).toBeLessThanOrEqual(jun21.byFactor[2]! + 0.05);
    expect(jun21.byFactor[2]!).toBeLessThanOrEqual(jun21.byFactor[1]! + 0.05);
    expect(jun21.byFactor[1]!).toBeLessThanOrEqual(jun21.before! + 0.05);

    for (const factor of LIVE_DISPATCH_FACTORS) {
      const row = oct25.report.factors[factor];
      expect(row.dischargedGwh).toBeCloseTo(row.absorbedGwh * 0.85, 1);
    }
  }, 120_000);
});

describe("surplusDaySimulation DST chart slots", () => {
  it("assigns one chart slot per timestamp on a 25-hour day", () => {
    const start = findFirstUnixSecondForBerlinDateKey("2026-10-25");
    const end = findFirstUnixSecondForBerlinDateKey("2026-10-26");
    const slots = [];
    for (let unix = start; unix < end; unix += 900) {
      const iso = new Date(unix * 1000).toISOString();
      slots.push({
        timestampIso: iso,
        hourBerlin: new Date(iso).getUTCHours(),
        residualLoadMw: 5_000,
        loadMw: 40_000,
        totalGenerationMw: 45_000,
        renewableGenerationMw: 10_000,
        windOnshoreMw: 5_000,
        windOffshoreMw: 1_000,
        solarMw: 0,
        windSolarMw: 6_000,
        crossBorderElectricityTradingMw: -1_000,
        curtailmentMw: null,
      });
    }
    expect(slots.length).toBe(100);
    const result = evaluateSurplusDayFactor(slots, REF_FLEET, 1);
    expect(result.quarters).toHaveLength(100);
    const samples = surplusQuartersToChartSamples(result.quarters);
    expect(new Set(samples.map((sample) => sample.timestampIso)).size).toBe(100);
    expect(samples.every((sample, index) => sample.slotIndex === index)).toBe(true);
  });
});
