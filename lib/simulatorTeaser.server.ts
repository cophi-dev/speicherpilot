import { formatQuantity } from "@/lib/formatQuantity";
import { compromisePct } from "@/lib/simulatorFahrweisenDerived";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";
import type { Eps70TeaserUi } from "@/lib/simulatorTeaser.types";

/** Kernzahl ε-70 aus den Simulator-Daten, für Teaser und SEO. */
export function loadEps70Teaser(): Eps70TeaserUi {
  const data = loadSimulatorFahrweisen();
  const k = compromisePct(data.endpoints.marketLex.revenueMioEur, data.endpoints.eps70.revenueMioEur);
  const priceGw = formatQuantity(data.endpoints.marketLex.reductionGw, "de", 2);
  const peakGw = formatQuantity(data.endpoints.netzLex.reductionGw, "de", 2);
  return {
    costLabel: k.costLabel,
    keepLabel: k.keepLabel,
    costPctText: `${k.costLabel}\u00A0%`,
    priceReductionGw: priceGw,
    peakReductionGw: peakGw,
    headlineDe: `Doppelte Flotte im Oktober: nach Preis ${priceGw} GW weniger Spitze, mit Rücksicht auf die Spitze ${peakGw} GW.`,
    sublineDe: `Dafür ${k.costLabel}\u00A0% weniger Day-Ahead-Erlös. Modell, national, ohne Netzengpass.`,
  };
}
