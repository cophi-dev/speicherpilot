import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

const ROOT = join(process.cwd(), "data", "fca", "prices-12m.json");

let cached: number[] | null = null;

export function loadDayAheadPrices12m(): number[] {
  if (cached) {
    return cached;
  }
  const raw = JSON.parse(readFileSync(ROOT, "utf8")) as {
    pricesEurPerMwh?: number[];
    days?: Array<{ prices: number[] }>;
  };
  if (Array.isArray(raw.pricesEurPerMwh) && raw.pricesEurPerMwh.length >= 96) {
    cached = raw.pricesEurPerMwh.map((v) => Number(v));
    return cached;
  }
  const days = raw.days;
  if (!Array.isArray(days) || days.length === 0) {
    throw new Error("prices-12m.json missing price series");
  }
  cached = days.flatMap((day) => day.prices.map((v) => Number(v)));
  return cached;
}

export function pricesForProfileDay(dayIndex: number, profileLength: number, intervalMinutes: 15 | 60): number[] {
  const all = loadDayAheadPrices12m();
  const perDay = intervalMinutes === 15 ? 96 : 24;
  const daysInPrices = Math.floor(all.length / perDay);
  const day = dayIndex % daysInPrices;
  const start = day * perDay;
  const slice = all.slice(start, start + perDay);
  if (profileLength <= perDay) {
    return slice;
  }
  const out: number[] = [];
  for (let i = 0; i < profileLength; i += 1) {
    out.push(slice[i % perDay] ?? slice[0] ?? 0);
  }
  return out;
}

export function alignPricesToProfile(profileSamples: number, intervalMinutes: 15 | 60): number[] {
  const all = loadDayAheadPrices12m();
  const perDay = intervalMinutes === 15 ? 96 : 24;
  const days = Math.ceil(profileSamples / perDay);
  const out: number[] = [];
  for (let d = 0; d < days; d += 1) {
    const start = (d % Math.floor(all.length / perDay)) * perDay;
    for (let q = 0; q < perDay; q += 1) {
      out.push(all[start + q] ?? 0);
    }
  }
  return out.slice(0, profileSamples);
}

export const prices12mMetaSchema = z.object({
  source: z.string().optional(),
  start: z.string().optional(),
});
