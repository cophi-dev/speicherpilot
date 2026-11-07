import { formatQuantity } from "@/lib/formatQuantity";
import { weekdayLabelDe } from "@/lib/auffaelligkeit";

export function lastSurplusBefore(
  records: { dateKey: string; surplusGwh: number }[],
  beforeKey: string
): string | null {
  const idx = records.findIndex((r) => r.dateKey === beforeKey);
  if (idx <= 0) {
    return null;
  }
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (records[i].surplusGwh >= 0.05) {
      return records[i].dateKey;
    }
  }
  return null;
}

export function tagSurplusLine(surplusGwh: number): string {
  return surplusGwh >= 0.05
    ? `${formatQuantity(surplusGwh, "de", 1)} GWh Tages-Überschuss (Wind+Sonne minus Last, integriert).`
    : "Unter 0,05 GWh Tages-Überschuss — kein vollständiges Speicher-Nutzenbild.";
}

export function tagLastSurplusLine(lastSurplusKey: string | null): string | null {
  return lastSurplusKey ? `Zuletzt: ${weekdayLabelDe(lastSurplusKey)} war Strom übrig.` : null;
}
