export type EinspeisungArt = "voll" | "teil" | "ohne";

export type EinspeisungFilter = "alle" | "voll" | "teil";

export type HoehenModus = "mw" | "mwh";

export type KarteFilter = {
  nurGeprueft: boolean;
  einspeisung: EinspeisungFilter;
  /** Anschlussnetzbetreiber („Name (SNB…)“ aus dem MaStR); null = alle. */
  vnb: string | null;
};

export type KarteQuelle = {
  name: string;
  lizenz: string;
  url: string;
  datenquellen?: string;
};

export type KarteMeta = {
  stichtag: string;
  abruf: string;
  filter: string;
  leitkennzahl: string;
  nettoDefinition: string;
  pruefKatalog: string;
  saeulenregel: string;
  hoehenReferenzMw: number[];
  epPlausibelH: [number, number];
  vnbRegel?: string;
  landZuordnung?: string;
  abregelungUmfang?: string;
  quellen: KarteQuelle[];
};

export type KarteTotals = {
  n: number;
  nettoMw: number;
  bruttoMw: number;
  kapMwh: number;
  lokationen: number;
  lokationenKartiert: number;
  ohneKoordinateN: number;
  ohneKoordinateNettoMw: number;
  ohneKoordinateBruttoMw: number;
};

export type KarteEinheit = {
  lok: string;
  name: string;
  bl: string;
  lk: string;
  lat: number | null;
  lng: number | null;
  ibn: string;
  nettoMw: number;
  bruttoMw: number;
  kapMwh: number;
  geprueft: boolean;
  einspeisung: EinspeisungArt;
  span: string;
  /** Anschlussnetzbetreiber, „Name (SNB…)“; je Lokation identisch. */
  vnb?: string;
};

export type OhneKoordinateEintrag = {
  name: string;
  landkreis: string;
  bundesland: string;
  nettoMw: number;
  bruttoMw: number;
  ibn: string;
};

export type BundeslandKarteDatum = {
  bundesland: string;
  kuerzel: string;
  n: number;
  nettoMw: number;
  bruttoMw: number;
  kapMwh: number;
  /** EE-Redispatch 2025 laut BMWE inkl. Wind Offshore; null = k. A. */
  abregelung2025Gwh: number | null;
  /** Darin enthaltener Wind-Offshore-Anteil. */
  abregelung2025OffshoreGwh?: number | null;
};

export type MonatKumuliertEintrag = {
  monat: string;
  kumNettoMw: number;
  kumKapMwh: number;
  kumN: number;
};

export type Karte3dData = {
  meta: KarteMeta;
  totals: KarteTotals;
  einheiten: KarteEinheit[];
  vnbJeLokation?: Record<string, string>;
  ohneKoordinate: OhneKoordinateEintrag[];
  bundeslaender: BundeslandKarteDatum[];
  monatKumuliert: MonatKumuliertEintrag[];
};

export type Karte3dSummary = Pick<
  Karte3dData,
  "meta" | "totals" | "bundeslaender" | "ohneKoordinate"
>;

export type KarteSite = {
  lok: string;
  name: string;
  bl: string;
  lk: string;
  lat: number;
  lng: number;
  nettoMw: number;
  bruttoMw: number;
  kapMwh: number;
  unitsCount: number;
  geprueftAlle: boolean;
  geprueftCount: number;
  einspeisung: EinspeisungArt | "gemischt";
  span: string;
  earliestIbn: string;
  latestIbn: string;
  einheiten: KarteEinheit[];
};

export type SitesAtCutResult = {
  sites: KarteSite[];
  mappedUnits: number;
  mappedNettoMw: number;
  mappedBruttoMw: number;
  mappedKapMwh: number;
  totalUnits: number;
  totalNettoMw: number;
  totalBruttoMw: number;
  totalKapMwh: number;
  unmappedUnits: number;
  unmappedNettoMw: number;
  unmappedBruttoMw: number;
};

export type GeoJsonPolygonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type BundeslandFeature = {
  type: "Feature";
  properties: { name: string };
  geometry: GeoJsonPolygonGeometry;
};

export type BundeslaenderGeoJson = {
  type: "FeatureCollection";
  features: BundeslandFeature[];
};

export type KartePreviewUnit = {
  ibnMonat: string;
  nettoMw: number;
};

export type KartePreviewSite = {
  lok: string;
  lat: number;
  lng: number;
  nettoMw: number;
  units: KartePreviewUnit[];
};

export type StartKartePreviewData = {
  nettoMw: number;
  n: number;
  lokationen: number;
  stichtag: string;
  maxScaleValue: number;
  geoJson: BundeslaenderGeoJson;
  sites: KartePreviewSite[];
  /** YYYY-MM, gleiche Reihe wie /netzbetreiber-Zeitachse. */
  monate: string[];
};
