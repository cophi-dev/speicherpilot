import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";

export type NetzbetreiberHeadlines = {
  units: number;
  bruttoGw: number;
  nettoGw: number;
  energyGwh: number;
  stichtag: string;
  eonBruttoGw: number;
  eonNettoGw: number;
  eonSharePctTotal: number;
  eonSharePctTotalNetto: number;
  /** Zubau 2026 netto (Nettonennleistung); Brutto nur als Begleitwert. */
  zubau2026Gw: number;
  zubau2026EonGw: number;
  zubau2026EonSharePct: number;
  zubau2026BruttoGw: number;
  zubau2026EonBruttoGw: number;
  topRedispatchBl: { bundesland: string; gwh: number } | null;
  topBessBl: { bundesland: string; gw: number };
};

type HeadlineOpts = {
  /** Default: MITNETZ in E.ON-Konzern-KPI */
  eonIncludeMitnetz?: boolean;
};

/** Kernaussagen aus vorberechneten Einheiten-Summen im Bundle (nicht Kartenpunkte). */
export function computeNetzbetreiberHeadlines(
  model: BessNetzbetreiberBundle,
  opts: HeadlineOpts = {},
): NetzbetreiberHeadlines {
  const includeMitnetz = opts.eonIncludeMitnetz !== false;
  const manifest = model.manifest as {
    stichtagMastr?: string;
    plausibility?: { unitsGe1MwNetto?: number; bruttoGw?: number; nettoGw?: number; energyGwh?: number };
  };
  const totals = model.totalsDefault;
  const bruttoGw = manifest.plausibility?.bruttoGw ?? totals.bruttoMw / 1000;
  const nettoGw = manifest.plausibility?.nettoGw ?? totals.nettoMw / 1000;

  const hs = model.headlineStats;
  const eonBlock = hs ? (includeMitnetz ? hs.eonWithMitnetz : hs.eonWithoutMitnetz) : null;
  const zubauHs = hs?.zubau2026;

  let eonBruttoMw: number;
  let eonNettoMw: number;
  let eonSharePctTotal: number;
  let eonSharePctTotalNetto: number;
  let zubauAllMw: number;
  let zubauEonMw: number;
  let zubauEonSharePct: number;
  let zubauAllBruttoMw: number;
  let zubauEonBruttoMw: number;

  if (eonBlock && zubauHs) {
    eonBruttoMw = eonBlock.bruttoMw;
    eonNettoMw = eonBlock.nettoMw;
    eonSharePctTotal = eonBlock.sharePctTotal;
    eonSharePctTotalNetto = totals.nettoMw > 0 ? (eonNettoMw / totals.nettoMw) * 100 : 0;
    zubauAllBruttoMw = zubauHs.allBruttoMw;
    zubauEonBruttoMw = includeMitnetz ? zubauHs.eonWithMitnetzBruttoMw : zubauHs.eonWithoutMitnetzBruttoMw;
    const eonNetto = includeMitnetz ? zubauHs.eonWithMitnetzNettoMw : zubauHs.eonWithoutMitnetzNettoMw;
    if (zubauHs.allNettoMw !== undefined && eonNetto !== undefined) {
      zubauAllMw = zubauHs.allNettoMw;
      zubauEonMw = eonNetto;
      zubauEonSharePct = zubauAllMw > 0 ? (zubauEonMw / zubauAllMw) * 100 : 0;
    } else {
      zubauAllMw = zubauAllBruttoMw;
      zubauEonMw = zubauEonBruttoMw;
      zubauEonSharePct = includeMitnetz ? zubauHs.eonSharePct : zubauHs.eonSharePctWithoutMitnetz;
    }
  } else {
    const growth = model.growthDefault;
    const keys = ["eon_kern", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb"] as const;
    const pick = (r: { y2026Mw: number; y2026NettoMw?: number } | undefined, netto: boolean) =>
      r ? (netto ? (r.y2026NettoMw ?? r.y2026Mw) : r.y2026Mw) : 0;
    zubauAllMw = keys.reduce((s, k) => s + pick(growth[k], true), 0);
    zubauAllBruttoMw = keys.reduce((s, k) => s + pick(growth[k], false), 0);
    zubauEonMw = pick(growth.eon_kern, true) + (includeMitnetz ? pick(growth.mitnetz_envia, true) : 0);
    zubauEonBruttoMw = pick(growth.eon_kern, false) + (includeMitnetz ? pick(growth.mitnetz_envia, false) : 0);
    zubauEonSharePct = zubauAllMw > 0 ? (zubauEonMw / zubauAllMw) * 100 : 0;
    eonBruttoMw = model.sitesDefault
      .filter((s) => s.operatorClass === "eon")
      .reduce((sum, s) => sum + s.bruttoMw, 0);
    eonNettoMw = model.sitesDefault
      .filter((s) => s.operatorClass === "eon")
      .reduce((sum, s) => sum + s.nettoMw, 0);
    eonSharePctTotal = bruttoGw > 0 ? (eonBruttoMw / 1000 / bruttoGw) * 100 : 0;
    eonSharePctTotalNetto = nettoGw > 0 ? (eonNettoMw / 1000 / nettoGw) * 100 : 0;
  }

  const scatter = model.scatterBundeslaender;
  const withAbreg = scatter.filter(
    (r): r is typeof r & { eeRedispatch2025Gwh: number } => r.eeRedispatch2025Gwh !== null,
  );
  const topRd = [...withAbreg].sort((a, b) => b.eeRedispatch2025Gwh - a.eeRedispatch2025Gwh)[0];
  const topBess = [...scatter].sort((a, b) => b.bessBruttoGw - a.bessBruttoGw)[0]!;

  return {
    units: manifest.plausibility?.unitsGe1MwNetto ?? totals.units,
    bruttoGw,
    nettoGw,
    energyGwh: manifest.plausibility?.energyGwh ?? totals.energyGwh,
    stichtag: manifest.stichtagMastr ?? "—",
    eonBruttoGw: eonBruttoMw / 1000,
    eonNettoGw: eonNettoMw / 1000,
    eonSharePctTotal,
    eonSharePctTotalNetto,
    zubau2026Gw: zubauAllMw / 1000,
    zubau2026EonGw: zubauEonMw / 1000,
    zubau2026EonSharePct: zubauEonSharePct,
    zubau2026BruttoGw: zubauAllBruttoMw / 1000,
    zubau2026EonBruttoGw: zubauEonBruttoMw / 1000,
    topRedispatchBl: topRd ? { bundesland: topRd.bundesland, gwh: topRd.eeRedispatch2025Gwh } : null,
    topBessBl: { bundesland: topBess.bundesland, gw: topBess.bessBruttoGw },
  };
}

/** SNB → E.ON-Konzern (inkl. MITNETZ). */
export function snbMapsToEonKonzern(snb: string): boolean {
  const EON_SNBS = new Set([
    "SNB921897286493",
    "SNB940352624434",
    "SNB990362338043",
    "SNB990857029876",
    "SNB941690671609",
    "SNB911705062982",
    "SNB918250928893",
    "SNB916269213931",
    "SNB911641710114",
    "SNB976379598847",
  ]);
  return EON_SNBS.has(snb.toUpperCase());
}