import type { ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { berlinHour, formatDec } from "@/lib/simulatorFahrweisenDerived";
import { formatGw, formatMioEur, formatPct, type SimulatorDispatchRow, type SimulatorFrontPoint, type SimulatorTagesklasse } from "@/lib/simulatorFahrweisenTypes";

/** Pareto: Erlös 2 Dezimalstellen (Zoom-Achse 33,70–34,18), Senkung 2 Dezimalstellen wie die y-Achse. */
export function paretoTooltipRows(point: SimulatorFrontPoint): ChartTooltipRow[] {
  return [
    { label: "Erlös", value: formatMioEur(point.revenueMioEur, 2) },
    { label: "Senkung", value: formatGw(point.reductionGw) },
    { label: "Spitze", value: formatGw(point.peakGw) },
  ];
}

export function paretoTooltipTime(point: SimulatorFrontPoint): string {
  if (point.isMarketLex) {
    return "Max. Erlös";
  }
  if (point.isNetzLex) {
    return "Netzdienlich";
  }
  if (point.isEps70) {
    return "Kompromiss ε-70";
  }
  return point.name || "Frontpunkt";
}

const KLASSE_DE: Record<string, string> = {
  winWin: "Win-win",
  win_win: "Win-win",
  neutral: "Neutral",
  konfliktSchwach: "Konflikt-schwach",
  konflikt_schwach: "Konflikt-schwach",
  konfliktHebung: "Konflikt-Hebung",
  konflikt_hebung: "Konflikt-Hebung",
};

/** Tagesstreifen: Anteil wie die Achsenmarken in ganzen Prozent. */
export function tagesTooltipRows(day: SimulatorTagesklasse): ChartTooltipRow[] {
  const sharePct = Math.round(day.shareOfNetzReduction * 100);
  const rows: ChartTooltipRow[] = [
    { label: "Regel T", value: formatPct(sharePct, 0) },
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
    { label: "Max. Erlös", value: formatGw(market.residualPrimeMw / 1000) },
    { label: "Netzdienlich", value: formatGw(netz.residualPrimeMw / 1000) },
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
    { label: "Max. Erlös", value: formatGw(point.marketPeakGw) },
    { label: "Netzdienlich", value: formatGw(point.netzPeakGw) },
  ];
}

export function fnavTooltipTime(factor: number): string {
  return `×${formatDec(factor, factor % 1 === 0 ? 0 : 1)}`;
}
