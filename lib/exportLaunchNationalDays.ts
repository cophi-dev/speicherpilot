import { resolveGermanyEnergyFlowBerlinRangeForDate } from "@/lib/germanyEnergyFlowPeriod";
import { getGermanyEnergyFlowForBerlinRange, type GermanyDispatchSlot } from "@/lib/energyChartsApi";
import { verifySurplusDispatchEnergyBalance } from "@/lib/dispatchEnergyBalance";
import { evaluateSurplusDayFactor } from "@/lib/surplusDaySimulation";
import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

const BASE_FLEET = { powerMw: 4_580, energyMwh: 8_000 };

export type NationalDayEvidence = {
  dayKey: string;
  upstream: {
    provider: "energy-charts.info";
    endpoint: "total_power (v1 client) + v2 raw snapshot optional";
    license: "CC BY 4.0";
    range: { startKey: string; endKey: string };
    samplePoints: number;
  };
  convention: {
    surplusGwh: "max(0, wind+solar-load) quarter integration × factor",
    socWindow: [number, number];
    rteOnDischarge: number;
    chargeBeforeHourBerlin: 17;
  };
  slots: GermanyDispatchSlot[];
  factorRuns: Array<{
    factor: number;
    absorbedMwh: number;
    dischargedMwh: number;
    balanceMaxResidualMwh: number;
    quarters: ReturnType<typeof evaluateSurplusDayFactor>["quarters"];
  }>;
};

type SurplusFactor = 1 | 2 | 5 | 10;

export async function exportNationalDayEvidence(
  dayKey: string,
  factors: SurplusFactor[],
  asOf: Date = new Date("2026-11-07T12:00:00Z"),
): Promise<NationalDayEvidence> {
  const range = resolveGermanyEnergyFlowBerlinRangeForDate(dayKey, asOf);
  const flow = await getGermanyEnergyFlowForBerlinRange(range, asOf);
  if (!flow || flow.slots.length < 1) {
    throw new Error(`keine Slots für ${dayKey}`);
  }
  const factorRuns = factors.map((factor) => {
    const fleet = {
      powerMw: BASE_FLEET.powerMw * factor,
      energyMwh: BASE_FLEET.energyMwh * factor,
    };
    const day = evaluateSurplusDayFactor(flow.slots, fleet, factor);
    const balance = verifySurplusDispatchEnergyBalance(day.quarters);
    return {
      factor,
      absorbedMwh: day.absorbedMwh,
      dischargedMwh: day.dischargedMwh,
      balanceMaxResidualMwh: balance.maxResidualMwh,
      quarters: day.quarters,
    };
  });
  return {
    dayKey,
    upstream: {
      provider: "energy-charts.info",
      endpoint: "total_power (v1 client) + v2 raw snapshot optional",
      license: "CC BY 4.0",
      range: { startKey: range.startKey, endKey: range.endKey },
      samplePoints: flow.samplePoints,
    },
    convention: {
      surplusGwh: "max(0, wind+solar-load) quarter integration × factor",
      socWindow: [CHAIN_SOC_MIN, CHAIN_SOC_MAX],
      rteOnDischarge: ROUND_TRIP_EFFICIENCY,
      chargeBeforeHourBerlin: 17,
    },
    slots: flow.slots,
    factorRuns,
  };
}
