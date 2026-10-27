import { z } from "zod";

const monthValues = z.array(z.number().finite()).length(12);

const yearSchema = z.object({
  label: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.literal(365),
  monthDays: z.array(z.number().int().positive()).length(12),
  slotLengths: z.record(z.string(), z.number().int().nonnegative()),
  values: z.array(z.array(z.array(monthValues))).length(3),
});

export const fcaTableSchema = z.object({
  schemaVersion: z.literal(1),
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.object({
    name: z.string().min(1),
    license: z.string().min(1),
    href: z.string().url(),
    note: z.string().min(1),
  }),
  roundTripEfficiency: z.number().finite(),
  eta: z.number().finite(),
  hours: z.array(z.number().finite()).length(8),
  limits: z.array(z.number().finite()).length(21),
  forms: z.tuple([z.literal("fest"), z.literal("abend"), z.literal("mittag")]),
  horizonMonths: z.literal(36),
  years: z.object({
    "12m": yearSchema,
    "2025": yearSchema,
  }),
  checks: z.object({
    interpolation: z.object({
      year: z.literal("12m"),
      form: z.literal("fest"),
      hours: z.number().finite(),
      limit: z.number().finite(),
      powerMw: z.number().finite(),
      exactEur: z.number().finite(),
      interpolatedEur: z.number().finite(),
      relativeError: z.number().finite(),
    }),
    exampleYearEur: z.record(z.string(), z.number().finite()),
    exampleMonthSharePct: z.array(z.number().finite()).length(12),
  }),
});

export type FcaTable = z.infer<typeof fcaTableSchema>;
export type FcaYearKey = "12m" | "2025";
export type FcaForm = "fest" | "abend" | "mittag";

export const FCA_FORMS: readonly FcaForm[] = ["fest", "abend", "mittag"];
export const FCA_HOUR_MIN = 0.5;
export const FCA_HOUR_MAX = 6;
export const FCA_HORIZON = 36;

export function formIndex(form: FcaForm): number {
  return FCA_FORMS.indexOf(form);
}
