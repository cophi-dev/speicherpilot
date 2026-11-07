import { SURPLUS_DAY_GWH } from "@/lib/powerMix";
import { formatQuantity } from "@/lib/formatQuantity";

/** Panel GWh display: null → —, exact 0 → 0,0, tiny positive surplus → <0,05 when band enabled. */
export function formatPanelGwh(value: number | null | undefined, opts?: { surplusBand?: boolean }): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (value === 0) {
    return "0,0";
  }
  if (opts?.surplusBand && value > 0 && value < SURPLUS_DAY_GWH) {
    return "<0,05";
  }
  return formatQuantity(value, "de", 1);
}
