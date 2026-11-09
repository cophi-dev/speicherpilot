import Link from "next/link";

import { BlogFigure } from "@/components/blog/BlogFigure";
import NewsPreviewSection from "@/components/NewsPreviewSection";
import { PageLead } from "@/components/PageLead";
import { MarktInsightsBlock } from "@/components/home/MarktInsightsBlock";
import { heroFigure, readingLabel, type BlogPost } from "@/content/blog/posts";
import type { MarktInsight } from "@/lib/marktInsights";

export function BeitraegePage({
  posts,
  marktInsights = [],
}: {
  posts: readonly BlogPost[];
  marktInsights?: MarktInsight[];
}) {
  return (
    <div className="beitraege v4-subpage" lang="de">
      <header className="v4-subpage-hero" aria-labelledby="beitraege-title">
        <div className="v4-content">
          <p className="v4-kicker num">Beiträge</p>
          <h1 id="beitraege-title" className="v4-h1">
            Beiträge
          </h1>
          <PageLead
            de="Artikel von SpeicherPilot und kuratierte externe Meldungen — zum Lesen. Veröffentlichen machen Sie selbst."
            en="Articles from SpeicherPilot and curated external reports — to read. You publish on your own channels."
          />
        </div>
      </header>
      {marktInsights.length > 0 ? <MarktInsightsBlock insights={marktInsights} title="Kontext aus den Daten" /> : null}
      <div className="v4-subpage-body">
        <div className="v4-content">
          <section id="artikel" aria-labelledby="beitraege-artikel-title">
            <h2 id="beitraege-artikel-title" className="v4-chapter-h2 beitraege-section-title">
              Artikel
            </h2>
            <ul className="blog-list">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="blog-card">
                    <h3>
                      <Link href={`/beitraege/${post.slug}`} className="blog-card-link v4-text-link">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="blog-subtitle">{post.description}</p>
                    <p className="blog-meta num">
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
            <h2 id="extern-gelesen-title" className="v4-chapter-h2 beitraege-section-title">
              Extern gelesen
            </h2>
            <NewsPreviewSection place="page" />
          </section>
        </div>
      </div>
    </div>
  );
}
