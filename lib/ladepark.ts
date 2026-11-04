import { planSite, type LoadProfile, type SitePlan } from "@/lib/sitePlanner";
import { alignPricesToProfile } from "@/lib/loadPrices12m";
import { modelTariffUncertaintyFactor, stromNevSavings } from "@/lib/stromNevTariff";

/** Ladepark category: count of charging points (Deutschlandnetz S/M/L/XL). */
export type LadeparkCategory = 4 | 8 | 12 | 16;

export const LADEPARK = {
  kwPerPoint: 200,
  energyMwhPerPointYear: 120,
  connectionFactor: 0.75,
  capexEurPerKwh: 500,
  roundTripEfficiency: 0.85,
  maxCyclesPerYear: 400,
  lifetimeYears: 15,
  voltage: "MS" as const,
  sourceNote: "BEISPIELDATEN · synthetisches Profil, Annahmen in der Methodik",
} as const;

export function ladeparkMaxKw(category: LadeparkCategory): number {
  return category * LADEPARK.kwPerPoint;
}

export function ladeparkConnectionKw(category: LadeparkCategory): number {
  return LADEPARK.connectionFactor * ladeparkMaxKw(category);
}

function ladeparkSpikeSlot(day: number, step: number): boolean {
  const hour = step / 4;
  return day % 14 === 4 && hour >= 17 && hour < 18;
}

export function ladeparkProfile(category: LadeparkCategory = 4): LoadProfile {
  const pMax = ladeparkMaxKw(category);
  const connectionKw = ladeparkConnectionKw(category);
  const annualKwhTarget = category * LADEPARK.energyMwhPerPointYear * 1000;
  const samplesKw: number[] = [];
  for (let day = 0; day < 365; day += 1) {
    const month = Math.min(11, Math.floor((day % 365) / 30.4167));
    const weekend = day % 7 >= 5;
    const summer = month >= 5 && month <= 7;
    const winter = month <= 1 || month >= 10;
    const spikeDay = day % 14 === 4;
    for (let step = 0; step < 96; step += 1) {
      const hour = step / 4;
      let value =
        0.35 * pMax * Math.exp(-Math.pow((hour - 13) / 5, 2)) +
        0.45 * pMax * Math.exp(-Math.pow((hour - 17.5) / 3.5, 2));
      if (weekend) {
        value *= 0.85;
      }
      if (summer) {
        value *= 1.1;
      } else if (winter) {
        value *= 0.9;
      }
      if (ladeparkSpikeSlot(day, step)) {
        value = pMax;
      } else if (spikeDay && hour >= 16.5 && hour < 19) {
        value = Math.max(value, connectionKw * 1.08);
      }
      samplesKw.push(Math.min(pMax, Math.max(0, value)));
    }
  }
  let spikeKwh = 0;
  let baselineKwh = 0;
  for (let i = 0; i < samplesKw.length; i += 1) {
    const day = Math.floor(i / 96);
    const step = i % 96;
    const slice = samplesKw[i] * 0.25;
    if (ladeparkSpikeSlot(day, step)) {
      spikeKwh += slice;
    } else {
      baselineKwh += slice;
    }
  }
  const baselineTarget = Math.max(0, annualKwhTarget - spikeKwh);
  const baselineScale = baselineKwh > 0 ? baselineTarget / baselineKwh : 1;
  for (let i = 0; i < samplesKw.length; i += 1) {
    const day = Math.floor(i / 96);
    const step = i % 96;
    if (ladeparkSpikeSlot(day, step)) {
      continue;
    }
    samplesKw[i] = Math.min(pMax, samplesKw[i] * baselineScale);
  }
  return {
    samplesKw,
    intervalMinutes: 15,
    synthetic: true,
    label: `Beispiel Schnellladepark (${category} Ladepunkte)`,
    sourceNote: LADEPARK.sourceNote,
    rowCount: samplesKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
}

export type LadeparkEconomics = {
  plan: SitePlan;
  category: LadeparkCategory;
  connectionKw: number;
  stromNev: ReturnType<typeof stromNevSavings>;
  arbitrageEur: number;
  peakShavingEur: number;
  annualBenefitEur: number;
  paybackYears: number | null;
  paybackSpan: { low: number | null; high: number | null };
  stromNevSpan: { low: number; high: number };
  arbitrageSpan: { low: number; high: number };
  annualBenefitSpan: { low: number; high: number };
};

function annualImportStats(seriesKw: number[], dtHours: number): { maxKw: number; kwh: number } {
  let maxKw = 0;
  let kwh = 0;
  for (const kw of seriesKw) {
    const imp = Math.max(0, kw);
    maxKw = Math.max(maxKw, imp);
    kwh += imp * dtHours;
  }
  return { maxKw, kwh };
}

export function planLadepark(category: LadeparkCategory = 4): LadeparkEconomics {
  const profile = ladeparkProfile(category);
  const limitKw = ladeparkConnectionKw(category);
  const shaveKw = Math.max(0, ladeparkMaxKw(category) - limitKw);
  const prices = alignPricesToProfile(profile.samplesKw.length, profile.intervalMinutes);
  const plan = planSite({
    profile,
    pvEnabled: false,
    pvKwp: 0,
    pvOrientation: "south",
    limitKw,
    voltage: LADEPARK.voltage,
    operation: "market",
    demandChargeEurPerKwYear: 0,
    energyPriceCtPerKwh: 0,
    feedInCtPerKwh: 0,
    dynamicTariff: true,
    priceEurPerMwh: prices,
    autoSize: false,
    manualPowerKw: shaveKw,
    manualEnergyKwh: shaveKw * 2.5,
    roundTripEfficiency: LADEPARK.roundTripEfficiency,
    capexEurPerKwh: LADEPARK.capexEurPerKwh,
    maxCyclesPerYear: 0,
    lifetimeYears: LADEPARK.lifetimeYears,
    discountRate: 0,
  });
  const arbPlan = planSite({
    profile,
    pvEnabled: false,
    pvKwp: 0,
    pvOrientation: "south",
    limitKw,
    voltage: LADEPARK.voltage,
    operation: "market",
    demandChargeEurPerKwYear: 0,
    energyPriceCtPerKwh: 0,
    feedInCtPerKwh: 0,
    dynamicTariff: true,
    priceEurPerMwh: prices,
    autoSize: false,
    manualPowerKw: shaveKw,
    manualEnergyKwh: shaveKw * 2.5,
    roundTripEfficiency: LADEPARK.roundTripEfficiency,
    capexEurPerKwh: LADEPARK.capexEurPerKwh,
    maxCyclesPerYear: LADEPARK.maxCyclesPerYear,
    lifetimeYears: LADEPARK.lifetimeYears,
    discountRate: 0,
  });
  const dt = 0.25;
  const beforeStats = annualImportStats(profile.samplesKw, dt);
  const afterStats = annualImportStats(plan.gridKw, dt);
  const stromNev = stromNevSavings({
    pBeforeKw: plan.peakImportBeforeKw,
    wBeforeKwh: beforeStats.kwh,
    pAfterKw: plan.peakImportAfterKw,
    wAfterKwh: afterStats.kwh,
  });
  const arbitrageEur = arbPlan.arbitrageEur;
  const peakShavingEur = stromNev.savingsEur;
  const opex = plan.capexEur * 0.015;
  const annualBenefitEur = peakShavingEur + arbitrageEur - opex;
  const paybackYears = annualBenefitEur > 0 ? plan.capexEur / annualBenefitEur : null;
  const span = modelTariffUncertaintyFactor();
  const stromNevSpan = { low: peakShavingEur * span.low, high: peakShavingEur * span.high };
  const arbitrageSpan = { low: arbitrageEur * span.low, high: arbitrageEur * span.high };
  const annualBenefitSpan = {
    low: stromNevSpan.low + arbitrageSpan.low - opex,
    high: stromNevSpan.high + arbitrageSpan.high - opex,
  };
  const paybackSpan = {
    low: paybackYears != null ? plan.capexEur / annualBenefitSpan.high : null,
    high: paybackYears != null ? plan.capexEur / annualBenefitSpan.low : null,
  };
  return {
    plan,
    category,
    connectionKw: limitKw,
    stromNev,
    arbitrageEur,
    peakShavingEur,
    annualBenefitEur,
    paybackYears,
    paybackSpan,
    stromNevSpan,
    arbitrageSpan,
    annualBenefitSpan,
  };
}

export function ladeparkTeachingPeak(category: LadeparkCategory = 4): { peakKw: number; limitKw: number } {
  return { peakKw: ladeparkMaxKw(category), limitKw: ladeparkConnectionKw(category) };
}
