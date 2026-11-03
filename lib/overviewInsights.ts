import { formatQuantity } from "@/lib/formatQuantity";
import type { AppLanguage } from "@/components/language-context";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import type { OverviewBlick } from "@/lib/overviewRange";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";

export type OverviewHighlight = {
  label: string;
  tag: string;
};

function formatDay(dateBerlin: string) {
  return `${dateBerlin.slice(8, 10)}.${dateBerlin.slice(5, 7)}.`;
}

/** One short link line under the chart — strongest surplus day in the period. */
export function pickOverviewHighlight(
  model: OverviewEvaluation,
  language: AppLanguage
): OverviewHighlight | null {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const rows = model.factors[1]?.dayRows ?? [];
  if (rows.length === 0) {
    return null;
  }
  const strongest = rows.reduce((best, row) => (row.surplusGwh > best.surplusGwh ? row : best), rows[0]);
  if (strongest.surplusGwh <= 0.5) {
    return null;
  }
  const saturatedAt = LIVE_DISPATCH_FACTORS.find((step) => model.factors[step]?.saturated) ?? null;
  const satHint =
    saturatedAt !== null
      ? tx(`, ab ×${saturatedAt} nimmt das Modell den gesamten Überschuss auf`, `, from ×${saturatedAt} the model absorbs all surplus`)
      : "";
  return {
    tag: strongest.dateBerlin,
    label: tx(
      `Stärkster Überschusstag: ${formatDay(strongest.dateBerlin)} · ${formatQuantity(strongest.surplusGwh, language, 1)} GWh${satHint} → Tag ansehen`,
      `Strongest surplus day: ${formatDay(strongest.dateBerlin)} · ${formatQuantity(strongest.surplusGwh, language, 1)} GWh${satHint} → view day`
    ),
  };
}

/** @deprecated use pickOverviewHighlight */
export function buildOverviewInsights(model: OverviewEvaluation, _blick: OverviewBlick, language: AppLanguage) {
  const hit = pickOverviewHighlight(model, language);
  return hit ? [{ id: "strong-surplus-day", text: hit.label, tag: hit.tag }] : [];
}
