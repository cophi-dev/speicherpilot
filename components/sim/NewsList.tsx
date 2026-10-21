"use client";

import bundled from "@/data/news.json";

import { useLanguage } from "@/components/language-context";
import { parseNews, type NewsItem } from "@/lib/newsFeed";

function formatNewsDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) {
    return iso;
  }
  return `${day}.${month}.${year}`;
}

/** Curated public links. An empty file renders nothing, including no heading. */
export function NewsList({ items }: { items?: unknown }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const news = parseNews(items ?? bundled);
  if (news.length === 0) {
    return null;
  }
  return (
    <section className="sim-news" aria-labelledby="sim-news-title">
      <p className="sim-kicker">{tx("Neu im Netz", "New on the grid")}</p>
      <h2 id="sim-news-title" className="mt-2 text-2xl font-medium">
        {tx("Was diese Woche im Netz passiert ist", "What happened on the grid this week")}
      </h2>
      <ul>
        {news.map((item) => (
          <NewsRow key={`${item.date}-${item.url}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <li>
      <span className="d">{formatNewsDate(item.date)}</span>
      <span className="s">{item.source}</span>
      <a href={item.url}>{item.headline}</a>
    </li>
  );
}
