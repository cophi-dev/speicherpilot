import { defaultEconomicsAssumptions, type EconomicsAssumptions } from "@/lib/bessEconomics";

/**
 * Deterministic copy for the public annual-perspective block.
 * Numbers come from the existing recommendation and `computeEconomics` throughput
 * model. Nothing here is produced by an LLM.
 */

export type AnnualPerspectiveInput = {
  language: "de" | "en";
  recommendedEnergyMwh: number;
  recommendedPowerMw: number;
  absorbedSurplusShare: number | null;
  servedDeficitShare: number | null;
  annualRevenueEur: number | null;
  paybackYears: number | null;
  /** Round-trip efficiency percent used when the economics figure was computed. */
  roundTripEfficiencyPct: number;
  assumptions?: EconomicsAssumptions;
};

export type AnnualPerspectiveCopy = {
  title: string;
  badge: string;
  sizeLabel: string;
  sizeValue: string;
  sizeDetail: string;
  coverageLabel: string;
  coverageValue: string;
  economicsLabel: string;
  economicsValue: string;
  assumptionsTitle: string;
  assumptions: string[];
};

const numberFormat = (language: "de" | "en", maxFractionDigits: number) =>
  new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });

const formatGwh = (language: "de" | "en", mwh: number) =>
  `${numberFormat(language, 2).format(mwh / 1_000)} GWh`;

const formatGw = (language: "de" | "en", mw: number) =>
  `${numberFormat(language, 2).format(mw / 1_000)} GW`;

const formatPct = (language: "de" | "en", ratio: number) =>
  `${numberFormat(language, 0).format(ratio * 100)} %`;

const formatEur = (language: "de" | "en", value: number) =>
  new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const formatYears = (language: "de" | "en", years: number) => {
  const formatted = numberFormat(language, 1).format(years);
  return language === "de" ? `${formatted} Jahre` : `${formatted} years`;
};

export function buildAnnualPerspectiveCopy(input: AnnualPerspectiveInput): AnnualPerspectiveCopy {
  const language = input.language;
  const assumptions = input.assumptions ?? defaultEconomicsAssumptions;
  const de = language === "de";

  const coverageValue =
    input.absorbedSurplusShare !== null && input.servedDeficitShare !== null
      ? de
        ? `${formatPct(language, input.absorbedSurplusShare)} Ladechance · ${formatPct(language, input.servedDeficitShare)} Defizit`
        : `${formatPct(language, input.absorbedSurplusShare)} charge opportunity · ${formatPct(language, input.servedDeficitShare)} deficit`
      : de
        ? "nicht verfügbar"
        : "not available";

  const economicsParts: string[] = [];
  if (input.annualRevenueEur !== null && Number.isFinite(input.annualRevenueEur)) {
    economicsParts.push(formatEur(language, input.annualRevenueEur));
  }
  if (input.paybackYears !== null && Number.isFinite(input.paybackYears) && input.paybackYears > 0) {
    economicsParts.push(
      de
        ? `Modell-Amortisation ${formatYears(language, input.paybackYears)}`
        : `model payback ${formatYears(language, input.paybackYears)}`
    );
  }

  const capex = numberFormat(language, 0).format(assumptions.capexEurPerMwh);
  const spread = numberFormat(language, 0).format(assumptions.averagePriceSpreadEurPerMwh);
  const cycles = numberFormat(language, 2).format(assumptions.fullCycleEquivalentsPerDay);
  const rte = numberFormat(language, 1).format(input.roundTripEfficiencyPct);
  const opexPct = numberFormat(language, 1).format(assumptions.annualOpexRateOfCapex * 100);

  return {
    title: de ? "Jahresperspektive" : "Annual perspective",
    badge: de ? "Modellschätzung · keine Prognose" : "Model estimate · not a forecast",
    sizeLabel: de ? "Balanced-Größe (P90)" : "Balanced size (P90)",
    sizeValue: `${formatGwh(language, input.recommendedEnergyMwh)} · ${formatGw(language, input.recommendedPowerMw)}`,
    sizeDetail: de
      ? "P90 der modellierten Kalendertage aus der Energy-Charts-Serie Erzeugung − Last. Kein Ein-Tages-Peak und keine Ausbauempfehlung."
      : "P90 across modeled calendar days from the Energy-Charts generation − load series. Not a single-day peak and not a build recommendation.",
    coverageLabel: de ? "Modellierte Abdeckung" : "Modeled coverage",
    coverageValue,
    economicsLabel: de ? "Durchsatzmodell" : "Throughput model",
    economicsValue:
      economicsParts.length > 0 ? economicsParts.join(" · ") : de ? "nicht berechnet" : "not computed",
    assumptionsTitle: de ? "Annahmen dieser Schätzung" : "Assumptions behind this estimate",
    assumptions: de
      ? [
          `Jahreserlös = Nennenergie × ${cycles} Vollzyklus/Tag × 365 × ${rte} % RTE × ${spread} €/MWh (vereinfachtes Durchsatzmodell, nicht Dispatch-Erlös).`,
          `CAPEX ${capex} €/MWh, OPEX ${opexPct} % von CAPEX/Jahr. Amortisation = CAPEX / (Jahreserlös − OPEX), nur wenn der Cashflow positiv ist.`,
          "Der Betrag skaliert mit der nationalen P90-Größe. Er ist keine Projekt- oder Vertragszahl.",
        ]
      : [
          `Annual revenue = nameplate energy × ${cycles} full cycle/day × 365 × ${rte}% RTE × ${spread} €/MWh (simplified throughput model, not dispatch revenue).`,
          `CAPEX ${capex} €/MWh, OPEX ${opexPct}% of CAPEX per year. Payback = CAPEX / (annual revenue − OPEX) when cashflow is positive.`,
          "The figure scales with the national P90 size. It is not a project quote or a contract value.",
        ],
  };
}
