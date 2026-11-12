import { resolveGermanyEnergyFlowBerlinRangeForDate } from "@/lib/germanyEnergyFlowPeriod";
import { getGermanyEnergyFlowForBerlinRange, type GermanyDispatchSlot } from "@/lib/energyChartsApi";
import { verifySurplusDispatchEnergyBalance } from "@/lib/dispatchEnergyBalance";
import { evaluateSurplusDayFactor } from "@/lib/surplusDaySimulation";
import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

/** battery-charts Großspeicher 31.10.2026 · ×k = k-mal diese Flotte insgesamt. */
export const NATIONAL_BASE_FLEET = { powerMw: 4_640, energyMwh: 8_150 };

const USABLE_SOC_FRACTION = CHAIN_SOC_MAX - CHAIN_SOC_MIN;

export type NationalDayEvidence = {
  dayKey: string;
  upstream: {
    provider: "energy-charts.info";
    endpoint: "total_power (v1 client) + v2 raw snapshot optional";
    license: "CC BY 4.0";
    apiUrlTemplate: "https://api.energy-charts.info/v2/total_power?country=de&start={startKey}&end={endKey}";
    range: { startKey: string; endKey: string };
    samplePoints: number;
    fetchedAt: string;
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
    nameplateEnergyMwh: number;
    nameplatePowerMw: number;
    usableEnergyCapMwh: number;
    maxSocMwhObserved: number;
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
  const fetchedAt = new Date().toISOString();
  const factorRuns = factors.map((factor) => {
    const day = evaluateSurplusDayFactor(flow.slots, NATIONAL_BASE_FLEET, factor);
    const balance = verifySurplusDispatchEnergyBalance(day.quarters);
    const nameplateEnergyMwh = NATIONAL_BASE_FLEET.energyMwh * factor;
    const nameplatePowerMw = NATIONAL_BASE_FLEET.powerMw * factor;
    const usableEnergyCapMwh = nameplateEnergyMwh * USABLE_SOC_FRACTION;
    const maxSocMwhObserved = Math.max(...day.quarters.map((q) => q.socMwh));
    return {
      factor,
      absorbedMwh: day.absorbedMwh,
      dischargedMwh: day.dischargedMwh,
      balanceMaxResidualMwh: balance.maxResidualMwh,
      nameplateEnergyMwh,
      nameplatePowerMw,
      usableEnergyCapMwh,
      maxSocMwhObserved,
      quarters: day.quarters,
    };
  });
  return {
    dayKey,
    upstream: {
      provider: "energy-charts.info",
      endpoint: "total_power (v1 client) + v2 raw snapshot optional",
      license: "CC BY 4.0",
      apiUrlTemplate: "https://api.energy-charts.info/v2/total_power?country=de&start={startKey}&end={endKey}",
      range: { startKey: range.startKey, endKey: range.endKey },
      samplePoints: flow.samplePoints,
      fetchedAt,
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
