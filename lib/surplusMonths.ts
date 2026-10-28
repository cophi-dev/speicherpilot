import { z } from "zod";

import raw from "@/data/surplus-months.json";

const surplusFileSchema = z.object({
  generatedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  thresholdGwh: z.number().positive(),
  months: z
    .array(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        days: z.number().int().nonnegative(),
        surplusDays: z.number().int().nonnegative(),
      })
    )
    .min(1)
    .max(12),
});

export type SurplusMonthsFile = z.infer<typeof surplusFileSchema>;

const parsed = surplusFileSchema.safeParse(raw);

/** Static file from `scripts/build-surplus-months.ts`. Null when the file does not match the schema. */
export const SURPLUS_MONTHS: SurplusMonthsFile | null = parsed.success ? parsed.data : null;
