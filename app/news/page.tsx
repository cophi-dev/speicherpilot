import NewsPreviewSection from "@/components/NewsPreviewSection";
import { NewsHero } from "@/components/news/NewsHero";

export default function NewsPage() {
  return (
    <div className="news-v2">
      <NewsHero />
      <section className="day-paper">
        <div className="day-hero-inner">
          <NewsPreviewSection limit={20} showHeaderLink={false} />
        </div>
      </section>
    </div>
  );
}
