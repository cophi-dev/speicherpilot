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
    return (
      "Wind und Sonne liegen an diesem Tag in keiner Viertelstunde über der Last — die Tagesenergiebilanz kann trotzdem Unterschiede zwischen Mittag und Abend haben."
    );
  }
  const quote = formatQuantity(d.energyQuotePct, "de", 1);
  const posGwh = formatQuantity(d.positiveSurplusGwh, "de", 1);
  const peak =
    d.middayPeakSurplusMw !== null && d.middayPeakAt
      ? ` Um ${d.middayPeakAt} Uhr lag ein Überhang von ${formatQuantity(d.middayPeakSurplusMw, "de", 1)} MW (Wind+Sonne minus Last).`
      : "";
  return (
    `Tagesenergie Wind+Sonne zu Last: ${quote} % — das ist ein Tagesschnitt, kein „kein Überschuss“-Ausschluss. ` +
    `${d.positiveQuarterHours} Viertelstunden hatten zusammen ${posGwh} GWh positiven Überschuss (Wind+Sonne minus Last).${peak}`
  );
}
