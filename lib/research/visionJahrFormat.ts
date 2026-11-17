import { GW_MINUS } from "@/lib/research/fleetBasis";

/** Anzeige wie im Konzept: eine Nachkommastelle, deutsches Komma. */
export function formatVisionGwOne(gw: number): string {
  const rounded = Math.round(gw * 10) / 10;
  return rounded.toFixed(1).replace(".", ",");
}

export function formatVisionGwMinus(gw: number): string {
  return `${GW_MINUS}${formatVisionGwOne(gw)}\u00a0GW`;
}

export function formatVisionGwPlain(gw: number): string {
  return `${formatVisionGwOne(gw)}\u00a0GW`;
}

export function formatVisionPercentWhole(pct: number): string {
  return `${Math.round(pct)}\u00A0%`;
}

export function formatVisionGwhThousands(gwh: number): string {
  const rounded = Math.round(gwh);
  return rounded.toLocaleString("de-DE");
}

/** ISO-Datum → 03.12.2025 */
export function formatVisionGermanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function formatVisionGwWithUnit(gw: number): string {
  return `${formatVisionGwOne(gw)}\u00A0GW`;
}