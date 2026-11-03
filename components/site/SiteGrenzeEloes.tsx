"use client";

import { Suspense } from "react";

import { SzenarienPending, SzenarienRechner } from "@/components/szenarien/SzenarienRechner";
import { useLanguage } from "@/components/language-context";

export function SiteGrenzeEloes() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <details id="grenze-erloes" className="site-fold-manual site-section" open>
      <summary>
        <h2 className="site-section-title">{tx("Grenze und Erlös", "Limit and revenue")}</h2>
      </summary>
      <Suspense fallback={<SzenarienPending />}>
        <SzenarienRechner />
      </Suspense>
    </details>
  );
}
