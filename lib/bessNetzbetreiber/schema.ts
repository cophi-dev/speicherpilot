import { z } from "zod";

export const bessSiteSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  bruttoMw: z.number(),
  nettoMw: z.number(),
  energyMwh: z.number(),
  units: z.number(),
  coordinateQuality: z.enum(["exakt", "plz_mittelpunkt", "gemeinde_naeherung"]),
  landkreis: z.string(),
  bundesland: z.string(),
  vnbDominant: z.string(),
  operatorClass: z.enum(["eon", "uenb", "vnb"]),
  vnbBucketKey: z.string(),
  vnbBucketLabel: z.string(),
});

export const bessNetzbetreiberBundleSchema = z.object({
  manifest: z.record(z.string(), z.unknown()),
  totalsDefault: z.object({
    units: z.number(),
    bruttoMw: z.number(),
    nettoMw: z.number(),
    energyGwh: z.number(),
  }),
  sitesDefault: z.array(bessSiteSchema),
  vnbRanking: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      operatorClass: z.string(),
      bruttoMw: z.number(),
      nettoMw: z.number(),
      sites: z.number(),
    }),
  ),
  scatterBundeslaender: z.array(
    z.object({
      bundesland: z.string(),
      eeRedispatch2025Gwh: z.number(),
      bessBruttoGw: z.number(),
    }),
  ),
  growthDefault: z.record(
    z.string(),
    z.object({
      vor2026Mw: z.number(),
      y2026Mw: z.number(),
    }),
  ),
  uenbEbene: z.object({
    inBetriebBruttoGw: z.number(),
    inPlanungBruttoGw: z.number(),
  }),
  eeStockBundeslaender: z.array(
    z.object({
      bundesland: z.string(),
      windOnshoreGw: z.number(),
      pvGw: z.number(),
    }),
  ),
  vg250: z
    .union([z.null(), z.object({ type: z.literal("FeatureCollection"), features: z.array(z.unknown()) })])
    .optional(),
  sitesSensitiveOff: z.array(bessSiteSchema).optional(),
  growthEonKern: z
    .record(
      z.string(),
      z.object({
        vor2026Mw: z.number(),
        y2026Mw: z.number(),
      }),
    )
    .optional(),
});

export type BessSite = z.infer<typeof bessSiteSchema>;
export type BessNetzbetreiberBundle = z.infer<typeof bessNetzbetreiberBundleSchema>;