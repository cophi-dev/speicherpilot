import type { BlogFigure as BlogFigureAsset } from "@/content/blog/figures";

export function BlogFigure({ figure }: { figure: BlogFigureAsset }) {
  return (
    <figure className="blog-figure">
      <div className="blog-figure-scroll" role="region" tabIndex={0} aria-label="Abbildung, seitlich wischen">
        {/* SVG keeps its vectors. next/image does not optimize SVG, same as the lockup. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} />
      </div>
      <p className="blog-figure-swipe">← wischen →</p>
    </figure>
  );
}
