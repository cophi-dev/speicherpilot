import { z } from "zod";

import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";

const newsItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  sourceShort: z.string().min(1).optional(),
  url: z.string().url(),
  headline: z.string().min(1),
  teaser: z.string().min(1).optional(),
  einordnung: z.string().min(1),
});

export type NewsItem = z.infer<typeof newsItemSchema>;

export const NEWS_HOME_LIMIT = 3;
/** Rollierendes Fenster auf /beitraege: 8–12 Wochen (Default 10). */
export const NEWS_EXTERN_WEEKS_DEFAULT = 10;
export const NEWS_EXTERN_WEEKS_MIN = 8;
export const NEWS_EXTERN_WEEKS_MAX = 12;

/** German editorial date, pinned to Berlin so a date-only value does not slip a day. */
export function formatNewsDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 11, 0, 0));
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Berlin",
  })
    .format(date)
    .replace(/\u00a0/g, " ");
}

function withoutEuroHeadline(items: NewsItem[]): NewsItem[] {
  return items.filter((item) => !hasEuro(item.headline));
}

function hasEuro(value: string): boolean {
  return /€|\bEUR\b|\bEuro\b/i.test(value);
}

/** Curated public links only. An empty file, or a file that fails validation, renders nothing. */
export function parseNews(payload: unknown): NewsItem[] {
  const parsed = z.array(newsItemSchema).safeParse(payload);
  if (!parsed.success) {
    return [];
  }
  return withoutEuroHeadline(parsed.data);
}

export function newsCutoffDateKey(weeks: number, now = new Date()): string {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  return addBerlinCalendarDays(todayKey, -weeks * 7);
}

export function filterNewsByWeeks(items: NewsItem[], weeks: number, now = new Date()): NewsItem[] {
  const clamped = Math.min(NEWS_EXTERN_WEEKS_MAX, Math.max(NEWS_EXTERN_WEEKS_MIN, weeks));
  const cutoff = newsCutoffDateKey(clamped, now);
  return items.filter((item) => item.date >= cutoff);
}

export function newsForHome(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, NEWS_HOME_LIMIT);
}

export function newsForExternPage(items: NewsItem[], weeks = NEWS_EXTERN_WEEKS_DEFAULT, now = new Date()): NewsItem[] {
  return filterNewsByWeeks(items, weeks, now).sort((a, b) => b.date.localeCompare(a.date));
}