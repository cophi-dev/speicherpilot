"use client";

import Link from "next/link";

import { EmptyRing } from "@/components/day-ring/EmptyRing";
import { useLanguage } from "@/components/language-context";

export function MissingPage() {
  const { language } = useLanguage();
  const de = language === "de";
  return (
    <section className="day-hero day-missing" aria-labelledby="missing-title">
      <div className="day-missing-inner">
        <p className="day-kicker">{de ? "Fehler 404" : "Error 404"}</p>
        <div className="day-missing-split">
          <EmptyRing label={de ? "Leerer Tag" : "Empty day"} ticks center="404" />
          <div>
            <h1 id="missing-title">{de ? "Diese Seite gibt es nicht. Der Ring bleibt leer." : "This page does not exist. The ring stays empty."}</h1>
            <p>{de ? "Ohne Daten zeichnen wir nichts, nur den Umriss eines Tages." : "Without data we draw nothing, only the outline of a day."}</p>
            <div className="day-cta-row">
              <Link className="day-cta" href="/">{de ? "Zur Startseite" : "To the start page"}</Link>
              <Link className="day-textlink" href="/live">{de ? "Live ansehen" : "View live"}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
