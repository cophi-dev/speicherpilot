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
  eon_gruppe: "E.ON-Gruppe",
  eon_kern: "E.ON (Kern)",
  mitnetz_envia: "MITNETZ / enviaM",
  ewe_netz: "EWE NETZ",
  vnb_rest: "übrige VNB",
  uenb: "ÜNB",
};

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
    isEonGroup: r.key.startsWith("eon"),
  }));
  return { rows, restMw, markerMw: 50 };
}

export function prepareGrowthStacks(
  growth: BessNetzbetreiberBundle["growthDefault"],
  eonFullGroup: boolean,
): GrowthBucket[] {
  const order = eonFullGroup
    ? (["eon_gruppe", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb"] as const)
    : (["eon_kern", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb"] as const);
  return order
    .filter((key) => growth[key])
    .map((key) => ({
      key,
      label: GROWTH_LABELS[key] ?? key,
      vor2026Mw: growth[key]!.vor2026Mw,
      y2026Mw: growth[key]!.y2026Mw,
    }));
}

export function eonSharePercent(ranking: BessNetzbetreiberBundle["vnbRanking"], eonFullGroup: boolean): number {
  const total = ranking.filter((r) => r.operatorClass !== "uenb").reduce((s, r) => s + r.bruttoMw, 0);
  if (total <= 0) return 0;
  const eon = ranking
    .filter((r) => r.key.startsWith("eon"))
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