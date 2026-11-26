import type {
  BundeslandKarteDatum,
  EinspeisungArt,
  KarteEinheit,
  KarteFilter,
  KartePreviewSite,
  KarteSite,
  MonatKumuliertEintrag,
  SitesAtCutResult,
} from "@/lib/bessKarte3d/types";

export const DEFAULT_KARTE_FILTER: KarteFilter = {
  nurGeprueft: false,
  einspeisung: "alle",
  vnb: null,
};

/** EE-Redispatch 2025 ohne Wind Offshore (Gesamt minus Offshore), Basis der Flächenfärbung. */
export function abregelungOhneOffshore(b: BundeslandKarteDatum): number | null {
  if (b.abregelung2025Gwh === null || !Number.isFinite(b.abregelung2025Gwh)) return null;
  const off = b.abregelung2025OffshoreGwh ?? 0;
  return Math.round((b.abregelung2025Gwh - off) * 100) / 100;
}

/** „Name GmbH (SNB…)“ → „Name GmbH“ (MaStR-Kennung ab). */
export function vnbAnzeigeName(vnb: string): string {
  return vnb.replace(/\s*\(SNB\d+\)\s*$/, "").replace(/＆/g, "&").trim();
}

export type VnbOption = { vnb: string; label: string; nettoMw: number; lokationen: number };

/** Netzbetreiber der Karte, absteigend nach Nettoleistung. */
export function vnbOptionen(einheiten: readonly KarteEinheit[]): VnbOption[] {
  const acc = new Map<string, { nettoMw: number; loks: Set<string> }>();
  for (const e of einheiten) {
    if (!e.vnb) continue;
    const cur = acc.get(e.vnb) ?? { nettoMw: 0, loks: new Set<string>() };
    cur.nettoMw += e.nettoMw;
    cur.loks.add(e.lok);
    acc.set(e.vnb, cur);
  }
  return [...acc.entries()]
    .map(([vnb, v]) => ({ vnb, label: vnbAnzeigeName(vnb), nettoMw: v.nettoMw, lokationen: v.loks.size }))
    .sort((a, b) => b.nettoMw - a.nettoMw || a.label.localeCompare(b.label, "de"));
}

export const ORIENTIERUNGS_STAEDTE = [
  { name: "Hamburg", lat: 53.551, lng: 9.994 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Köln", lat: 50.938, lng: 6.96 },
  { name: "Frankfurt", lat: 50.111, lng: 8.682 },
  { name: "München", lat: 48.135, lng: 11.582 },
] as const;

export const BUNDESLAND_KUERZEL_ZU_NAME: Record<string, string> = {
  BB: "Brandenburg",
  BE: "Berlin",
  BW: "Baden-Württemberg",
  BY: "Bayern",
  HB: "Bremen",
  HE: "Hessen",
  HH: "Hamburg",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SH: "Schleswig-Holstein",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  TH: "Thüringen",
};

/** Filtert Einheiten nach NB-Prüfung und Einspeisungsart („ohne“ nur unter „alle“). */
export function filterEinheiten(
  einheiten: readonly KarteEinheit[],
  filter: KarteFilter = DEFAULT_KARTE_FILTER,
): KarteEinheit[] {
  return einheiten.filter((e) => {
    if (filter.nurGeprueft && !e.geprueft) {
      return false;
    }
    if (filter.einspeisung === "voll" && e.einspeisung !== "voll") {
      return false;
    }
    if (filter.einspeisung === "teil" && e.einspeisung !== "teil") {
      return false;
    }
    if (filter.vnb && e.vnb !== filter.vnb) {
      return false;
    }
    return true;
  });
}

/** Prüft, ob eine Einheit zum Monatsstichtag (YYYY-MM) bereits in Betrieb ist. */
export function isInBetriebBisMonat(ibn: string, monat: string): boolean {
  if (!ibn || !monat) return false;
  return ibn.slice(0, 7) <= monat;
}

function compareDominantEinheit(a: KarteEinheit, b: KarteEinheit): number {
  if (b.nettoMw !== a.nettoMw) return b.nettoMw - a.nettoMw;
  if (b.bruttoMw !== a.bruttoMw) return b.bruttoMw - a.bruttoMw;
  if (a.ibn !== b.ibn) return a.ibn.localeCompare(b.ibn);
  return a.name.localeCompare(b.name);
}

/**
 * Aggregiert alle bis zum Stichtag-Monat (YYYY-MM) in Betrieb befindlichen und
 * gefilterten Einheiten nach LokationMastrNr (`lok`).
 * Säulenregel: Koordinate der Einheit mit größter Nettoleistung (bei Gleichstand Brutto);
 * Höhe = Summe der Lokation; Einheiten ohne Koordinate werden separat gezählt.
 */
export function sitesAtCut(
  einheiten: readonly KarteEinheit[],
  monat: string,
  filter: KarteFilter = DEFAULT_KARTE_FILTER,
): SitesAtCutResult {
  const active = filterEinheiten(einheiten, filter).filter((e) =>
    isInBetriebBisMonat(e.ibn, monat),
  );

  let totalNettoMw = 0;
  let totalBruttoMw = 0;
  let totalKapMwh = 0;
  let mappedUnits = 0;
  let mappedNettoMw = 0;
  let mappedBruttoMw = 0;
  let mappedKapMwh = 0;
  let unmappedUnits = 0;
  let unmappedNettoMw = 0;
  let unmappedBruttoMw = 0;

  const byLok = new Map<string, KarteEinheit[]>();
  for (const e of active) {
    totalNettoMw += e.nettoMw;
    totalBruttoMw += e.bruttoMw;
    totalKapMwh += e.kapMwh;
    const list = byLok.get(e.lok);
    if (list) {
      list.push(e);
    } else {
      byLok.set(e.lok, [e]);
    }
  }

  const sites: KarteSite[] = [];
  for (const [lok, group] of byLok.entries()) {
    const withCoords = group.filter((e) => e.lat !== null && e.lng !== null);
    if (withCoords.length === 0) {
      unmappedUnits += group.length;
      for (const e of group) {
        unmappedNettoMw += e.nettoMw;
        unmappedBruttoMw += e.bruttoMw;
      }
      continue;
    }

    const sortedByPower = [...withCoords].sort(compareDominantEinheit);
    const dominant = sortedByPower[0]!;
    const allSorted = [...group].sort(compareDominantEinheit);

    let sumNetto = 0;
    let sumBrutto = 0;
    let sumKap = 0;
    let geprueftCount = 0;
    let earliestIbn = group[0]!.ibn;
    let latestIbn = group[0]!.ibn;
    const einspeisungSet = new Set<EinspeisungArt>();

    for (const e of group) {
      sumNetto += e.nettoMw;
      sumBrutto += e.bruttoMw;
      sumKap += e.kapMwh;
      if (e.geprueft) geprueftCount += 1;
      if (e.ibn < earliestIbn) earliestIbn = e.ibn;
      if (e.ibn > latestIbn) latestIbn = e.ibn;
      einspeisungSet.add(e.einspeisung);
    }

    mappedUnits += group.length;
    mappedNettoMw += sumNetto;
    mappedBruttoMw += sumBrutto;
    mappedKapMwh += sumKap;

    const einspeisung: EinspeisungArt | "gemischt" =
      einspeisungSet.size === 1 ? ([...einspeisungSet][0] as EinspeisungArt) : "gemischt";

    sites.push({
      lok,
      name: dominant.name,
      bl: dominant.bl,
      lk: dominant.lk,
      lat: dominant.lat!,
      lng: dominant.lng!,
      nettoMw: sumNetto,
      bruttoMw: sumBrutto,
      kapMwh: sumKap,
      unitsCount: group.length,
      geprueftAlle: geprueftCount === group.length,
      geprueftCount,
      einspeisung,
      span: dominant.span,
      earliestIbn,
      latestIbn,
      einheiten: allSorted,
    });
  }

  sites.sort((a, b) => b.nettoMw - a.nettoMw || a.lok.localeCompare(b.lok));

  return {
    sites,
    mappedUnits,
    mappedNettoMw,
    mappedBruttoMw,
    mappedKapMwh,
    totalUnits: active.length,
    totalNettoMw,
    totalBruttoMw,
    totalKapMwh,
    unmappedUnits,
    unmappedNettoMw,
    unmappedBruttoMw,
  };
}

/** Quadratwurzel-Skalierung für Säulenhöhen (MW oder MWh). */
export function saeulenHoehe(value: number, maxValue: number, maxHeight: number): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(maxValue) || maxValue <= 0) {
    return 0;
  }
  return (Math.sqrt(value) / Math.sqrt(maxValue)) * maxHeight;
}

/** Radien der 2D-Mobilkarte (px). */
export const MOBIL_PUNKT_MIN_R = 2.8;
export const MOBIL_PUNKT_MAX_R = 18.5;

/** Wert, unter dem mobil alle Punkte gleich groß (Mindestradius) gezeichnet werden. */
export function mobilMindestPunktWert(maxValue: number): number {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 0;
  return maxValue * (MOBIL_PUNKT_MIN_R / MOBIL_PUNKT_MAX_R) ** 2;
}

/** Punkt-Radius für 2D-Mobilkarte (Fläche proportional zum Wert → Radius ~ √Wert). */
export function punktRadius2d(
  value: number,
  maxValue: number,
  minRadius = 2.6,
  maxRadius = 19,
): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(maxValue) || maxValue <= 0) {
    return minRadius;
  }
  const t = Math.sqrt(value) / Math.sqrt(maxValue);
  return Math.max(minRadius, t * maxRadius);
}

function roundNiceReference(value: number): number {
  if (value <= 5) return Math.max(1, Math.round(value));
  if (value <= 25) return Math.round(value / 5) * 5;
  if (value <= 120) return Math.round(value / 10) * 10;
  return Math.round(value / 25) * 25;
}

/**
 * Leitet vier beschriftete MWh-Referenzwerte direkt aus den kartierten Lokationen ab
 * (höchste Säule exakt aus den Daten, Stufen proportional zu den MW-Referenzen).
 */
export function deriveMwhReferenzWerte(
  sites: readonly Pick<KarteSite, "kapMwh">[],
  mwReferenzen: readonly number[] = [1, 10, 50, 140],
): number[] {
  const maxMwh = sites.reduce((m, s) => Math.max(m, s.kapMwh), 0);
  if (maxMwh <= 0) return [];
  const maxMwRef = mwReferenzen[mwReferenzen.length - 1] ?? 140;
  const maxRounded = Math.round(maxMwh);
  const refs: number[] = [];
  for (let i = 0; i < mwReferenzen.length; i += 1) {
    if (i === mwReferenzen.length - 1) {
      refs.push(maxRounded);
    } else {
      const ratio = mwReferenzen[i]! / maxMwRef;
      const candidate = roundNiceReference(maxMwh * ratio);
      if (candidate > 0 && candidate < maxRounded && !refs.includes(candidate)) {
        refs.push(candidate);
      }
    }
  }
  return refs;
}

/** Berechnet die monatlich kumulierte Kurve für die aktiven Filter (ab 2017-12). */
export function computeKumulierteKurve(
  einheiten: readonly KarteEinheit[],
  monate: readonly string[],
  filter: KarteFilter = DEFAULT_KARTE_FILTER,
): MonatKumuliertEintrag[] {
  const filtered = filterEinheiten(einheiten, filter);
  const sorted = [...filtered].sort((a, b) => a.ibn.localeCompare(b.ibn));
  const result: MonatKumuliertEintrag[] = [];
  let idx = 0;
  let kumNettoMw = 0;
  let kumKapMwh = 0;
  let kumN = 0;

  for (const monat of monate) {
    while (idx < sorted.length && sorted[idx]!.ibn.slice(0, 7) <= monat) {
      const e = sorted[idx]!;
      kumNettoMw += e.nettoMw;
      kumKapMwh += e.kapMwh;
      kumN += 1;
      idx += 1;
    }
    result.push({
      monat,
      kumNettoMw: Math.round(kumNettoMw * 1000) / 1000,
      kumKapMwh: Math.round(kumKapMwh * 1000) / 1000,
      kumN,
    });
  }
  return result;
}

/** Alle 16 Bundesländer nach Nettoleistung absteigend sortiert (inkl. Einheiten ohne Koordinate). */
export function blNetto(
  bundeslaender: readonly BundeslandKarteDatum[],
): BundeslandKarteDatum[] {
  return [...bundeslaender].sort(
    (a, b) => b.nettoMw - a.nettoMw || a.bundesland.localeCompare(b.bundesland, "de"),
  );
}

/** E/P-Verhältnis (Stunden = MWh ÷ MW). */
export function epStunden(kapMwh: number, nettoMw: number): number | null {
  if (!Number.isFinite(kapMwh) || !Number.isFinite(nettoMw) || nettoMw <= 0) {
    return null;
  }
  return kapMwh / nettoMw;
}

export function isEpPlausibel(
  ep: number | null,
  bounds: readonly [number, number] = [0.25, 8],
): boolean {
  if (ep === null || !Number.isFinite(ep)) return false;
  return ep >= bounds[0] && ep <= bounds[1];
}

const MONATE_DE_KURZ = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

/**
 * MaStR-Einheitennamen enthalten oft Zahl + Einheit mit normalem Leerzeichen
 * ("BESS 5.000 kW"). Für die Anzeige wird das Leerzeichen durch ein NBSP ersetzt,
 * damit Zahl und Einheit nicht getrennt umbrechen. Der Rohname bleibt unverändert.
 */
export function mastrNameNbsp(name: string): string {
  return name.replace(/(\d)[ \t]+(kWh|MWh|GWh|kWp|MWp|kW|MW|GW|kVA|MVA|%)(?![A-Za-z])/g, "$1\u00a0$2");
}

export function formatMonatLabel(monat: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monat);
  if (!m) return monat;
  const year = m[1]!;
  const idx = Number(m[2]) - 1;
  const name = MONATE_DE_KURZ[idx];
  if (!name) return monat;
  if (monat === "2017-12") {
    return "Bestand Ende 2017";
  }
  return `${name} ${year}`;
}

export function formatIbnDateDe(ibn: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ibn);
  if (!m) return ibn;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function formatEinspeisungLabel(art: EinspeisungArt | "gemischt"): string {
  if (art === "voll") return "Volleinspeisung";
  if (art === "teil") return "Teileinspeisung";
  if (art === "gemischt") return "gemischt";
  return "keine Angabe";
}


/** Startkarten-Zeitablauf: Stand je Monat aus den Einheiten, wie sitesAtCut / „Abspielen“. */
export function previewSitesAtMonat(
  sites: readonly KartePreviewSite[],
  monat: string,
): { lok: string; lat: number; lng: number; nettoMw: number }[] {
  const out: { lok: string; lat: number; lng: number; nettoMw: number }[] = [];
  for (const site of sites) {
    const units = site.units ?? [];
    const nettoMw = units.length
      ? units.filter((u) => u.ibnMonat <= monat).reduce((sum, u) => sum + u.nettoMw, 0)
      : site.nettoMw;
    if (nettoMw > 0) {
      out.push({ lok: site.lok, lat: site.lat, lng: site.lng, nettoMw });
    }
  }
  return out;
}
