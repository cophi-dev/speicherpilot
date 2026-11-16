import Image from "next/image";

import type { Inline } from "@/content/blog/parseArticle";
import { inlineText } from "@/content/blog/parseArticle";

export function BlogMediaFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: Inline[];
}) {
  const isExternal = src.startsWith("http");
  return (
    <figure className="blog-figure blog-media-figure">
      {isExternal ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className="blog-media-img" />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          sizes="(max-width: 767px) 100vw, min(720px, 100vw)"
          className="blog-media-img"
        />
      )}
      {caption.length > 0 ? (
        <figcaption className="blog-media-caption">
          <em>{inlineText(caption)}</em>
        </figcaption>
      ) : null}
    </figure>
  );
}