"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-context";
import bundledNews from "@/data/news.json";
import { formatNewsDate, parseNews, type NewsItem } from "@/lib/newsFeed";
import { plainNewsText } from "@/lib/newsText";

type NewsPlace = "page" | "home";

type NewsPreviewSectionProps = {
  limit?: number;
  place?: NewsPlace;
  /** Test seam. Production reads `data/news.json`. */
  items?: unknown;
};

const METHODIK_HREF = "/methodik";

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

function hasEuro(value: string): boolean {
  return /€|\bEUR\b|\bEuro\b/i.test(value);
}

/** Curated links from `data/news.json`. Rendered with the page, not fetched. */
export default function NewsPreviewSection({ limit = 3, place = "page", items }: NewsPreviewSectionProps) {
  const { language } = useLanguage();
  const de = language === "de";
  const news = parseNews(items ?? bundledNews)
    .filter((item) => !hasEuro(item.headline))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  if (place === "home" && news.length === 0) {
    return null;
  }

  const list = (
    <ol className="news-list">
      {news.map((item, index) => (
        <NewsRow key={`${item.date}-${item.url}`} item={item} heading={place === "home" ? "h3" : "h2"} featured={index === 0} de={de} />
      ))}
    </ol>
  );

  if (place === "home") {
    return (
      <div className="news-v2">
        <section className="day-paper news-home" id="home-news" aria-labelledby="home-news-title">
          <div className="day-hero-inner">
            <div className="news-home-head">
              <div>
                <p className="day-kicker">{de ? "News · geprüft" : "News · checked"}</p>
                <h2 id="home-news-title">{de ? "Aus dem Markt" : "From the market"}</h2>
              </div>
              <Link className="news-textlink" href="/news">
                {de ? "Alle News →" : "All news →"}
              </Link>
            </div>
            {list}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="day-paper news-sheet" aria-label={de ? "Geprüfte Meldungen" : "Checked reports"}>
      <div className="day-hero-inner">
        {news.length === 0 ? (
          <div className="news-empty" role="status">
            <p>{de ? "Gerade keine neuen geprüften Meldungen." : "No new checked reports right now."}</p>
            <Link className="news-textlink" href={METHODIK_HREF}>
              {de ? "Wie wir Meldungen prüfen" : "How we check reports"}
            </Link>
          </div>
        ) : (
          <>
            {list}
            <p className="news-foot">
              {de ? "Auswahl nach unseren Kriterien." : "Selected by our criteria."}{" "}
              <Link className="news-textlink" href={METHODIK_HREF}>
                {de ? "So prüfen wir Meldungen" : "How we check reports"}
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function NewsRow({
  item,
  heading: Heading,
  featured,
  de,
}: {
  item: NewsItem;
  heading: "h2" | "h3";
  featured: boolean;
  de: boolean;
}) {
  const headline = plainNewsText(item.headline);
  const source = plainNewsText(item.source);
  const teaser = item.teaser ? plainNewsText(item.teaser) : "";
  const showTeaser = Boolean(teaser) && !sameCopy(teaser, headline, source) && !hasEuro(teaser);
  return (
    <li className={featured ? "is-new" : undefined}>
      <article>
        <a className="news-row" href={item.url} target="_blank" rel="noopener noreferrer">
          <div className="news-meta">
            <time dateTime={item.date}>{formatNewsDate(item.date)}</time>
            <span className="news-dot" aria-hidden="true">
              ·
            </span>
            <span className="news-source">{source}</span>
          </div>
          <div className="news-body">
            <Heading className="news-title">{headline}</Heading>
            {showTeaser ? <p className="news-teaser">{teaser}</p> : null}
            <span className="news-go">
              {de ? `Lesen bei ${source}` : `Read at ${source}`}{" "}
              <span className="news-arr" aria-hidden="true">
                ↗
              </span>
              <span className="sr-only">{de ? "(öffnet in neuem Tab)" : "(opens in a new tab)"}</span>
            </span>
          </div>
        </a>
      </article>
    </li>
  );
}
