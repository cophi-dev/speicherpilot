import { z } from "zod";

const newsItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  url: z.string().url(),
  headline: z.string().min(1),
  teaser: z.string().min(1).optional(),
});

export type NewsItem = z.infer<typeof newsItemSchema>;

export const NEWS_MAX = 3;

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

/** Curated public links only. An empty file, or a file that fails validation, renders nothing. */
export function parseNews(payload: unknown): NewsItem[] {
  const parsed = z.array(newsItemSchema).safeParse(payload);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.slice(0, NEWS_MAX);
}
