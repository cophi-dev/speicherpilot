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
    <div className="site-operator-extra mx-auto max-w-[1200px] px-4">
      <p className="day-kicker site-section-kicker">{tx("Netzbetreiber", "Grid operator")}</p>
      <details id="grenze-erloes" className="site-fold-manual site-section" open={false}>
        <summary>
          <h2 className="site-section-title">{tx("Grenze und Erlös", "Limit and revenue")}</h2>
        </summary>
        <Suspense fallback={<SzenarienPending />}>
          <SzenarienRechner />
        </Suspense>
      </details>
      <details id="testnetz-n1" className="site-fold-manual site-section" open={false}>
        <summary>
          <h2 className="site-section-title">{tx("Im Netz dahinter: Testnetz (n-1)", "Behind the grid: test grid (n-1)")}</h2>
        </summary>
        <NetzDemo data={demo} selection={selection} />
      </details>
    </div>
  );
}
