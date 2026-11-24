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

function zubau2026FromGrowth(growth: BessNetzbetreiberBundle["growthDefault"]) {
  let all = 0;
  let eon = 0;
  for (const row of Object.values(growth)) {
    all += row.y2026Mw;
  }
  eon = growth.eon_gruppe?.y2026Mw ?? growth.eon_kern?.y2026Mw ?? 0;
  return { allMw: all, eonMw: eon };
}

/** Kernaussagen aus Bundle (Konzeptfilter, E.ON-Konzern = operatorClass eon). */
export function computeNetzbetreiberHeadlines(model: BessNetzbetreiberBundle): NetzbetreiberHeadlines {
  const manifest = model.manifest as {
    stichtagMastr?: string;
    plausibility?: { unitsGe1MwNetto?: number; bruttoGw?: number; nettoGw?: number; energyGwh?: number };
  };
  const totals = model.totalsDefault;
  const bruttoGw = manifest.plausibility?.bruttoGw ?? totals.bruttoMw / 1000;
  const eonBruttoMw = model.sitesDefault
    .filter((s) => s.operatorClass === "eon")
    .reduce((sum, s) => sum + s.bruttoMw, 0);
  const zubau = zubau2026FromGrowth(model.growthDefault);
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
    eonSharePctTotal: bruttoGw > 0 ? (eonBruttoMw / 1000 / bruttoGw) * 100 : 0,
    zubau2026Gw: zubau.allMw / 1000,
    zubau2026EonGw: zubau.eonMw / 1000,
    zubau2026EonSharePct: zubau.allMw > 0 ? (zubau.eonMw / zubau.allMw) * 100 : 0,
    topRedispatchBl: { bundesland: topRd.bundesland, gwh: topRd.eeRedispatch2025Gwh },
    topBessBl: { bundesland: topBess.bundesland, gw: topBess.bessBruttoGw },
  };
}