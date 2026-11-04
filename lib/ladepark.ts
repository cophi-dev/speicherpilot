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

export function ladeparkProfile(category: LadeparkCategory = 4): LoadProfile {
  const pMax = ladeparkMaxKw(category);
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
      if (spikeDay && hour >= 17 && hour < 18) {
        value = pMax;
      }
      samplesKw.push(Math.min(pMax, Math.max(0, value)));
    }
  }
  const scale = annualKwhTarget / samplesKw.reduce((s, kw) => s + kw * 0.25, 0);
  for (let i = 0; i < samplesKw.length; i += 1) {
    samplesKw[i] = Math.min(pMax, samplesKw[i] * scale);
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
  annualBenefitEur: number;
  paybackYears: number | null;
  paybackSpan: { low: number | null; high: number | null };
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
    autoSize: true,
    manualPowerKw: 0,
    manualEnergyKwh: 0,
    roundTripEfficiency: LADEPARK.roundTripEfficiency,
    capexEurPerKwh: LADEPARK.capexEurPerKwh,
    maxCyclesPerYear: LADEPARK.maxCyclesPerYear,
    lifetimeYears: LADEPARK.lifetimeYears,
    discountRate: 0,
  });
  const dt = 0.25;
  const beforeStats = annualImportStats(profile.samplesKw, dt);
  const afterStats = annualImportStats(plan.gridKw, dt);
  const wAfter = beforeStats.kwh + plan.totalChargeKwh - plan.totalDischargeKwh;
  const stromNev = stromNevSavings({
    pBeforeKw: beforeStats.maxKw,
    wBeforeKwh: beforeStats.kwh,
    pAfterKw: afterStats.maxKw,
    wAfterKwh: wAfter,
  });
  const arbitrageEur = plan.arbitrageEur;
  const opex = plan.capexEur * 0.015;
  const annualBenefitEur = stromNev.savingsEur + arbitrageEur - opex;
  const paybackYears = annualBenefitEur > 0 ? plan.capexEur / annualBenefitEur : null;
  const span = modelTariffUncertaintyFactor();
  const paybackSpan = {
    low: paybackYears != null ? paybackYears * span.high : null,
    high: paybackYears != null ? paybackYears * span.low : null,
  };
  return {
    plan,
    category,
    connectionKw: limitKw,
    stromNev,
    arbitrageEur,
    annualBenefitEur,
    paybackYears,
    paybackSpan,
  };
}

export function ladeparkTeachingPeak(category: LadeparkCategory = 4): { peakKw: number; limitKw: number } {
  return { peakKw: ladeparkMaxKw(category), limitKw: ladeparkConnectionKw(category) };
}
