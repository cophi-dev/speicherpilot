import { formatDeEur, formatDeGwh } from "@/lib/displayUnitFormat";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  auffaelligkeitWocheRelPath,
  type AuffaelligkeitWocheTag,
} from "@/lib/auffaelligkeitWoche";
import type { NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import { loadAuffaelligkeitWocheTag } from "@/lib/auffaelligkeitWoche.server";

export const TAG_FAHRWEISEN_ERLOESE_STRATEGIES: NationalFleetStrategyUi[] = [
  "spitze",
  "markt",
  "ueberschuss",
];

export const TAG_WOCHE_REVENUE_FIELD = "fahrweisen.{spitze|markt|ueberschuss}.erloesEur";

export type TagFahrweiseErloesRow = {
  strategy: NationalFleetStrategyUi;
  labelDe: string;
  revenueEur: number | null;
  sourceFieldPath: string;
  chargeGwh: number | null;
  dischargeGwh: number | null;
  /** Geladen minus entladen (GWh), nur wenn beide Werte vorliegen. */
  throughputLossGwh: number | null;
};

export type TagFahrweisenErloeseView = {
  dayKey: string;
  isolatedDayHorizon: boolean;
  sourcePath: string | null;
  revenueField: typeof TAG_WOCHE_REVENUE_FIELD;
  rows: TagFahrweiseErloesRow[];
  peakMinusMarketEur: number | null;
  peakMinusMarketPct: number | null;
  grenzeDe: string | null;
  missingFieldPaths: string[];
};

export function dayAheadRevenueSourcePath(dayKey: string): string {
  return auffaelligkeitWocheRelPath(dayKey);
}

export function peakMinusMarketPct(peakEur: number, marketEur: number): number | null {
  if (!Number.isFinite(peakEur) || !Number.isFinite(marketEur) || marketEur === 0) {
    return null;
  }
  return ((peakEur - marketEur) / Math.abs(marketEur)) * 100;
}

function rowFromWoche(
  dayKey: string,
  strategy: NationalFleetStrategyUi,
  doc: AuffaelligkeitWocheTag | null,
): TagFahrweiseErloesRow {
  const labelDe = strategy === "spitze" ? "Spitze" : strategy === "markt" ? "Markt" : "Überschuss";
  const sourceFieldPath = `${dayAheadRevenueSourcePath(dayKey)} · fahrweisen.${strategy}.erloesEur`;
  if (!doc) {
    return {
      strategy,
      labelDe,
      revenueEur: null,
      sourceFieldPath,
      chargeGwh: null,
      dischargeGwh: null,
      throughputLossGwh: null,
    };
  }
  const fw = doc.fahrweisen[strategy];
  const chargeGwh = fw.geladenMwh / 1000;
  const dischargeGwh = fw.entladenMwh / 1000;
  return {
    strategy,
    labelDe,
    revenueEur: fw.erloesEur,
    sourceFieldPath,
    chargeGwh,
    dischargeGwh,
    throughputLossGwh: fw.roundTripVerlustMwh / 1000,
  };
}

export function loadTagFahrweisenErloese(dayKey: string): TagFahrweisenErloeseView {
  const doc = loadAuffaelligkeitWocheTag(dayKey);
  const rows = TAG_FAHRWEISEN_ERLOESE_STRATEGIES.map((strategy) => rowFromWoche(dayKey, strategy, doc));
  const peak = rows.find((r) => r.strategy === "spitze")?.revenueEur ?? null;
  const market = rows.find((r) => r.strategy === "markt")?.revenueEur ?? null;
  const peakMinusMarketEur =
    doc != null
      ? doc.vergleich.spitzeMinusMarktEur
      : peak != null && market != null
        ? peak - market
        : null;
  const peakMinusMarketPctValue =
    doc != null
      ? doc.vergleich.spitzeMinusMarktProzent
      : peak != null && market != null
        ? peakMinusMarketPct(peak, market)
        : null;
  return {
    dayKey,
    isolatedDayHorizon: doc != null,
    sourcePath: doc != null ? dayAheadRevenueSourcePath(dayKey) : null,
    revenueField: TAG_WOCHE_REVENUE_FIELD,
    rows,
    peakMinusMarketEur,
    peakMinusMarketPct: peakMinusMarketPctValue,
    grenzeDe: doc?.vergleich.grenzeDe ?? null,
    missingFieldPaths: doc == null ? [dayAheadRevenueSourcePath(dayKey)] : [],
  };
}

export function formatTagRevenueEur(value: number): string {
  return formatDeEur(value, Math.abs(value) < 100 ? 2 : 0);
}

export function formatTagRevenueDelta(view: TagFahrweisenErloeseView): string | null {
  if (view.peakMinusMarketEur == null) {
    return null;
  }
  const eur = formatTagRevenueEur(view.peakMinusMarketEur);
  if (view.peakMinusMarketPct == null) {
    return eur;
  }
  const absPct = formatQuantity(Math.abs(view.peakMinusMarketPct), "de", 1);
  const vergleich =
    view.peakMinusMarketPct < -0.05
      ? `Erlös ${absPct}\u00a0% unter Markt`
      : view.peakMinusMarketPct > 0.05
        ? `Erlös ${absPct}\u00a0% über Markt`
        : `Erlös etwa wie Markt`;
  return `${eur} (${vergleich})`;
}

export function formatThroughputLine(row: TagFahrweiseErloesRow): string {
  if (row.chargeGwh == null || row.dischargeGwh == null) {
    return "Durchsatz steht aus";
  }
  const loaded = formatDeGwh(row.chargeGwh, 2);
  const unloaded = formatDeGwh(row.dischargeGwh, 2);
  if (row.throughputLossGwh == null) {
    return `geladen ${loaded} / entladen ${unloaded}`;
  }
  return `geladen ${loaded} / entladen ${unloaded}, Round-Trip-Verlust ${formatDeGwh(row.throughputLossGwh, 2)}`;
}

export function missingRevenueHint(view: TagFahrweisenErloeseView): string {
  if (view.missingFieldPaths.length === 0) {
    return "";
  }
  const paths = view.missingFieldPaths.join(", ");
  return `Day-Ahead-Erlös fehlt. Speicherpilot muss die Datei ${paths} (Schema auffaelligkeit-woche/1) mit ${view.revenueField} liefern. Keine selbst gerechneten Euro.`;
}

/** Leseransicht: keine internen Pfade oder Schema-Namen. */
export function readerMissingRevenueHint(view: TagFahrweisenErloeseView): string {
  if (view.missingFieldPaths.length === 0) {
    return "";
  }
  return "Erlöse für diesen Tag folgen.";
}
