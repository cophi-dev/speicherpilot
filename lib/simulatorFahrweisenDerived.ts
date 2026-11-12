import type {
  SimulatorDispatchRow,
  SimulatorFahrweisenData,
} from "@/lib/simulatorFahrweisenTypes";
import { formatGw, formatMioEur, formatPct } from "@/lib/simulatorFahrweisenTypes";

/** Dezimalkomma, ohne Einheit. */
export function formatDec(v: number, digits = 2): string {
  return v.toFixed(digits).replace(".", ",");
}

/** Stunde in Europe/Berlin aus dem bereits berlin-kodierten ISO-Zeitstempel. */
export function berlinHour(ts: string): { hour: number; label: string } {
  const hh = Number(ts.slice(11, 13));
  const mm = Number(ts.slice(14, 16));
  return { hour: hh + mm / 60, label: `${ts.slice(11, 16)}` };
}

/**
 * Volle Senkung: ungerundeter Quotient und Anzeige mit zwei Dezimalen.
 *
 * Zweiter Rechenweg in Euro (303 639 / 34 089 906) bestätigt 0,89 %.
 * 0,30 / 34,09 (bereits auf zwei Dezimalen gerundet) ergibt 0,88 % —
 * das ist ein Rundungsartefakt und wird nicht angezeigt.
 */
export function fullReduction(marketMio: number, netzMio: number) {
  const exactMio = marketMio - netzMio;
  const exactEur = exactMio * 1_000_000;
  const marketEur = marketMio * 1_000_000;
  const exactPct = (exactMio / marketMio) * 100;
  const pctFromEur = (exactEur / marketEur) * 100;
  const roundedMio = Number(exactMio.toFixed(2));
  const roundedMarket = Number(marketMio.toFixed(2));
  const pctFromRoundedDisplay = (roundedMio / roundedMarket) * 100;
  return {
    exactMio,
    exactEur,
    marketEur,
    exactPct,
    pctFromEur,
    pctFromRoundedDisplay,
    costMioLabel: formatDec(exactMio, 2),
    marketMioLabel: formatDec(marketMio, 2),
    pctLabel: formatDec(exactPct, 2),
    costMioEurText: formatMioEur(exactMio, 2),
    /** „0,30 von 34,09“ */
    vonLabel: `${formatDec(exactMio, 2)} von ${formatDec(marketMio, 2)}`,
    /** „volle Senkung kostet 0,30 Mio. € (0,89 %)“ — Prozent aus ungerundetem Quotienten */
    fullCostSentence: `volle Senkung kostet ${formatMioEur(exactMio, 2)} (${formatPct(exactPct, 2)})`,
  };
}

export function compromisePct(marketMio: number, eps70Mio: number) {
  const exactPct = ((marketMio - eps70Mio) / marketMio) * 100;
  const keepPct = (eps70Mio / marketMio) * 100;
  return {
    costPct: exactPct,
    keepPct,
    costLabel: formatDec(exactPct, 2),
    keepLabel: formatDec(keepPct, 2),
  };
}

function argmax<T>(rows: T[], fn: (r: T) => number): T {
  return rows.reduce((best, r) => (fn(r) > fn(best) ? r : best));
}

/** Day-Ahead-Erlös eines Fahrplans: (Entladen − Laden) × Preis × 0,25 h. */
export function dayRevenueEur(rows: SimulatorDispatchRow[]): number {
  return rows.reduce((s, r) => s + (r.dischargeMw - r.chargeMw) * r.priceEurMwh * 0.25, 0);
}

export type ExampleDayMetrics = {
  date: string;
  dateLabel: string;
  observedPeakGw: number;
  observedTs: string;
  observedHour: number;
  observedLabel: string;
  marketPeakGw: number;
  marketPeakTs: string;
  marketPeakHour: number;
  marketPeakLabel: string;
  marketChargeAtPeakGw: number;
  marketPriceAtPeak: number;
  netzPeakGw: number;
  kompPeakGw: number;
  marketDayRevMio: number;
  kompDayRevMio: number;
  kompDayCostPct: number;
  hebungGw: number;
  maxPrice: number;
  maxPriceTs: string;
  maxPriceHour: number;
  maxPriceLabel: string;
  /** Entladeleistung des Markts zum Zeitpunkt der beobachteten Restlastspitze, GW */
  marketDischargeAtObservedGw: number;
  priceAtObserved: number;
};

export function deriveExampleDay(data: SimulatorFahrweisenData, date: string): ExampleDayMetrics {
  const day = data.exampleDays[date];
  if (!day) throw new Error(`exampleDays missing ${date}`);
  const market = day.modes.price;
  const netz = day.modes.peak;
  const komp = day.modes.eps70;
  const observed = argmax(market, (r) => r.residualMw);
  const marketPeak = argmax(market, (r) => r.residualPrimeMw);
  const netzPeak = argmax(netz, (r) => r.residualPrimeMw);
  const kompPeak = argmax(komp, (r) => r.residualPrimeMw);
  const maxP = argmax(market, (r) => r.priceEurMwh);
  const obsH = berlinHour(observed.ts);
  const mktH = berlinHour(marketPeak.ts);
  const pxH = berlinHour(maxP.ts);
  const atObserved = market.find((r) => r.ts === observed.ts) ?? observed;
  const marketDayRev = dayRevenueEur(market);
  const kompDayRev = dayRevenueEur(komp);
  const dateLabel = `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
  return {
    date,
    dateLabel,
    observedPeakGw: observed.residualMw / 1000,
    observedTs: observed.ts,
    observedHour: obsH.hour,
    observedLabel: obsH.label,
    marketPeakGw: marketPeak.residualPrimeMw / 1000,
    marketPeakTs: marketPeak.ts,
    marketPeakHour: mktH.hour,
    marketPeakLabel: mktH.label,
    marketChargeAtPeakGw: marketPeak.chargeMw / 1000,
    marketPriceAtPeak: marketPeak.priceEurMwh,
    netzPeakGw: netzPeak.residualPrimeMw / 1000,
    kompPeakGw: kompPeak.residualPrimeMw / 1000,
    marketDayRevMio: marketDayRev / 1_000_000,
    kompDayRevMio: kompDayRev / 1_000_000,
    kompDayCostPct: ((marketDayRev - kompDayRev) / marketDayRev) * 100,
    hebungGw: (marketPeak.residualPrimeMw - observed.residualMw) / 1000,
    maxPrice: maxP.priceEurMwh,
    maxPriceTs: maxP.ts,
    maxPriceHour: pxH.hour,
    maxPriceLabel: pxH.label,
    marketDischargeAtObservedGw: atObserved.dischargeMw / 1000,
    priceAtObserved: atObserved.priceEurMwh,
  };
}

export function xHour(hour: number, padL: number, plotW: number): number {
  return padL + (hour / 24) * plotW;
}

export function mapX(v: number, xmin: number, xmax: number, plotW: number, padL: number): number {
  return padL + ((v - xmin) / (xmax - xmin)) * plotW;
}

export function mapY(v: number, ymin: number, ymax: number, plotH: number, padT: number): number {
  return padT + plotH - ((v - ymin) / (ymax - ymin)) * plotH;
}

export const FULL_X = [0, 36] as const;
export const FULL_Y = [0, 4.2] as const;
export const ZOOM_X = [33.7, 34.18] as const;
export const DAY_Y = [20, 70] as const;
