import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  monthStatsForRun,
  type NationalFleetMonthBundle,
} from "@/lib/nationalMonthFleetModel";

/** Dieselbe ×2-Zeile wie /monat (Konvention a: heutige Flotte + eine weitere). */
export const METHODIK_DREI_ZIELE_FACTOR = 2 as const;

export type DreiZieleX2Werte = {
  marktChargeGwh: number;
  spitzeChargeGwh: number;
  marktReductionGw: number;
};

export function formatModellFlotteKurz(language: "de" | "en" = "de"): string {
  const gw = formatQuantity(NATIONAL_BASE_FLEET.powerMw / 1000, language, 2);
  const gwh = formatQuantity(NATIONAL_BASE_FLEET.energyMwh / 1000, language, 2);
  return `${gw} GW / ${gwh} GWh`;
}

export function dreiZieleX2Werte(bundle: NationalFleetMonthBundle): DreiZieleX2Werte {
  const spitze = monthStatsForRun(bundle, METHODIK_DREI_ZIELE_FACTOR, "spitze");
  const markt = monthStatsForRun(bundle, METHODIK_DREI_ZIELE_FACTOR, "markt");
  return {
    marktChargeGwh: markt.chargeGwh,
    spitzeChargeGwh: spitze.chargeGwh,
    marktReductionGw: markt.peakReductionGw,
  };
}

export function formatDreiZieleGegenrechnungDe(werte: DreiZieleX2Werte): string {
  const markt = formatQuantity(werte.marktChargeGwh, "de", 2);
  const spitze = formatQuantity(werte.spitzeChargeGwh, "de", 2);
  const senkung = formatQuantity(werte.marktReductionGw, "de", 2);
  return `Gegenrechnung, heutige Flotte + eine weitere (×2): Markt ${markt} GWh, Spitze ${spitze} GWh, Senkung Markt ${senkung} GW.`;
}

export function dreiZieleMethodikBullets(bundle: NationalFleetMonthBundle): string[] {
  return [
    "Formel: Oktober-Lauf ×2 (heutige Flotte + eine weitere); Markt-Ladung > 5 × Spitze-Ladung und Markt-Spitzenreduktion < 1 GW.",
    "Daten: fleet-month-meta.json, Strategien Differenz / Spitze / Markt.",
    `Quelle: Vorberechneter Monatslauf ${formatModellFlotteKurz("de")}.`,
    formatDreiZieleGegenrechnungDe(dreiZieleX2Werte(bundle)),
    "Grenzfall: Chart zeigt alle Faktoren; Regel-Satz nur bei ×2 (heutige Flotte + eine weitere).",
  ];
}
