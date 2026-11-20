import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";
import { compromisePct, fullReduction } from "@/lib/simulatorFahrweisenDerived";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";
import type { Eps70TeaserUi } from "@/lib/simulatorTeaser.types";

/** Kernzahl ε-70 aus den Simulator-Daten, für Teaser und SEO. */
export function loadEps70Teaser(): Eps70TeaserUi {
  const data = loadSimulatorFahrweisen();
  const mkt = data.endpoints.marketLex;
  const net = data.endpoints.netzLex;
  const k = compromisePct(mkt.revenueMioEur, data.endpoints.eps70.revenueMioEur);
  const voll = fullReduction(mkt.revenueMioEur, net.revenueMioEur);
  const priceGw = formatQuantity(data.endpoints.marketLex.reductionGw, "de", 2);
  const peakGw = formatQuantity(data.endpoints.netzLex.reductionGw, "de", 2);
  const priceGwEn = formatQuantity(data.endpoints.marketLex.reductionGw, "en", 2);
  const peakGwEn = formatQuantity(data.endpoints.netzLex.reductionGw, "en", 2);
  const fullPeakEn = formatQuantity(net.reductionGw, "en", 2);
  return {
    costLabel: k.costLabel,
    keepLabel: k.keepLabel,
    costPctText: `${k.costLabel}\u00A0%`,
    priceReductionGw: priceGw,
    peakReductionGw: peakGw,
    periodDe: "Oktober 2026",
    periodEn: "October 2026",
    eyebrowDe: "Kompromiss · Fahrweisen · Oktober 2026",
    eyebrowEn: "Compromise · Strategies · October 2026",
    headlineDe: insertDisplayUnitNbsp(
      `Doppelte Flotte im Oktober 2026: nach Preis ${formatQuantityUnit(data.endpoints.marketLex.reductionGw, "de", 2, "GW")} weniger Spitze, mit Rücksicht auf die Spitze ${formatQuantityUnit(data.endpoints.netzLex.reductionGw, "de", 2, "GW")}.`,
    ),
    headlineEn: insertDisplayUnitNbsp(
      `Double the fleet in October 2026: by price ${formatQuantityUnit(data.endpoints.marketLex.reductionGw, "en", 2, "GW")} less peak, peak-aware ${formatQuantityUnit(data.endpoints.netzLex.reductionGw, "en", 2, "GW")}.`,
    ),
    sublineDe: insertDisplayUnitNbsp(
      `Dafür sinkt der Day-Ahead-Erlös (Modell, perfekte Voraussicht) um ${k.costLabel}\u00a0%. Die volle Senkung (${formatQuantityUnit(net.reductionGw, "de", 2, "GW")}) kostet ${voll.pctLabel}\u00a0%.`,
    ),
    sublineEn: insertDisplayUnitNbsp(
      `Day-ahead revenue falls by ${k.costLabel}\u00a0%. Full peak reduction (${formatQuantityUnit(net.reductionGw, "en", 2, "GW")}) costs ${voll.pctLabel}\u00a0%.`,
    ),
  };
}
