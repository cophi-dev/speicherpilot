import type { AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import type { OverviewBlick } from "@/lib/overviewRange";

export type OverviewInsight = {
  id: string;
  text: string;
  tag: string | null;
};

function formatDay(dateBerlin: string, language: AppLanguage) {
  const label = `${dateBerlin.slice(8, 10)}.${dateBerlin.slice(5, 7)}.`;
  return label;
}

/** Up to three short highlights for the selected period — page content only, no copy actions. */
export function buildOverviewInsights(
  model: OverviewEvaluation,
  blick: OverviewBlick,
  language: AppLanguage
): OverviewInsight[] {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const insights: OverviewInsight[] = [];
  const rows = model.factors[1]?.dayRows ?? [];

  if (rows.length > 0) {
    const strongest = rows.reduce((best, row) => (row.surplusGwh > best.surplusGwh ? row : best), rows[0]);
    if (strongest.surplusGwh > 0.5) {
      insights.push({
        id: "strong-surplus-day",
        text: tx(
          `Stärkster Überschusstag im Blick: ${formatDay(strongest.dateBerlin, language)} mit ${formatQuantity(strongest.surplusGwh, language, 1)} GWh.`,
          `Strongest surplus day in view: ${formatDay(strongest.dateBerlin, language)} with ${formatQuantity(strongest.surplusGwh, language, 1)} GWh.`
        ),
        tag: strongest.dateBerlin,
      });
    }
  }

  const before = model.factors[1]?.eveningPeakBeforeGw;
  const after = model.factors[1]?.eveningPeakAfterGw;
  if (before !== null && after !== null && before - after > 0.3) {
    insights.push({
      id: "evening-peak",
      text: tx(
        `Abendspitze im Schnitt: ${formatQuantity(before, language, 1)} → ${formatQuantity(after, language, 1)} GW mit heutiger Flotte (×1, Modell).`,
        `Average evening peak: ${formatQuantity(before, language, 1)} → ${formatQuantity(after, language, 1)} GW with today's fleet (×1, model).`
      ),
      tag: blick === "heute" || blick === "gestern" ? model.bounds.endKey : null,
    });
  }

  const saturatedAt = LIVE_DISPATCH_FACTORS.find((step) => model.factors[step]?.saturated) ?? null;
  if (saturatedAt !== null && (model.observed.surplusGwh ?? 0) > 1) {
    insights.push({
      id: "saturation",
      text: tx(
        `Ab ×${saturatedAt} nimmt das Modell den gesamten Überschuss auf — mehr Speicher ändert in diesem Zeitraum nichts mehr.`,
        `From ×${saturatedAt} the model absorbs all surplus — more storage would not change this period further.`
      ),
      tag: null,
    });
  }

  const netImport = model.observed.netImportGwh;
  if (insights.length < 3 && netImport !== null && Math.abs(netImport) > 20 && blick !== "heute") {
    insights.push({
      id: "trade",
      text:
        netImport >= 0
          ? tx(
              `Netto ${formatQuantity(Math.abs(netImport), language, 0)} GWh eingekauft — Handel und Überschuss sind getrennte Größen.`,
              `Net ${formatQuantity(Math.abs(netImport), language, 0)} GWh imported — trade and surplus are separate figures.`
            )
          : tx(
              `Netto ${formatQuantity(Math.abs(netImport), language, 0)} GWh verkauft — Handel und Überschuss sind getrennte Größen.`,
              `Net ${formatQuantity(Math.abs(netImport), language, 0)} GWh exported — trade and surplus are separate figures.`
            ),
      tag: null,
    });
  }

  return insights.slice(0, 3);
}
