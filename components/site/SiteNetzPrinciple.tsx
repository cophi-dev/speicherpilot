"use client";

import { useLanguage } from "@/components/language-context";

export function SiteNetzPrinciple() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <p className="site-netz-principle" role="note">
      {tx(
        "Speichern von Überschuss ist nicht automatisch netzdienlich — ob ein Speicher entlastet, hängt vom Anschluss und von der Fahrweise ab.",
        "Storing surplus is not automatically grid-supportive — whether storage relieves the grid depends on the connection and how it is operated."
      )}
    </p>
  );
}
