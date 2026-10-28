import type { BlogFigure as BlogFigureAsset } from "@/content/blog/figures";

export function BlogFigure({ figure }: { figure: BlogFigureAsset }) {
  return (
    <figure className="blog-figure">
      {/* SVG keeps its vectors. next/image does not optimize SVG, same as the lockup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} />
    </figure>
  );
}
