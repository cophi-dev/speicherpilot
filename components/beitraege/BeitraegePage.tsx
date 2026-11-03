import Link from "next/link";

import { BlogFigure } from "@/components/blog/BlogFigure";
import NewsPreviewSection from "@/components/NewsPreviewSection";
import { PageLead } from "@/components/PageLead";
import { heroFigure, readingLabel, type BlogPost } from "@/content/blog/posts";

export function BeitraegePage({ posts }: { posts: readonly BlogPost[] }) {
  return (
    <div className="beitraege" lang="de">
      <header className="day-hero blog-hero" aria-labelledby="beitraege-title">
        <div className="day-hero-inner">
          <h1 id="beitraege-title">Beiträge</h1>
          <PageLead
            de="Artikel von SpeicherPilot und kuratierte externe Meldungen — zum Lesen. Veröffentlichen machen Sie selbst."
            en="Articles from SpeicherPilot and curated external reports — to read. You publish on your own channels."
          />
        </div>
      </header>
      <div className="news-grad" aria-hidden="true" />
      <div className="day-paper">
        <div className="day-hero-inner">
          <section id="artikel" aria-labelledby="beitraege-artikel-title">
            <h2 id="beitraege-artikel-title" className="beitraege-section-title">
              Artikel
            </h2>
            <ul className="blog-list">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="blog-card">
                    <h3>
                      <Link href={`/beitraege/${post.slug}`} className="blog-card-link">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="blog-subtitle">{post.description}</p>
                    <p className="blog-meta">
                      <time dateTime={post.published}>{post.publishedLabel}</time>
                      <span className="blog-meta-sep" aria-hidden="true">
                        {" "}
                        ·{" "}
                      </span>
                      <span>{readingLabel(post.readingMinutes)}</span>
                    </p>
                    <BlogFigure figure={heroFigure(post)} />
                  </article>
                </li>
              ))}
            </ul>
          </section>
          <section id="extern-gelesen" className="beitraege-extern" aria-labelledby="extern-gelesen-title">
            <h2 id="extern-gelesen-title" className="beitraege-section-title">
              Extern gelesen
            </h2>
            <NewsPreviewSection place="page" />
          </section>
        </div>
      </div>
    </div>
  );
}
