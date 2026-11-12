import { formatQuantity } from "@/lib/formatQuantity";

const NBSP = "\u00a0";
const MINUS = "\u2212";

export const MONAT_V1_GRAPH_CAPTION = "national, kein Netzengpass, Vollvoraussicht · Modell";

export function formatGwAbs(valueGw: number, decimals = 1): string {
  return `${formatQuantity(valueGw, "de", decimals)}${NBSP}GW`;
}

export function formatGwReduction(valueGw: number, decimals = 2): string {
  const t = formatQuantity(valueGw, "de", decimals);
  return `${MINUS}${t}${NBSP}GW`;
}

export function formatMioEurModell(valueMio: number): string {
  return `${formatQuantity(valueMio, "de", 1)}${NBSP}Mio\u00a0€ Modellschätzung`;
}

export function formatPercentShare(pct: number): string {
  return `${formatQuantity(pct, "de", 0)} %`;
}
