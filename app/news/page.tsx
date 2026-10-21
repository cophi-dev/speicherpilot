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
          <svg className="news-arc" viewBox="0 0 320 80" aria-hidden="true">
            <path d="M20 70 A140 140 0 0 1 300 70" fill="none" stroke="#C5CED6" strokeWidth="2" />
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
