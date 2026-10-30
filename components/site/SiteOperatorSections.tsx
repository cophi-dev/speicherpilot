"use client";

import { Suspense } from "react";

import { NetzDemo } from "@/components/netz/NetzDemo";
import { SzenarienPending, SzenarienRechner } from "@/components/szenarien/SzenarienRechner";
import { useLanguage } from "@/components/language-context";
import { loadNetzDemo, parseSelection } from "@/lib/netzDemo";
import { useSearchParams } from "next/navigation";

const demo = loadNetzDemo();

export function SiteOperatorSections() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const params = useSearchParams();
  const selection = parseSelection({
    fall: params.get("fall"),
    richtung: params.get("richtung"),
    knoten: params.get("knoten"),
    p: params.get("p"),
  });

  return (
    <div className="site-operator-extra">
      <section id="grenze-erloes" className="site-section">
        <h2>{tx("Grenze und Erlös", "Limit and revenue")}</h2>
        <Suspense fallback={<SzenarienPending />}>
          <SzenarienRechner />
        </Suspense>
      </section>
      <details id="testnetz-n1" className="site-fold site-section">
        <summary>{tx("Im Netz dahinter: Testnetz (n-1)", "Behind the grid: test grid (n-1)")}</summary>
        <NetzDemo data={demo} selection={selection} />
      </details>
    </div>
  );
}
