import { formatQuantity } from "@/lib/formatQuantity";

/** GWh-Anzeige in Miniplots: ab 1.000 GWh in TWh (eine Nachkommastelle). */
export function formatMobileChargeLabel(chargeGwh: number): string {
  if (chargeGwh >= 1000) {
    return `${formatQuantity(chargeGwh / 1000, "de", 1)} TWh`;
  }
  return `${formatQuantity(chargeGwh, "de", chargeGwh >= 100 ? 0 : 1)} GWh`;
}
