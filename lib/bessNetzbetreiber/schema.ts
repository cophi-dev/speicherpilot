import { z } from "zod";

export const bessSiteSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  bruttoMw: z.number(),
  nettoMw: z.number(),
  energyMwh: z.number(),
  units: z.number(),
  coordinateQuality: z.enum(["exakt", "plz_mittelpunkt", "gemeinde_naeherung", "ohne_koordinate"]),
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
      /** EE-Abregelung 2025, BMWE 12.05.2026; null = k. A. (HH, BE). */
      eeRedispatch2025Gwh: z.number().nullable(),
      bessBruttoGw: z.number(),
      bessNettoGw: z.number().optional(),
      eeRedispatch2025GesamtGwh: z.number().nullable().optional(),
      eeRedispatch2025OffshoreGwh: z.number().nullable().optional(),
      abregelungQuelle: z.string().optional(),
    }),
  ),
  growthDefault: z.record(
    z.string(),
    z.object({
      vor2026Mw: z.number(),
      y2026Mw: z.number(),
      vor2026NettoMw: z.number().optional(),
      y2026NettoMw: z.number().optional(),
    }),
  ),
  uenbEbene: z.object({
    inBetriebBruttoGw: z.number(),
    inBetriebNettoGw: z.number().optional(),
    inPlanungBruttoGw: z.number(),
    inBetriebUnits: z.number().optional(),
    note: z.string().optional(),
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
  sitesQualityFiltered: z.array(bessSiteSchema).optional(),
  sitesSensitiveOff: z.array(bessSiteSchema).optional(),
  totalsQualityFiltered: z
    .object({
      units: z.number(),
      bruttoMw: z.number(),
      nettoMw: z.number(),
      energyGwh: z.number(),
    })
    .optional(),
  vnbRankingQualityFiltered: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        operatorClass: z.string(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
        sites: z.number(),
      }),
    )
    .optional(),
  scatterQualityFiltered: z
    .array(
      z.object({
        bundesland: z.string(),
        eeRedispatch2025Gwh: z.number().nullable(),
        bessBruttoGw: z.number(),
        abregelungQuelle: z.string().optional(),
      }),
    )
    .optional(),
  growthQualityFiltered: z
    .record(
      z.string(),
      z.object({
        vor2026Mw: z.number(),
        y2026Mw: z.number(),
        vor2026NettoMw: z.number().optional(),
        y2026NettoMw: z.number().optional(),
      }),
    )
    .optional(),
  vnbNetworkLengths: z
    .array(
      z.object({
        vnbKey: z.string(),
        label: z.string(),
        km: z.number(),
        year: z.number(),
        url: z.string(),
      }),
    )
    .optional(),
  growthEonKern: z
    .record(
      z.string(),
      z.object({
        vor2026Mw: z.number(),
        y2026Mw: z.number(),
        vor2026NettoMw: z.number().optional(),
        y2026NettoMw: z.number().optional(),
      }),
    )
    .optional(),
  headlineStats: z
    .object({
      eonWithMitnetz: z.object({
        units: z.number(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
        sharePctTotal: z.number(),
      }),
      eonWithoutMitnetz: z.object({
        units: z.number(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
        sharePctTotal: z.number(),
      }),
      mitnetzOnly: z.object({
        units: z.number(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
      }),
      zubau2026: z.object({
        allBruttoMw: z.number(),
        eonWithMitnetzBruttoMw: z.number(),
        eonWithoutMitnetzBruttoMw: z.number(),
        eonSharePct: z.number(),
        eonSharePctWithoutMitnetz: z.number(),
        allNettoMw: z.number().optional(),
        eonWithMitnetzNettoMw: z.number().optional(),
        eonWithoutMitnetzNettoMw: z.number().optional(),
        eonSharePctNetto: z.number().optional(),
        eonSharePctWithoutMitnetzNetto: z.number().optional(),
      }),
      bySnb: z.record(
        z.string(),
        z.object({
          units: z.number(),
          bruttoMw: z.number(),
          nettoMw: z.number(),
        }),
      ),
    })
    .optional(),
  headlineStatsQualityFiltered: z
    .object({
      eonWithMitnetz: z.object({
        units: z.number(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
        sharePctTotal: z.number(),
      }),
      eonWithoutMitnetz: z.object({
        units: z.number(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
        sharePctTotal: z.number(),
      }),
      mitnetzOnly: z.object({
        units: z.number(),
        bruttoMw: z.number(),
        nettoMw: z.number(),
      }),
      zubau2026: z.object({
        allBruttoMw: z.number(),
        eonWithMitnetzBruttoMw: z.number(),
        eonWithoutMitnetzBruttoMw: z.number(),
        eonSharePct: z.number(),
        eonSharePctWithoutMitnetz: z.number(),
        allNettoMw: z.number().optional(),
        eonWithMitnetzNettoMw: z.number().optional(),
        eonWithoutMitnetzNettoMw: z.number().optional(),
        eonSharePctNetto: z.number().optional(),
        eonSharePctWithoutMitnetzNetto: z.number().optional(),
      }),
      bySnb: z.record(
        z.string(),
        z.object({
          units: z.number(),
          bruttoMw: z.number(),
          nettoMw: z.number(),
        }),
      ),
    })
    .optional(),
});

export type BessSite = z.infer<typeof bessSiteSchema>;
export type BessNetzbetreiberBundle = z.infer<typeof bessNetzbetreiberBundleSchema>;