import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";

export type NetzbetreiberHeadlines = {
  units: number;
  bruttoGw: number;
  nettoGw: number;
  energyGwh: number;
  stichtag: string;
  eonBruttoGw: number;
  eonSharePctTotal: number;
  zubau2026Gw: number;
  zubau2026EonGw: number;
  zubau2026EonSharePct: number;
  topRedispatchBl: { bundesland: string; gwh: number };
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

  const hs = model.headlineStats;
  const eonBlock = hs ? (includeMitnetz ? hs.eonWithMitnetz : hs.eonWithoutMitnetz) : null;
  const zubauHs = hs?.zubau2026;

  let eonBruttoMw: number;
  let eonSharePctTotal: number;
  let zubauAllMw: number;
  let zubauEonMw: number;
  let zubauEonSharePct: number;

  if (eonBlock && zubauHs) {
    eonBruttoMw = eonBlock.bruttoMw;
    eonSharePctTotal = eonBlock.sharePctTotal;
    zubauAllMw = zubauHs.allBruttoMw;
    zubauEonMw = includeMitnetz ? zubauHs.eonWithMitnetzBruttoMw : zubauHs.eonWithoutMitnetzBruttoMw;
    zubauEonSharePct = includeMitnetz ? zubauHs.eonSharePct : zubauHs.eonSharePctWithoutMitnetz;
  } else {
    const growth = model.growthDefault;
    zubauAllMw = Object.values(growth).reduce((s, r) => s + r.y2026Mw, 0);
    zubauEonMw =
      growth.eon_gruppe?.y2026Mw ??
      (growth.eon_kern?.y2026Mw ?? 0) + (growth.mitnetz_envia?.y2026Mw ?? 0);
    zubauEonSharePct = zubauAllMw > 0 ? (zubauEonMw / zubauAllMw) * 100 : 0;
    eonBruttoMw = model.sitesDefault
      .filter((s) => s.operatorClass === "eon")
      .reduce((sum, s) => sum + s.bruttoMw, 0);
    eonSharePctTotal = bruttoGw > 0 ? (eonBruttoMw / 1000 / bruttoGw) * 100 : 0;
  }

  const scatter = model.scatterBundeslaender;
  const topRd = [...scatter].sort((a, b) => b.eeRedispatch2025Gwh - a.eeRedispatch2025Gwh)[0]!;
  const topBess = [...scatter].sort((a, b) => b.bessBruttoGw - a.bessBruttoGw)[0]!;

  return {
    units: manifest.plausibility?.unitsGe1MwNetto ?? totals.units,
    bruttoGw,
    nettoGw: manifest.plausibility?.nettoGw ?? totals.nettoMw / 1000,
    energyGwh: manifest.plausibility?.energyGwh ?? totals.energyGwh,
    stichtag: manifest.stichtagMastr ?? "—",
    eonBruttoGw: eonBruttoMw / 1000,
    eonSharePctTotal,
    zubau2026Gw: zubauAllMw / 1000,
    zubau2026EonGw: zubauEonMw / 1000,
    zubau2026EonSharePct: zubauEonSharePct,
    topRedispatchBl: { bundesland: topRd.bundesland, gwh: topRd.eeRedispatch2025Gwh },
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