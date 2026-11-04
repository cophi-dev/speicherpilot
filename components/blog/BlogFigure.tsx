import type { BlogFigure as BlogFigureAsset } from "@/content/blog/figures";

import { BlogFigureA2, isBlogFigureA2 } from "@/components/blog/BlogFigureA2";

export function BlogFigure({ figure, swipe = false }: { figure: BlogFigureAsset; swipe?: boolean }) {
  if (isBlogFigureA2(figure)) {
    return <BlogFigureA2 figure={figure} swipe={swipe} />;
  }

  if (!swipe) {
    return (
      <figure className="blog-figure blog-figure-title">
        {/* SVG keeps its vectors. next/image does not optimize SVG, same as the lockup. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          loading="lazy"
          decoding="async"
        />
      </figure>
    );
  }

  return (
    <figure className="blog-figure blog-figure-pan">
      <div className="blog-figure-frame">
        <div className="blog-figure-scroll" role="region" tabIndex={0} aria-label="Abbildung, seitlich wischen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
          src={figure.src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          loading="lazy"
          decoding="async"
        />
        </div>
        <span className="blog-figure-fade" aria-hidden="true" />
        <p className="blog-figure-swipe blog-figure-swipe-over">← wischen →</p>
      </div>
      <p className="blog-figure-swipe">← wischen →</p>
    </figure>
  );
}
