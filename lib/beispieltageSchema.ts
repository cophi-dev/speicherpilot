import { z } from "zod";

const quarterLengths = [92, 96, 100] as const;

export const beispielScaleSchema = z.union([z.literal(1), z.literal(2), z.literal(5), z.literal(10)]);

export const beispieltagIdSchema = z.enum(["feiertag-negativ", "abendspitze", "herbst", "normaltag"]);

export const beispieltagRoleSchema = z.enum(["top1", "top-ohne-negativ", "jahreszeit", "median"]);

const textPair = z.object({
  title: z.string().min(1),
  why: z.string().min(1),
});

export const beispieltagSchema = z
  .object({
    id: beispieltagIdSchema,
    dateBerlin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekday: z.string().min(1),
    holidayNameDe: z.string().min(1).optional(),
    role: beispieltagRoleSchema,
    prices: z.array(z.number()),
    slotStartIso: z.array(z.string().min(1)),
    dispatch: z.object({
      powerMw: z.array(z.number()),
      socPct: z.array(z.number()),
    }),
    revenueEur: z.object({
      x1: z.number(),
      x2: z.number(),
      x5: z.number(),
      x10: z.number(),
    }),
    parts: z.object({
      chargingEur: z.number(),
      dischargingEur: z.number(),
    }),
    chargedFromGridMwh: z.number(),
    dischargedToGridMwh: z.number(),
    fullCycles: z.number(),
    negativeQuarterHours: z.number().int().nonnegative(),
    stats: z.object({
      minEurPerMwh: z.number(),
      maxEurPerMwh: z.number(),
      spreadEurPerMwh: z.number(),
      argminIso: z.string().min(1),
      argmaxIso: z.string().min(1),
    }),
    rankByModelRevenueX1: z.number().int().positive(),
    context: z
      .object({
        solarMaxGw: z.number(),
        windMeanGw: z.number(),
        source: z.string().min(1),
      })
      .optional(),
    textDe: textPair,
    textEn: textPair,
  })
  .superRefine((day, ctx) => {
    const length = day.prices.length;
    if (!quarterLengths.includes(length as (typeof quarterLengths)[number])) {
      ctx.addIssue({ code: "custom", message: `quarter count ${length}` });
    }
    if (day.slotStartIso.length !== length || day.dispatch.powerMw.length !== length || day.dispatch.socPct.length !== length) {
      ctx.addIssue({ code: "custom", message: "series lengths differ" });
    }
  });

export const beispieltageFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    retrievedIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    windowDe: z.string().min(1),
    sources: z.object({
      prices: z.object({
        name: z.string().min(1),
        url: z.string().url(),
        licence: z.string().min(1),
        retrievedIso: z.string().min(1),
      }),
      context: z.object({
        name: z.string().min(1),
        url: z.string().url(),
        retrievedIso: z.string().min(1),
        noteDe: z.string().min(1),
      }),
    }),
    park: z.object({
      nameDe: z.string().min(1),
      powerMw: z.number().positive(),
      energyMwh: z.number().positive(),
      roundTrip: z.number().positive(),
      socWindow: z.tuple([z.number(), z.number()]),
      socStart: z.number(),
      coreRef: z.string().min(1),
    }),
    scales: z.tuple([z.literal(1), z.literal(2), z.literal(5), z.literal(10)]),
    selectionRule: z.object({
      de: z.string().min(1),
      en: z.string().min(1),
    }),
    medianDayRevenueX1: z.number(),
    counterExample: z
      .object({
        dateBerlin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        negativeQuarterHours: z.number().int().nonnegative(),
        revenueX1: z.number(),
        textDe: z.string().min(1),
        textEn: z.string().min(1),
      })
      .optional(),
    days: z.tuple([beispieltagSchema, beispieltagSchema, beispieltagSchema, beispieltagSchema]),
  })
  .superRefine((file, ctx) => {
    const ids = new Set(file.days.map((day) => day.id));
    const roles = new Set(file.days.map((day) => day.role));
    if (ids.size !== 4) {
      ctx.addIssue({ code: "custom", message: "ids must be unique" });
    }
    if (roles.size !== 4) {
      ctx.addIssue({ code: "custom", message: "roles must be unique" });
    }
  });

export type Beispieltag = z.infer<typeof beispieltagSchema>;
export type BeispieltageFile = z.infer<typeof beispieltageFileSchema>;
export type BeispielScale = 1 | 2 | 5 | 10;
