import { z } from "zod";

import type { FrequencySample } from "@/lib/liveStrip";

const frequencySchema = z.object({
  data: z.array(
    z.object({
      timestamp: z.string(),
      values: z.object({ frequency: z.number().nullable() }).passthrough(),
    })
  ),
});

/** Latest finite sample. A missing sample stays null and is not filled with 0 Hz. */
export function parseFrequency(payload: unknown): FrequencySample | null {
  const parsed = frequencySchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  for (let index = parsed.data.data.length - 1; index >= 0; index -= 1) {
    const row = parsed.data.data[index];
    const hertz = row.values.frequency;
    const unixMs = Date.parse(row.timestamp);
    if (typeof hertz === "number" && Number.isFinite(hertz) && Number.isFinite(unixMs)) {
      return { unixMs, hertz };
    }
  }
  return null;
}

/** A stable two-hour window so the fetch URL does not change every second. */
export function frequencyWindow(now: Date): { start: string; end: string } {
  const bucket = Math.floor(now.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000;
  const end = new Date(bucket);
  const start = new Date(bucket - 2 * 60 * 60 * 1000);
  return {
    start: start.toISOString().replace(".000Z", "Z"),
    end: end.toISOString().replace(".000Z", "Z"),
  };
}
