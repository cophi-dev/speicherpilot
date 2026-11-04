import type { BlogFigure as BlogFigureAsset } from "@/content/blog/figures";

const A2_SRC = "/blog/A2_titelbild_1600x900.svg";

export function isBlogFigureA2(figure: BlogFigureAsset): boolean {
  return figure.src === A2_SRC;
}

export function BlogFigureA2({ figure, swipe = false }: { figure: BlogFigureAsset; swipe?: boolean }) {
  if (swipe) {
    return (
      <figure className="blog-figure blog-figure-pan blog-figure-a2">
        <div className="blog-figure-frame">
          <div className="blog-figure-scroll" role="region" tabIndex={0} aria-label="Abbildung, seitlich wischen">
            <BlogFigureA2Inner figure={figure} />
          </div>
          <span className="blog-figure-fade" aria-hidden="true" />
          <p className="blog-figure-swipe blog-figure-swipe-over">← wischen →</p>
        </div>
        <p className="blog-figure-swipe">← wischen →</p>
      </figure>
    );
  }

  return (
    <figure className="blog-figure blog-figure-title blog-figure-a2">
      <BlogFigureA2Inner figure={figure} />
    </figure>
  );
}

function BlogFigureA2Inner({ figure }: { figure: BlogFigureAsset }) {
  return (
    <div className="blog-figure-a2-frame">
      <div className="blog-figure-a2-chart-area">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="blog-figure-a2-chart"
          src={figure.src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
        />
        <div className="blog-figure-a2-overlay" aria-hidden="true">
          <p className="blog-figure-a2-kicker">DAY-AHEAD · VIERTELSTUNDE · DE-LU</p>
          <p className="blog-figure-a2-date">03.11.2026</p>
          <p className="blog-figure-a2-label blog-figure-a2-label-min">218,62 €/MWh · 12:00</p>
          <p className="blog-figure-a2-label blog-figure-a2-label-max">324,95 €/MWh · 17:30</p>
          <p className="blog-figure-a2-source">Quelle: SMARD (Bundesnetzagentur), Filter 4169, CC BY 4.0</p>
        </div>
      </div>
      <div className="blog-figure-a2-mobile-foot" aria-hidden="true">
        <p className="blog-figure-a2-label blog-figure-a2-foot-min">218,62 €/MWh · 12:00</p>
        <p className="blog-figure-a2-foot-source">Quelle: SMARD (Bundesnetzagentur), Filter 4169, CC BY 4.0</p>
      </div>
    </div>
  );
}
