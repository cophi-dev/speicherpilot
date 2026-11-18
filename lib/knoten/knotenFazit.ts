import { KNOTEN_NODE_LABELS, type KnotenDayRow, type KnotenTyp } from "@/lib/knoten/knotenTypes";

function formatDePct(x: number): string {
  return x.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function knotenFazitSatz(node: KnotenTyp, row: KnotenDayRow): string {
  const name = KNOTEN_NODE_LABELS[node].split(" ")[0]!;
  if (row.qhMarkt === 0) {
    return `Am ${name}knoten zeigt der Markt-Speicher an diesem Tag kaum Konflikt mit der Grenze (Stufe ×${row.k}).`;
  }
  return (
    `Am ${name}knoten hätte der Markt-Speicher ${row.qhMarkt} Viertelstunden über die Grenze geschoben, ` +
    `knotentreu ${row.qhKnoten}, für ${formatDePct(row.verlustPct)}\u00A0% weniger Erlös.`
  );
}

export function knotenEuroHinweis(row: KnotenDayRow): string | null {
  if (row.k !== 1) {
    return null;
  }
  const delta = row.rMarkt - row.rKnoten;
  if (delta < 0.5) {
    return `Modellschätzung ×1: Day-Ahead-Erlös Markt ${Math.round(row.rMarkt).toLocaleString("de-DE")}\u00A0€, Differenz knotentreu unter 1\u00A0€.`;
  }
  return `Modellschätzung ×1: Day-Ahead-Erlös Markt ${Math.round(row.rMarkt).toLocaleString("de-DE")}\u00A0€, knotentreu ${Math.round(row.rKnoten).toLocaleString("de-DE")}\u00A0€ (−${Math.round(delta).toLocaleString("de-DE")}\u00A0€).`;
}