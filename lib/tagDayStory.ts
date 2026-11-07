import { formatQuantity } from "@/lib/formatQuantity";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

const DT_MWH_PER_MW = 0.25;

function surplusMw(slot: ResidualSlot): number {
  return slot.windMw + slot.solarMw - slot.loadMw;
}

export type TagDayEnergyDigest = {
  energyQuotePct: number;
  positiveQuarterHours: number;
  positiveSurplusGwh: number;
  middayPeakSurplusMw: number | null;
  middayPeakAt: string | null;
};

export function digestTagDayEnergy(day: ResidualDay): TagDayEnergyDigest {
  let wsMwh = 0;
  let loadMwh = 0;
  let positiveSurplusMwh = 0;
  let positiveQuarterHours = 0;
  let middayPeakSurplusMw: number | null = null;
  let middayPeakAt: string | null = null;

  for (const slot of day.slots) {
    const sur = surplusMw(slot);
    wsMwh += (slot.windMw + slot.solarMw) * DT_MWH_PER_MW;
    loadMwh += slot.loadMw * DT_MWH_PER_MW;
    if (sur > 0.05) {
      positiveQuarterHours += 1;
      positiveSurplusMwh += sur * DT_MWH_PER_MW;
    }
    if (slot.hourBerlin >= 10 && slot.hourBerlin <= 15) {
      if (middayPeakSurplusMw === null || sur > middayPeakSurplusMw) {
        middayPeakSurplusMw = sur;
        middayPeakAt = `${String(slot.hourBerlin).padStart(2, "0")}:${String(slot.minuteBerlin).padStart(2, "0")}`;
      }
    }
  }

  return {
    energyQuotePct: loadMwh > 0 ? (wsMwh / loadMwh) * 100 : 0,
    positiveQuarterHours,
    positiveSurplusGwh: positiveSurplusMwh / 1000,
    middayPeakSurplusMw,
    middayPeakAt,
  };
}

export function tagMiddayStoryBody(day: ResidualDay): string {
  const d = digestTagDayEnergy(day);
  if (d.positiveQuarterHours === 0) {
    return "Wind und Sonne lagen an diesem Tag in keiner Viertelstunde über der Last.";
  }
  const posGwh = formatQuantity(d.positiveSurplusGwh, "de", 1);
  const qh = String(d.positiveQuarterHours);
  const peak =
    d.middayPeakSurplusMw !== null && d.middayPeakAt
      ? ` Am größten war der Überschuss um ${d.middayPeakAt} Uhr mit ${formatQuantity(
          d.middayPeakSurplusMw / 1000,
          "de",
          1,
        )} GW.`
      : "";
  return `Wind und Sonne lagen zeitweise über der Last: ${qh} Viertelstunden mit zusammen ${posGwh} GWh Überschuss.${peak}`;
}
