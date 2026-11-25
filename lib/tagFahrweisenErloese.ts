import { formatDeEur, formatDeGwh, formatDePercentInt } from "@/lib/displayUnitFormat";
import {
  NATIONAL_FLEET_STRATEGY_UI,
  sliceFleetDay,
  type NationalFleetDaySlice,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import {
  loadDayAheadRevenueEur,
  loadNationalFleetRunSeries,
  nationalFleetIsolatedDayAvailable,
  TAG_DAY_AHEAD_REVENUE_FIELD,
} from "@/lib/nationalMonthFleetModel.server";

export const TAG_FAHRWEISEN_ERLOESE_STRATEGIES: NationalFleetStrategyUi[] = [
  "spitze",
  "markt",
  "ueberschuss",
];

export type TagFahrweiseErloesRow = {
  strategy: NationalFleetStrategyUi;
  labelDe: string;
  revenueEur: number | null;
  /** Relativer Pfad der ×1-Tagesdatei, in der dayAheadRevenueEur stehen muss. */
  sourceFieldPath: string;
  chargeGwh: number | null;
  dischargeGwh: number | null;
  /** Geladen minus entladen (GWh), nur wenn beide Werte vorliegen. */
  throughputLossGwh: number | null;
};

export type TagFahrweisenErloeseView = {
  dayKey: string;
  isolatedDayHorizon: boolean;
  revenueField: typeof TAG_DAY_AHEAD_REVENUE_FIELD;
  rows: TagFahrweiseErloesRow[];
  peakMinusMarketEur: number | null;
  peakMinusMarketPct: number | null;
  missingFieldPaths: string[];
};

export function dayAheadRevenueSourcePath(dayKey: string, strategy: NationalFleetStrategyUi): string {
  const file = NATIONAL_FLEET_STRATEGY_UI[strategy].fileKey;
  return `data/national-fleet/${dayKey.slice(0, 7)}/days/${dayKey}/x1_${file}.json`;
}

export function peakMinusMarketPct(peakEur: number, marketEur: number): number | null {
  if (!Number.isFinite(peakEur) || !Number.isFinite(marketEur) || marketEur === 0) {
    return null;
  }
  return ((peakEur - marketEur) / Math.abs(marketEur)) * 100;
}

function sliceOrNull(monthKey: string, dayKey: string, strategy: NationalFleetStrategyUi): NationalFleetDaySlice | null {
  try {
    return sliceFleetDay(loadNationalFleetRunSeries(1, strategy, { monthKey, dayKey }), dayKey);
  } catch {
    return null;
  }
}

export function loadTagFahrweisenErloese(dayKey: string): TagFahrweisenErloeseView {
  const monthKey = dayKey.slice(0, 7);
  const isolatedDayHorizon = nationalFleetIsolatedDayAvailable(monthKey, dayKey);
  const rows: TagFahrweiseErloesRow[] = TAG_FAHRWEISEN_ERLOESE_STRATEGIES.map((strategy) => {
    const slice = sliceOrNull(monthKey, dayKey, strategy);
    const chargeGwh = slice ? slice.chargeMwh / 1000 : null;
    const dischargeGwh = slice ? slice.dischargeMwh / 1000 : null;
    const throughputLossGwh =
      chargeGwh != null && dischargeGwh != null ? chargeGwh - dischargeGwh : null;
    const revenueEur = loadDayAheadRevenueEur(monthKey, dayKey, strategy);
    return {
      strategy,
      labelDe: strategy === "spitze" ? "Spitze" : strategy === "markt" ? "Markt" : "Überschuss",
      revenueEur,
      sourceFieldPath: dayAheadRevenueSourcePath(dayKey, strategy),
      chargeGwh,
      dischargeGwh,
      throughputLossGwh,
    };
  });
  const peak = rows.find((r) => r.strategy === "spitze")?.revenueEur ?? null;
  const market = rows.find((r) => r.strategy === "markt")?.revenueEur ?? null;
  const peakMinusMarketEur =
    peak != null && market != null ? peak - market : null;
  return {
    dayKey,
    isolatedDayHorizon,
    revenueField: TAG_DAY_AHEAD_REVENUE_FIELD,
    rows,
    peakMinusMarketEur,
    peakMinusMarketPct: peak != null && market != null ? peakMinusMarketPct(peak, market) : null,
    missingFieldPaths: rows.filter((r) => r.revenueEur == null).map((r) => r.sourceFieldPath),
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
  return `${eur} (${formatDePercentInt(view.peakMinusMarketPct)})`;
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
  return `geladen ${loaded} / entladen ${unloaded}, Differenz ${formatDeGwh(row.throughputLossGwh, 2)}`;
}

export function missingRevenueHint(view: TagFahrweisenErloeseView): string {
  if (view.missingFieldPaths.length === 0) {
    return "";
  }
  const paths = view.missingFieldPaths.join(", ");
  return `Day-Ahead-Erlös fehlt. Speicherpilot muss das Zahlenfeld ${view.revenueField} (Modellschätzung, isolierter Tageshorizont, Preisnehmer, ×1, inkl. Angabe ob Round-Trip-Verluste enthalten sind) in ${paths} liefern. Keine selbst gerechneten Euro.`;
}
