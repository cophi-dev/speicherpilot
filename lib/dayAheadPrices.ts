import { z } from "zod";

/** Same Energy-Charts request `/live` uses for the DE-LU day-ahead auction. */
export function dayAheadPriceUrl(dateKey: string): string {
  return `https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${dateKey}&end=${dateKey}`;
}

export type DayAheadPricePoint = {
  unixMs: number;
  eurPerMwh: number;
};

const priceRowSchema = z
  .object({
    timestamp: z.string(),
    values: z
      .object({
        day_ahead_price: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

const priceEnvelopeSchema = z
  .object({
    data: z.array(z.unknown()).optional(),
  })
  .passthrough();

/** Quarter-hour or hourly points. Rows that do not match the feed are skipped. */
export function parseDayAheadPrices(body: unknown): DayAheadPricePoint[] {
  const envelope = priceEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return [];
  }
  const points: DayAheadPricePoint[] = [];
  for (const row of envelope.data.data ?? []) {
    const parsed = priceRowSchema.safeParse(row);
    if (!parsed.success || !Number.isFinite(parsed.data.values.day_ahead_price)) {
      continue;
    }
    const unixMs = Date.parse(parsed.data.timestamp);
    if (!Number.isFinite(unixMs)) {
      continue;
    }
    points.push({ unixMs, eurPerMwh: parsed.data.values.day_ahead_price });
  }
  return points;
}
