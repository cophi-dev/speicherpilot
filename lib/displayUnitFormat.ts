import { formatQuantity } from "@/lib/formatQuantity";

/** Geschütztes Leerzeichen zwischen Zahl und Einheit (U+00A0). */
export const DISPLAY_NBSP = "\u00a0";

export function withDisplayUnit(numberPart: string, unit: string): string {
  return `${numberPart}${DISPLAY_NBSP}${unit}`;
}

export function formatDeQuantityUnit(value: number, decimals: number, unit: string): string {
  return withDisplayUnit(formatQuantity(value, "de", decimals), unit);
}

export function formatDeGw(value: number, decimals = 1): string {
  return formatDeQuantityUnit(value, decimals, "GW");
}

export function formatDeGwh(value: number, decimals = 1): string {
  return formatDeQuantityUnit(value, decimals, "GWh");
}

export function formatDePercentInt(pct: number): string {
  return withDisplayUnit(formatQuantity(pct, "de", 0), "%");
}

export function formatDeGwGwhLine(
  powerGw: number,
  energyGwh: number,
  powerDecimals = 2,
  energyDecimals = 2,
): string {
  return `${formatDeGw(powerGw, powerDecimals)} / ${formatDeGwh(energyGwh, energyDecimals)}`;
}

/** Dauer-Label mit NBSP vor „h“ (1,76 h, 4 h). */
export function formatDeDurationH(label: "1,76" | "2" | "4" | string): string {
  if (label === "1,76") return `1,76${DISPLAY_NBSP}h`;
  if (label === "2") return `2${DISPLAY_NBSP}h`;
  if (label === "4") return `4${DISPLAY_NBSP}h`;
  if (label.endsWith(" h")) {
    return `${label.replace(/ h$/, "")}${DISPLAY_NBSP}h`;
  }
  return label;
}