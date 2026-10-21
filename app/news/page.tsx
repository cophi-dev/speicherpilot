"use client";

import NewsPreviewSection from "@/components/NewsPreviewSection";
import { useLanguage } from "@/components/language-context";

export default function NewsPage() {
  const { language } = useLanguage();
  const de = language === "de";
  return (
    <div className="news-v2">
      <section className="day-hero" aria-labelledby="news-title">
        <div className="day-hero-inner news-hero">
          <svg className="news-ring" viewBox="-40 -40 80 80" width="72" height="72" aria-hidden="true">
            <circle cx="0" cy="0" r="30" fill="none" stroke="#C5CED6" strokeWidth="2" />
          </svg>
          <p className="day-kicker">{de ? "Chronik" : "Chronicle"}</p>
          <h1 id="news-title">{de ? "Was sich bei Speichern geändert hat, steht hier in einem Satz." : "What changed for storage is written here in one sentence."}</h1>
        </div>
      </section>
      <section className="day-paper">
        <div className="day-hero-inner">
          <NewsPreviewSection limit={20} showHeaderLink={false} />
        </div>
      </section>
    </div>
  );
}
