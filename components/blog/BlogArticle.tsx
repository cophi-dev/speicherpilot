import type { ReactNode } from "react";
import Link from "next/link";

import { BlogFigure } from "@/components/blog/BlogFigure";
import { BLOG_FIGURES } from "@/content/blog/figures";
import type { Inline, SourceRow } from "@/content/blog/parseArticle";
import { heroFigure, readingLabel, type BlogPost } from "@/content/blog/posts";

function sourceMap(post: BlogPost): Map<string, SourceRow> {
  return new Map(post.sources.map((row) => [row.id, row]));
}

function Cite({ id, sources }: { id: string; sources: Map<string, SourceRow> }) {
  const row = sources.get(id);
  const label = row ? `${id}, ${row.quelle}` : id;
  return (
    <a href={`#${id.toLowerCase()}`} aria-label={label}>
      {id}
    </a>
  );
}

function Inlines({ items, sources }: { items: Inline[]; sources: Map<string, SourceRow> }) {
  return items.map((item, index) => {
    if (item.kind === "text") {
      return item.strong ? <strong key={index}>{item.text}</strong> : <span key={index}>{item.text}</span>;
    }
    return (
      <span key={index}>
        [
        {item.ids.map((id, citeIndex) => (
          <span key={id}>
            {citeIndex > 0 ? ", " : null}
            <Cite id={id} sources={sources} />
          </span>
        ))}
        ]
      </span>
    );
  });
}

export function BlogArticle({ post }: { post: BlogPost }) {
  const sources = sourceMap(post);
  const hero = heroFigure(post);
  const prose: ReactNode[] = [];
  const sheet: ReactNode[] = [];
  let headingId = "";
  const flush = () => {
    if (prose.length === 0) {
      return;
    }
    sheet.push(
      <div className="blog-prose prose" key={`prose-${sheet.length}`}>
        {prose.splice(0)}
      </div>
    );
  };

  post.blocks.forEach((block, index) => {
    if (block.type === "figure") {
      flush();
      sheet.push(<BlogFigure key={`figure-${block.figure}`} figure={BLOG_FIGURES[block.figure]} />);
      return;
    }
    if (block.type === "h2") {
      headingId = block.id;
      prose.push(<h2 key={block.id} id={block.id}>{block.text}</h2>);
      return;
    }
    if (block.type === "p") {
      prose.push(
        <p key={index}>
          <Inlines items={block.inlines} sources={sources} />
        </p>
      );
      return;
    }
    if (block.type === "ul" || block.type === "ol") {
      const List = block.type === "ul" ? "ul" : "ol";
      prose.push(
        <List key={index}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <Inlines items={item} sources={sources} />
            </li>
          ))}
        </List>
      );
      return;
    }
    if (block.type === "callout") {
      prose.push(
        <aside key={index} className="blog-callout" aria-labelledby="blog-callout-title">
          <h3 id="blog-callout-title">{block.title}</h3>
          <ul>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inlines items={item} sources={sources} />
              </li>
            ))}
          </ul>
          <p>
            <Inlines items={block.question} sources={sources} />
          </p>
        </aside>
      );
      return;
    }
    prose.push(
      <section key={index} className="blog-source-section" aria-labelledby={headingId || undefined}>
        <p id={`${headingId}-einleitung`}>{block.intro}</p>
        <table className="blog-sources">
          <thead>
            <tr>
              <th scope="col">Nr.</th>
              <th scope="col">Quelle</th>
              <th scope="col">Stand</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.flatMap((row) =>
              row.links.map((link, linkIndex) => (
                <tr key={`${row.id}-${link.href}`} id={linkIndex === 0 ? row.id.toLowerCase() : undefined}>
                  <th scope="row">{row.id}</th>
                  <td className="blog-source-title">
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.text}
                    </a>
                  </td>
                  <td className="blog-source-stand">{row.stand}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {block.note ? <p>{block.note}</p> : null}
      </section>
    );
  });
  flush();

  return (
    <article className="blog" lang="de">
      <header className="day-hero blog-hero">
        <div className="day-hero-inner">
          <p className="day-kicker">Blog</p>
          <h1>{post.title}</h1>
          <p className="blog-hero-lead">{post.description}</p>
          <p className="blog-meta">
            <time dateTime={post.published}>{post.publishedLabel}</time>
            <span className="blog-meta-sep" aria-hidden="true"> · </span>
            <span>{readingLabel(post.readingMinutes)}</span>
          </p>
          <p className="blog-stand">{post.standLine}</p>
          <BlogFigure figure={hero} />
        </div>
      </header>
      <div className="news-grad" aria-hidden="true" />
      <div className="day-paper">
        <div className="day-hero-inner blog-sheet">
          {sheet}
          <p className="blog-back prose">
            <Link href="/blog">Alle Beiträge</Link>
          </p>
        </div>
      </div>
    </article>
  );
}
