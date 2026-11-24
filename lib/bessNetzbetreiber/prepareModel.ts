import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";

export type VnbBarRow = {
  key: string;
  label: string;
  bruttoMw: number;
  nettoMw: number;
  isTopVnb: boolean;
  isEonGroup: boolean;
};

export type GrowthBucket = {
  key: string;
  label: string;
  vor2026Mw: number;
  y2026Mw: number;
};

const GROWTH_LABELS: Record<string, string> = {
  eon_gruppe: "E.ON-Konzern (Summe)",
  eon_kern: "E.ON-Netze (ohne MITNETZ)",
  mitnetz_envia: "MITNETZ / enviaM",
  ewe_netz: "EWE NETZ",
  vnb_rest: "übrige VNB",
  uenb: "ÜNB",
};

/** Teilmengen für G3-Stapel — ohne eon_gruppe (nur Kontrollsumme im Bundle). */
export const GROWTH_DISJOINT_STACK_KEYS = ["eon_kern", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb"] as const;

export function sumGrowthDisjointMw(
  growth: BessNetzbetreiberBundle["growthDefault"],
  field: "y2026Mw" | "vor2026Mw",
): number {
  return GROWTH_DISJOINT_STACK_KEYS.reduce((sum, key) => sum + (growth[key]?.[field] ?? 0), 0);
}

/** VNB horizontal bar chart: top VNBs (excl. ÜNB) with ≥1 site; remainder summed as „übrige VNB“. */
export function prepareVnbBars(
  ranking: BessNetzbetreiberBundle["vnbRanking"],
  topVnbCount = 13,
): { rows: VnbBarRow[]; restMw: number; markerMw: number } {
  const vnbOnly = ranking.filter((r) => r.operatorClass !== "uenb");
  const top = vnbOnly.slice(0, topVnbCount);
  const rest = vnbOnly.slice(topVnbCount);
  const restMw = rest.reduce((s, r) => s + r.bruttoMw, 0);
  const rows: VnbBarRow[] = top.map((r) => ({
    key: r.key,
    label: r.label,
    bruttoMw: r.bruttoMw,
    nettoMw: r.nettoMw,
    isTopVnb: true,
    isEonGroup: r.key.startsWith("eon") || r.key === "mitnetz_envia",
  }));
  return { rows, restMw, markerMw: 50 };
}

export function prepareGrowthStacks(
  growth: BessNetzbetreiberBundle["growthDefault"],
  opts: { showMitnetz?: boolean } = {},
): GrowthBucket[] {
  const showMitnetz = opts.showMitnetz !== false;
  const order = showMitnetz
    ? GROWTH_DISJOINT_STACK_KEYS
    : (["eon_kern", "ewe_netz", "vnb_rest", "uenb"] as const);
  return order
    .filter((key) => growth[key])
    .map((key) => ({
      key,
      label: GROWTH_LABELS[key] ?? key,
      vor2026Mw: growth[key]!.vor2026Mw,
      y2026Mw: growth[key]!.y2026Mw,
    }))
    .filter((row) => row.vor2026Mw + row.y2026Mw > 0);
}

export const G2_AXIS_CAP_MW = 1000;

export type G2BarRow = VnbBarRow & {
  displayMw: number;
  capped: boolean;
  fullLabel: string;
  shortLabel: string;
};

export function prepareG2Bars(ranking: BessNetzbetreiberBundle["vnbRanking"], capMw = G2_AXIS_CAP_MW): G2BarRow[] {
  const { rows } = prepareVnbBars(ranking);
  return rows.map((r) => {
    const { short, full } = truncateVnbLabel(r.label, 22);
    const capped = r.bruttoMw > capMw;
    return {
      ...r,
      fullLabel: full,
      shortLabel: short,
      displayMw: Math.min(r.bruttoMw, capMw),
      capped,
    };
  });
}

export function eonSharePercent(
  ranking: BessNetzbetreiberBundle["vnbRanking"],
  includeMitnetz: boolean,
): number {
  const total = ranking.filter((r) => r.operatorClass !== "uenb").reduce((s, r) => s + r.bruttoMw, 0);
  if (total <= 0) return 0;
  const eon = ranking
    .filter((r) => r.key.startsWith("eon") || (includeMitnetz && r.key === "mitnetz_envia"))
    .reduce((s, r) => s + r.bruttoMw, 0);
  return (eon / total) * 100;
}

export function mapPointRadiusMw(bruttoMw: number): number {
  const area = Math.max(bruttoMw, 0.3);
  return Math.sqrt(area / Math.PI) * 8;
}

export function operatorFillClass(operatorClass: BessNetzbetreiberBundle["sitesDefault"][number]["operatorClass"]): string {
  if (operatorClass === "eon") return "eon";
  if (operatorClass === "uenb") return "uenb";
  return "vnb";
}

export function truncateVnbLabel(label: string, max = 24): { short: string; full: string } {
  const full = label.trim();
  if (full.length <= max) return { short: full, full };
  return { short: `${full.slice(0, max - 1)}…`, full };
}

export function maxBarMw(rows: { bruttoMw: number }[]): number {
  if (!rows.length) return 100;
  return Math.max(...rows.map((r) => r.bruttoMw));
}