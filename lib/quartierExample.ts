import { planSite, type LoadProfile, type SitePlan } from "@/lib/sitePlanner";

/**
 * Fictional new neighbourhood behind one MV/LV transformer.
 * Household energy is anchored near Destatis 2021; heat pumps, wallboxes,
 * PV and the transformer rating are stated model assumptions.
 * See /methodik#quartier.
 */
export const QUARTIER = {
  labelDe: "Beispiel: Quartier, 150 Haushalte",
  labelEn: "Example: neighbourhood, 150 households",
  sourceNote: "BEISPIELDATEN · fiktives Quartier, Annahmen in der Methodik, nicht gemessen",
  households: 150,
  /** Appliance and lighting electricity, without the heat pump. Near Destatis 2021 “Haushaltsausstattung” (2,893 kWh, that line also excludes lighting). */
  householdKwhEach: 2900,
  heatPumpShare: 0.4,
  /** Electricity for one heat pump in a new building. Model assumption, not a measured seasonal performance factor. */
  heatPumpKwhEach: 2800,
  wallboxShare: 0.3,
  wallboxKw: 11,
  /** Share of the wallboxes that charge in the same quarter-hour. */
  wallboxCoincidence: 0.22,
  /** Hours of charging on a weekday, before the coincidence factor. */
  wallboxHoursPerWeekday: 1.5,
  pvShare: 0.55,
  pvKwpEach: 6,
  /** Planning rating of the MV/LV station, compared at cos φ = 1. Not a measured transformer and not a Hamburg asset. */
  transformerKw: 200,
  powerKw: 100,
  energyKwh: 100,
  voltage: "MS" as const,
  operation: "grid-serving" as const,
  dynamicTariff: false,
  demandChargeEurPerKwYear: 120,
  energyPriceCtPerKwh: 21.4,
  feedInCtPerKwh: 8,
  roundTripEfficiency: 0.9,
  capexEurPerKwh: 500,
  maxCyclesPerYear: 400,
  lifetimeYears: 15,
} as const;

export function quartierPvKwp(): number {
  return QUARTIER.households * QUARTIER.pvShare * QUARTIER.pvKwpEach;
}

function scaleToAnnual(samples: number[], annualKwh: number): number[] {
  const rawKwh = samples.reduce((sum, kw) => sum + kw, 0) * 0.25;
  const scale = rawKwh > 0 ? annualKwh / rawKwh : 0;
  return samples.map((kw) => kw * scale);
}

function householdShape(): number[] {
  const samples: number[] = [];
  for (let day = 0; day < 365; day += 1) {
    const weekend = day % 7 >= 5;
    for (let step = 0; step < 96; step += 1) {
      const hour = step / 4;
      let value = 0.42 + 0.35 * Math.exp(-Math.pow((hour - 12) / 5, 2)) + 0.85 * Math.exp(-Math.pow((hour - 19) / 1.6, 2));
      if (weekend) {
        value *= 0.9;
      }
      samples.push(value);
    }
  }
  return scaleToAnnual(samples, QUARTIER.households * QUARTIER.householdKwhEach);
}

function heatPumpShape(): number[] {
  const count = QUARTIER.households * QUARTIER.heatPumpShare;
  const samples: number[] = [];
  for (let day = 0; day < 365; day += 1) {
    const month = Math.min(11, Math.floor(day / 30.4167));
    const winter = month <= 1 || month >= 10;
    const summer = month >= 5 && month <= 7;
    const season = winter ? 1 : summer ? 0.12 : 0.45;
    for (let step = 0; step < 96; step += 1) {
      const hour = step / 4;
      const value = season * (0.55 + 0.45 * Math.exp(-Math.pow((hour - 7) / 2.2, 2)) + 0.35 * Math.exp(-Math.pow((hour - 18) / 3, 2)));
      samples.push(value);
    }
  }
  return scaleToAnnual(samples, count * QUARTIER.heatPumpKwhEach);
}

function wallboxShape(): number[] {
  const count = QUARTIER.households * QUARTIER.wallboxShare;
  const peakKw = count * QUARTIER.wallboxCoincidence * QUARTIER.wallboxKw;
  const samples: number[] = [];
  for (let day = 0; day < 365; day += 1) {
    const weekend = day % 7 >= 5;
    for (let step = 0; step < 96; step += 1) {
      const hour = step / 4;
      const bell = Math.exp(-Math.pow((hour - 18.5) / 0.7, 2));
      samples.push(weekend ? 0 : peakKw * bell);
    }
  }
  const targetKwh = peakKw * QUARTIER.wallboxHoursPerWeekday * (365 * (5 / 7));
  return scaleToAnnual(samples, targetKwh);
}

export function quartierProfile(): LoadProfile {
  const household = householdShape();
  const heat = heatPumpShape();
  const wallbox = wallboxShape();
  const samplesKw = household.map((kw, index) => kw + (heat[index] ?? 0) + (wallbox[index] ?? 0));
  return {
    samplesKw,
    intervalMinutes: 15,
    synthetic: true,
    label: QUARTIER.labelDe,
    sourceNote: QUARTIER.sourceNote,
    rowCount: samplesKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
}

export function planQuartier(): SitePlan {
  const example = QUARTIER;
  return planSite({
    profile: quartierProfile(),
    pvEnabled: true,
    pvKwp: quartierPvKwp(),
    pvOrientation: "south",
    limitKw: example.transformerKw,
    voltage: example.voltage,
    operation: example.operation,
    transformerRatingKw: example.transformerKw,
    demandChargeEurPerKwYear: example.demandChargeEurPerKwYear,
    energyPriceCtPerKwh: example.energyPriceCtPerKwh,
    feedInCtPerKwh: example.feedInCtPerKwh,
    dynamicTariff: example.dynamicTariff,
    autoSize: false,
    manualPowerKw: example.powerKw,
    manualEnergyKwh: example.energyKwh,
    roundTripEfficiency: example.roundTripEfficiency,
    capexEurPerKwh: example.capexEurPerKwh,
    maxCyclesPerYear: example.maxCyclesPerYear,
    lifetimeYears: example.lifetimeYears,
    discountRate: 0,
  });
}
