import Link from "next/link";

import { BlogFigure } from "@/components/blog/BlogFigure";
import { heroFigure, readingLabel, type BlogPost } from "@/content/blog/posts";

export function BlogIndex({ posts }: { posts: readonly BlogPost[] }) {
  return (
    <div className="blog" lang="de">
      <header className="day-hero blog-hero" aria-labelledby="blog-title">
        <div className="day-hero-inner">
          <p className="day-kicker">Blog</p>
          <h1 id="blog-title">Blog</h1>
        </div>
      </header>
      <div className="news-grad" aria-hidden="true" />
      <div className="day-paper">
        <div className="day-hero-inner">
          <ul className="blog-list">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="blog-card">
                  <h2>
                    <Link href={`/blog/${post.slug}`} className="blog-card-link">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="blog-subtitle">{post.description}</p>
                  <p className="blog-meta">
                    <time dateTime={post.published}>{post.publishedLabel}</time>
                    <span className="blog-meta-sep" aria-hidden="true"> · </span>
                    <span>{readingLabel(post.readingMinutes)}</span>
                  </p>
                  <BlogFigure figure={heroFigure(post)} />
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
