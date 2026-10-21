import { z } from "zod";

const newsItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  url: z.string().url(),
  headline: z.string().min(1),
});

export type NewsItem = z.infer<typeof newsItemSchema>;

export const NEWS_MAX = 3;

/** Curated public links only. An empty file, or a file that fails validation, renders nothing. */
export function parseNews(payload: unknown): NewsItem[] {
  const parsed = z.array(newsItemSchema).safeParse(payload);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.slice(0, NEWS_MAX);
}
