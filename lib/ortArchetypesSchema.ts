import { z } from "zod";

export const ortModeSchema = z.enum(["markt", "vertrag", "netz"]);

export const ortBadgeSchema = z.enum(["netzdienlich", "belastend", "neutral"]);

export const ortSeriesModeSchema = z.object({
  c: z.array(z.number()),
  d: z.array(z.number()),
  soc: z.array(z.number()),
  L1n0: z.array(z.number()),
  L1n1: z.array(z.number()),
  vmin: z.array(z.number()),
  vmax: z.array(z.number()),
});

export const ortArchetypeSchema = z.object({
  code: z.string(),
  labelDe: z.string(),
  scenarioDe: z.string().nullable().optional(),
  typtag: z.string(),
  priceDay: z.string(),
  bottleneck: z.object({
    id: z.string(),
    type: z.enum(["line", "trafo"]),
    lengthKm: z.number().nullable(),
    ratingA: z.number().nullable(),
  }),
  contingency: z.object({ id: z.string() }),
  node: z.object({ id: z.number(), label: z.string() }),
  tStar: z.number(),
  hasEngpass: z.boolean(),
  peakN1Pct: z.number(),
  xMw: z.number().nullable(),
  yMw: z.number().nullable(),
  xLimitedByBase: z.boolean(),
  storage: z.object({ pMw: z.number(), eMwh: z.number() }),
  windowQh: z.array(z.number()),
  series: z.object({
    hour: z.array(z.number()),
    L0n0: z.array(z.number()),
    L0n1: z.array(z.number()),
    modes: z.object({
      markt: ortSeriesModeSchema,
      vertrag: ortSeriesModeSchema,
      netz: ortSeriesModeSchema,
    }),
  }),
  badge: z.object({
    markt: ortBadgeSchema,
    vertrag: ortBadgeSchema,
    netz: ortBadgeSchema,
  }),
  /** Jahres-Konflikte folgen in separater Datenlieferung — null = noch nicht berechnet. */
  conflicts12m: z
    .object({
      qh: z.number(),
      days: z.number(),
      mwh: z.number(),
    })
    .nullable(),
  /** Relativer Modellerlös am Typtag (Markt = 100 %). */
  revenuePctTyptag: z.object({
    markt: z.number(),
    vertrag: z.number(),
    netz: z.number(),
  }),
  /** @deprecated Jahreswerte — nicht mehr befüllt (UX R4). */
  revenuePct12m: z
    .object({
      markt: z.number(),
      vertrag: z.number(),
      netz: z.number(),
    })
    .nullable()
    .optional(),
  over100Qh: z.object({
    n0: z.number(),
    n1Markt: z.number(),
    n1Vertrag: z.number(),
    n1Netz: z.number(),
  }),
  warnings: z.array(z.string()),
});

export const ortArchetypesFileSchema = z.object({
  schemaVersion: z.number(),
  generatedBy: z.string(),
  generatedAt: z.string().optional(),
  versions: z.record(z.string(), z.string()),
  license: z.object({
    name: z.string(),
    url: z.string(),
    notice: z.string(),
    attribution: z.string(),
  }),
  archetypes: z.object({
    land: ortArchetypeSchema,
    stadt: ortArchetypeSchema,
  }),
});

export type OrtArchetypesFile = z.infer<typeof ortArchetypesFileSchema>;
export type OrtArchetype = z.infer<typeof ortArchetypeSchema>;
export type OrtMode = z.infer<typeof ortModeSchema>;
export type OrtBadgeId = z.infer<typeof ortBadgeSchema>;
