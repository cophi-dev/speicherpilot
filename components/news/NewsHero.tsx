"use client";

import { useLanguage } from "@/components/language-context";

export function NewsHero() {
  const { language } = useLanguage();
  const de = language === "de";
  return (
    <section className="day-hero news-hero" aria-labelledby="news-title">
      <div className="day-hero-inner">
        <p className="day-kicker">{de ? "News · geprüft" : "News · checked"}</p>
        <h1 id="news-title">
          {de
            ? "Was sich im Speichermarkt bewegt, geprüft und mit Quelle."
            : "What is moving in the storage market, checked and sourced."}
        </h1>
      </div>
    </section>
  );
}
