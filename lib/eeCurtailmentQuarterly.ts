import type { AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";

/** SMARD/BNetzA article on Q2 2026 EE redispatch volumes (published 12 Oct 2026). */
export const SMARD_QUARTERLY_TOPIC_URL =
  "https://www.smard.de/page/home/topic-article/444/221652/volumen-gesunken-kosten-leicht-gestiegen";

/** EE redispatch Germany, Q2 2026 (GWh). */
export const EE_CURTAILMENT_Q2_2026_GWH = 2102;

export function formatQuarterlyCurtailmentGwh(language: AppLanguage): string {
  return `${formatQuantity(EE_CURTAILMENT_Q2_2026_GWH, language, 0)}\u00a0GWh`;
}

export function formatSignedDeltaGwh(value: number, language: AppLanguage, digits = 2): string {
  const magnitude = formatQuantity(Math.abs(value), language, digits);
  if (value < 0) {
    return `−${magnitude}`;
  }
  if (value > 0) {
    return `+${magnitude}`;
  }
  return magnitude;
}
