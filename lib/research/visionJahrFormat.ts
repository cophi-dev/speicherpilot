import { DISPLAY_NBSP, formatDeDurationH } from "@/lib/displayUnitFormat";
import { GW_MINUS } from "@/lib/research/fleetBasis";

const NBSP = DISPLAY_NBSP;

/** Anzeige wie im Konzept: eine Nachkommastelle, deutsches Komma. */
export function formatVisionGwOne(gw: number): string {
  return formatVisionNumberFixed(gw, 1);
}

export function formatVisionNumberFixed(value: number, decimals: number): string {
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  return rounded.toFixed(decimals).replace(".", ",");
}

export function formatVisionGwhOne(gwh: number, decimals = 1): string {
  return formatVisionNumberFixed(gwh, decimals);
}

export function formatVisionGwMinus(gw: number): string {
  return `${GW_MINUS}${formatVisionGwOne(gw)}${NBSP}GW`;
}

export function formatVisionGwPlain(gw: number): string {
  return `${formatVisionGwOne(gw)}${NBSP}GW`;
}

export function formatVisionGwWithUnit(gw: number): string {
  return formatVisionGwPlain(gw);
}

export function formatVisionGwhPlain(gwh: number, decimals = 1): string {
  return `${formatVisionGwhOne(gwh, decimals)}${NBSP}GWh`;
}

export function formatVisionBisGw(gw: number): string {
  return `bis ${formatVisionGwOne(gw)}${NBSP}GW`;
}

export function formatVisionPoolHeaderGwh(gwh: number): string {
  return `Pool ${formatVisionGwhOne(gwh)}${NBSP}GWh`;
}

export function formatVisionFleetGwGwhLine(powerGw: number, energyGwh: number, tail?: string): string {
  const head = `${formatVisionNumberFixed(powerGw, 2)}${NBSP}GW / ${formatVisionGwhOne(energyGwh, 2)}${NBSP}GWh`;
  return tail ? `${head}, ${tail}` : head;
}

export function formatVisionDurationDe(label: "1,76" | "2" | "4" | string): string {
  return formatDeDurationH(label);
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