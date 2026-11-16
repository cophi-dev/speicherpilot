import type { ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { berlinHour, formatDec } from "@/lib/simulatorFahrweisenDerived";
import {
  formatGw,
  formatPct,
  pctOfMarket,
  type SimulatorDispatchRow,
  type SimulatorFrontPoint,
  type SimulatorTagesklasse,
} from "@/lib/simulatorFahrweisenTypes";

/** Pareto: Anteil am Max.-Erlös (keine Euro in ×2-Simulator). */
export function paretoTooltipRows(point: SimulatorFrontPoint, marketMioEur: number): ChartTooltipRow[] {
  return [
    { label: "vom Max.-Erlös", value: pctOfMarket(point.revenueMioEur, marketMioEur) },
    { label: "Senkung", value: formatGw(point.reductionGw) },
    { label: "Spitze", value: formatGw(point.peakGw) },
  ];
}

export function paretoTooltipTime(point: SimulatorFrontPoint, frontCount: number): string {
  if (point.isMarketLex) {
    return "Nur Preis";
  }
  if (point.isNetzLex) {
    return "Spitze zuerst";
  }
  if (point.isEps70) {
    return "Kompromiss ε-70";
  }
  return `Front-Punkt ${point.index + 1} von ${frontCount}`;
}

const KLASSE_DE: Record<string, string> = {
  winWin: "beide Ziele zugleich",
  win_win: "beide Ziele zugleich",
  neutral: "kein Zielkonflikt",
  konfliktSchwach: "kleiner Zielkonflikt",
  konflikt_schwach: "kleiner Zielkonflikt",
  konfliktHebung: "Preisfahren hebt die Tagesspitze",
  konflikt_hebung: "Preisfahren hebt die Tagesspitze",
};

/** Tagesstreifen: Anteil wie die Achsenmarken in ganzen Prozent. */
export function tagesTooltipRows(day: SimulatorTagesklasse): ChartTooltipRow[] {
  const sharePct = Math.round(day.shareOfNetzReduction * 100);
  const rows: ChartTooltipRow[] = [
    { label: "Anteil max. Senkung", value: formatPct(sharePct, 0) },
    { label: "Klasse", value: KLASSE_DE[day.klasse] ?? day.klasse },
    { label: "Markt-Senkung", value: formatGw(day.marketReductionGw) },
    { label: "Netz-Senkung", value: formatGw(day.netzReductionGw) },
  ];
  return rows;
}

export function tagesTooltipTime(day: SimulatorTagesklasse): string {
  const [, m, d] = day.date.split("-");
  return `${d}.${m}.`;
}

/**
 * Graph 3: alle Kurven zur Viertelstunde.
 * Restlast-Achse beschriftet ganzzahlig, Kurvenbeschriftungen im Graph mit 2 Dezimalstellen (formatGw);
 * Preis-Achse ganzzahlig — Tooltip daher € ohne Nachkommastellen.
 */
export function beispieltagTooltipRows(
  market: SimulatorDispatchRow,
  netz: SimulatorDispatchRow,
  komp: SimulatorDispatchRow,
): ChartTooltipRow[] {
  return [
    { label: "Beobachtet", value: formatGw(market.residualMw / 1000) },
    { label: "Nur Preis", value: formatGw(market.residualPrimeMw / 1000) },
    { label: "Spitze zuerst", value: formatGw(netz.residualPrimeMw / 1000) },
    { label: "Kompromiss", value: formatGw(komp.residualPrimeMw / 1000) },
    { label: "Preis", value: `${formatDec(market.priceEurMwh, 0)}\u00A0€/MWh` },
  ];
}

export function beispieltagTooltipTime(row: SimulatorDispatchRow): string {
  return berlinHour(row.ts).label;
}

/** Graph 4 / Kipppunkt: Markt- und Netz-Spitze je Flottenfaktor, 2 Dezimalstellen wie formatGw. */
export function fnavTooltipRows(point: { factor: number; marketPeakGw: number; netzPeakGw: number }): ChartTooltipRow[] {
  return [
    { label: "Nur Preis", value: formatGw(point.marketPeakGw) },
    { label: "Spitze zuerst", value: formatGw(point.netzPeakGw) },
  ];
}

export function fnavTooltipTime(factor: number): string {
  return `×${formatDec(factor, factor % 1 === 0 ? 0 : 1)}`;
}
