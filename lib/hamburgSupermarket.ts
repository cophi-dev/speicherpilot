import { planSite, type LoadProfile, type SitePlan } from "@/lib/sitePlanner";

/**
 * Fictional neighbourhood supermarket. The shape is synthetic.
 * Inputs are chosen so the existing dispatch, with rooftop PV and
 * grid-serving operation, holds the import peak on the connection limit.
 * Market dispatch is not used here: its precharge stops 0.25 kWh early
 * and leaves about 1 kW over the same limit.
 */
export const HAMBURG_SUPERMARKET = {
  labelDe: "Beispiel: Supermarkt in Hamburg",
  labelEn: "Example: supermarket in Hamburg",
  sourceNote: "BEISPIELDATEN · fiktives Profil, nicht gemessen",
  nightKw: 16,
  dayKw: 28,
  peakBumpKw: 90,
  peakHour: 17.5,
  peakWidthHours: 1.15,
  limitKw: 90,
  pvKwp: 120,
  powerKw: 40,
  energyKwh: 40,
  voltage: "NS" as const,
  operation: "grid-serving" as const,
  dynamicTariff: false,
  demandChargeEurPerKwYear: 120,
  energyPriceCtPerKwh: 21.4,
  feedInCtPerKwh: 8,
  roundTripEfficiency: 0.85,
  capexEurPerKwh: 500,
  maxCyclesPerYear: 400,
  lifetimeYears: 15,
};

export function hamburgSupermarketProfile(): LoadProfile {
  const samplesKw: number[] = [];
  for (let day = 0; day < 365; day += 1) {
    const month = Math.min(11, Math.floor((day % 365) / 30.4167));
    const weekend = day % 7 >= 5;
    const winter = month <= 1 || month >= 10;
    const summer = month >= 5 && month <= 7;
    for (let step = 0; step < 96; step += 1) {
      const hour = step / 4;
      let value =
        HAMBURG_SUPERMARKET.nightKw +
        (HAMBURG_SUPERMARKET.dayKw - HAMBURG_SUPERMARKET.nightKw) *
          Math.exp(-Math.pow((hour - 13) / 6, 2)) +
        HAMBURG_SUPERMARKET.peakBumpKw *
          Math.exp(-Math.pow((hour - HAMBURG_SUPERMARKET.peakHour) / HAMBURG_SUPERMARKET.peakWidthHours, 2));
      if (weekend) {
        value *= 0.72;
      }
      if (winter) {
        value *= 1.06;
      } else if (summer) {
        value *= 0.94;
      }
      samplesKw.push(Math.max(8, value));
    }
  }
  return {
    samplesKw,
    intervalMinutes: 15,
    synthetic: true,
    label: HAMBURG_SUPERMARKET.labelDe,
    sourceNote: HAMBURG_SUPERMARKET.sourceNote,
    rowCount: samplesKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
}

export function planHamburgSupermarket(): SitePlan {
  const example = HAMBURG_SUPERMARKET;
  return planSite({
    profile: hamburgSupermarketProfile(),
    pvEnabled: true,
    pvKwp: example.pvKwp,
    pvOrientation: "south",
    limitKw: example.limitKw,
    voltage: example.voltage,
    operation: example.operation,
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
