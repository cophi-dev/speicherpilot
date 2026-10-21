"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-context";

export function MissingPage() {
  const { language } = useLanguage();
  const de = language === "de";
  return (
    <section className="day-hero day-missing" aria-labelledby="missing-title">
      <div className="day-missing-inner">
        <svg className="day-missing-ring" viewBox="-120 -120 240 240" width="280" height="280" aria-hidden="true">
          <circle cx="0" cy="0" r="96" fill="none" stroke="#C5CED6" strokeWidth="2" />
        </svg>
        <h1 id="missing-title">{de ? "Diese Seite gibt es nicht." : "This page does not exist."}</h1>
        <Link href="/">{de ? "Zur Startseite" : "To the start page"}</Link>
      </div>
    </section>
  );
}
