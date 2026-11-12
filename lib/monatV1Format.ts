import { formatQuantity } from "@/lib/formatQuantity";

const NBSP = "\u00a0";
const MINUS = "\u2212";

export const MONAT_V1_GRAPH_CAPTION = "national, kein Netzengpass, Vollvoraussicht · Modell";

/** Kernantwort 3: ×5·4 h und ×10·1,76 h liegen praktisch gleich (14,07 vs. 13,98 GW). */
export const MONAT_V1_KERN3 =
  "×5 mit 4 h senkt die Spitze genauso stark wie ×10 mit 1,76 h – mit halb so viel Leistung";

export function formatGwAbs(valueGw: number, decimals = 1): string {
  return `${formatQuantity(valueGw, "de", decimals)}${NBSP}GW`;
}

/** Spitzensenkung, mit Minus. Gerundete Null ohne Vorzeichen — nie „−0,00“. */
export function formatGwReduction(valueGw: number, decimals = 2): string {
  const rounded = Number.parseFloat(Math.abs(valueGw).toFixed(decimals));
  if (rounded === 0) {
    return `${formatQuantity(0, "de", decimals)}${NBSP}GW`;
  }
  return `${MINUS}${formatQuantity(rounded, "de", decimals)}${NBSP}GW`;
}

export function formatMioEurModell(valueMio: number): string {
  return `${formatQuantity(valueMio, "de", 1)}${NBSP}Mio\u00a0€ Modellschätzung`;
}

export function formatPercentShare(pct: number): string {
  return `${formatQuantity(pct, "de", 0)} %`;
}
