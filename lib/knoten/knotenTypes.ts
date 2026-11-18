import { z } from "zod";

export const KNOTEN_BELEGUNGEN = ["voll", "reserve", "ueber"] as const;
export type KnotenBelegung = (typeof KNOTEN_BELEGUNGEN)[number];

export const KNOTEN_TYPEN = ["wind", "solar", "stadt"] as const;
export type KnotenTyp = (typeof KNOTEN_TYPEN)[number];

export const KNOTEN_FAKTOREN = [1, 2, 5, 10] as const;
export type KnotenFaktor = (typeof KNOTEN_FAKTOREN)[number];

export const KNOTEN_LIMIT_MW = 80;

export const KNOTEN_NODE_LABELS: Record<KnotenTyp, string> = {
  wind: "Windknoten Nord",
  solar: "Solarknoten Süd",
  stadt: "Stadtknoten",
};

export const KNOTEN_BELEGUNG_LABELS: Record<KnotenBelegung, string> = {
  reserve: "10\u00A0% Reserve",
  voll: "knapp voll",
  ueber: "25\u00A0% drüber",
};

export type KnotenDayRow = {
  saison: "herbst" | "sommer";
  node: KnotenTyp;
  k: KnotenFaktor;
  day: string;
  qhBase: number;
  qhMarkt: number;
  qhKnoten: number;
  mwhMarkt: number;
  rMarkt: number;
  rKnoten: number;
  verlustPct: number;
  pMw: number;
  eMwh: number;
};

export type KnotenCurvePayload = {
  base: number[];
  fm: number[];
  fk: number[];
};

export type KnotenManifest = {
  belegungen: KnotenBelegung[];
  limitMw: number;
  factors: KnotenFaktor[];
  nodes: KnotenTyp[];
  dateRanges: { herbst: [string, string]; sommer: [string, string] };
  defaultFactor: KnotenFaktor;
  defaultBelegung: KnotenBelegung;
  defaultNode: KnotenTyp;
  defaultDay: string;
};

export const knotenSearchSchema = z.object({
  tag: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  typ: z.enum(KNOTEN_TYPEN).optional(),
  k: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2), z.literal(5), z.literal(10)])).optional(),
  belegung: z.enum(KNOTEN_BELEGUNGEN).optional(),
});

export type KnotenSearch = z.infer<typeof knotenSearchSchema>;