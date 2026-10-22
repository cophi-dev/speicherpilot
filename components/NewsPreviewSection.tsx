"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useLanguage } from "@/components/language-context";
import bundledNews from "@/data/news.json";
import { parseNews, type NewsItem } from "@/lib/newsFeed";
import { plainNewsText } from "@/lib/newsText";

type NewsPreviewSectionProps = {
  limit?: number;
  compact?: boolean;
  showHeaderLink?: boolean;
  /** Test seam. Production reads `data/news.json`. */
  items?: unknown;
};

function foldNews(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("de");
}

/** Drop a trailing " - Source" so a title and its teaser can be compared without the publisher. */
function withoutSourceSuffix(value: string, sourceName: string): string {
  const text = foldNews(value);
  const source = foldNews(sourceName);
  const suffix = source ? ` - ${source}` : "";
  if (suffix && text.endsWith(suffix)) {
    return text.slice(0, -suffix.length).trim();
  }
  return text;
}

function sameCopy(left: string, right: string, sourceName = ""): boolean {
  return withoutSourceSuffix(left, sourceName) === withoutSourceSuffix(right, sourceName);
}

function formatGermanDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) {
    return iso;
  }
  return `${day}.${month}.${year}`;
}

function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (öffnet sich in einem neuen Tab)</span>
    </a>
  );
}

/** Curated links from `data/news.json`. Rendered with the page, not fetched. */
export default function NewsPreviewSection({
  limit = 4,
  compact = false,
  showHeaderLink = true,
  items,
}: NewsPreviewSectionProps) {
  const { language } = useLanguage();
  const de = language === "de";
  const news = parseNews(items ?? bundledNews).slice(0, limit);

  return (
    <section aria-labelledby="curated-news-title">
      <div className="flex items-center justify-between gap-3">
        <p id="curated-news-title" className="text-xs tracking-[0.14em] text-slate-500 uppercase dark:text-slate-300">
          {de ? "SpeicherPilot-Newsfeed" : "SpeicherPilot Newsfeed"}
        </p>
        {showHeaderLink ? (
          <Link href="/news" className="text-xs font-semibold text-primary hover:underline dark:text-emerald-200">
            {de ? "Alle Meldungen" : "View all"}
          </Link>
        ) : null}
      </div>
      {!compact ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {de ? "Ausgewählte Meldungen, direkt von der Quelle." : "Selected reports, linked straight to the source."}
        </p>
      ) : null}

      {news.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Hier steht noch keine Meldung.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {news.map((item) => (
            <NewsCard key={`${item.date}-${item.url}`} item={item} readLabel={de ? "Lesen" : "Read"} />
          ))}
        </div>
      )}
    </section>
  );
}

function NewsCard({ item, readLabel }: { item: NewsItem; readLabel: string }) {
  const headline = plainNewsText(item.headline);
  const source = plainNewsText(item.source);
  const teaser = item.teaser ? plainNewsText(item.teaser) : "";
  const showTeaser = Boolean(teaser) && !sameCopy(teaser, headline, source);
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm transition hover:border-emerald-500/30 hover:shadow-md md:p-5">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500/90 via-amber-400/70 to-sky-500/70 opacity-90 transition group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative pl-2">
        <p className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          <time dateTime={item.date}>{formatGermanDate(item.date)}</time>
        </p>
        <h2 className="mt-3 text-base font-semibold leading-snug text-foreground md:text-lg">
          <ExternalLink href={item.url} className="transition hover:text-emerald-600 hover:underline dark:hover:text-emerald-300">
            {headline}
          </ExternalLink>
        </h2>
        {showTeaser ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{teaser}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          {source ? <p className="news-source">{source}</p> : null}
          <ExternalLink href={item.url} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400/90">
            {readLabel}
          </ExternalLink>
        </div>
      </div>
    </article>
  );
}
