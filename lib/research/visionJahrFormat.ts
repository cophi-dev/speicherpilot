import { GW_MINUS } from "@/lib/research/fleetBasis";

/** Anzeige wie im Konzept: eine Nachkommastelle, deutsches Komma. */
export function formatVisionGwOne(gw: number): string {
  const rounded = Math.round(gw * 10) / 10;
  return rounded.toFixed(1).replace(".", ",");
}

export function formatVisionGwMinus(gw: number): string {
  return `${GW_MINUS}${formatVisionGwOne(gw)} GW`;
}

export function formatVisionGwPlain(gw: number): string {
  return `${formatVisionGwOne(gw)} GW`;
}

export function formatVisionPercentWhole(pct: number): string {
  return `${Math.round(pct)}\u00A0%`;
}

export function formatVisionGwhThousands(gwh: number): string {
  const rounded = Math.round(gwh);
  return rounded.toLocaleString("de-DE");
}