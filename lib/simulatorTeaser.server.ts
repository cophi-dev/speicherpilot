import { compromisePct } from "@/lib/simulatorFahrweisenDerived";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";

/** Kernzahl ε-70 aus den Simulator-Daten, für Teaser und SEO. */
export function loadEps70Teaser() {
  const data = loadSimulatorFahrweisen();
  const k = compromisePct(data.endpoints.marketLex.revenueMioEur, data.endpoints.eps70.revenueMioEur);
  return {
    costLabel: k.costLabel,
    keepLabel: k.keepLabel,
    costPctText: `${k.costLabel}\u00A0%`,
  };
}
