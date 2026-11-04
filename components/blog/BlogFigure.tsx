import type { BlogFigure as BlogFigureAsset } from "@/content/blog/figures";
import { isResponsiveBlogFigure } from "@/content/blog/figures";

import { BlogFigureA2, isBlogFigureA2 } from "@/components/blog/BlogFigureA2";

function BlogFigureImage({ figure }: { figure: BlogFigureAsset }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={figure.src}
      alt={figure.alt}
      width={figure.width}
      height={figure.height}
      loading="lazy"
      decoding="async"
    />
  );
}

export function BlogFigure({ figure, swipe = false }: { figure: BlogFigureAsset; swipe?: boolean }) {
  if (isBlogFigureA2(figure)) {
    return <BlogFigureA2 figure={figure} swipe={swipe} />;
  }

  if (isResponsiveBlogFigure(figure)) {
    const media = figure.mobile.media ?? "(max-width: 639px)";
    return (
      <figure className="blog-figure blog-figure-responsive">
        <picture className="blog-figure-picture">
          <source media={media} srcSet={figure.mobile.src} width={figure.mobile.width} height={figure.mobile.height} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={figure.src}
            alt={figure.alt}
            width={figure.width}
            height={figure.height}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </figure>
    );
  }

  if (!swipe) {
    return (
      <figure className="blog-figure blog-figure-title">
        <BlogFigureImage figure={figure} />
      </figure>
    );
  }

  return (
    <figure className="blog-figure blog-figure-pan">
      <div className="blog-figure-frame">
        <div className="blog-figure-scroll" role="region" tabIndex={0} aria-label="Abbildung, seitlich wischen">
          <BlogFigureImage figure={figure} />
        </div>
        <span className="blog-figure-fade" aria-hidden="true" />
        <p className="blog-figure-swipe blog-figure-swipe-over">← wischen →</p>
      </div>
      <p className="blog-figure-swipe">← wischen →</p>
    </figure>
  );
}
