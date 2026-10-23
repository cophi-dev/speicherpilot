import NewsPreviewSection from "@/components/NewsPreviewSection";
import { NewsHero } from "@/components/news/NewsHero";

export default function NewsPage() {
  return (
    <div className="news-v2">
      <NewsHero />
      <div className="news-grad" aria-hidden="true" />
      <NewsPreviewSection place="page" />
    </div>
  );
}
