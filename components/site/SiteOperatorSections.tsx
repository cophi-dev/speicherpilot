"use client";

import { Suspense, useEffect } from "react";

import { ModelChip } from "@/components/day-ring/ModelChip";
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

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#testnetz-n1") {
      return;
    }
    const node = document.getElementById("testnetz-n1");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
      <section id="testnetz-n1" className="site-testnetz day-paper scroll-mt-24" aria-labelledby="testnetz-n1-title">
        <div className="day-hero-inner">
          <p className="day-kicker">
            {tx("Modell · SimBench", "Model · SimBench")}{" "}
            <ModelChip label={tx("MODELL", "MODEL")} />
          </p>
          <h2 id="testnetz-n1-title" className="site-section-title site-testnetz-title">
            {tx("Testnetz (n-1)", "Test grid (n-1)")}
          </h2>
          <p className="site-testnetz-lead">
            {tx(
              "Was passiert im Netz dahinter, wenn eine Leitung oder ein Trafo ausfällt? Zahlen aus SimBench, keine Messung.",
              "What happens behind the connection when a line or transformer fails? Figures from SimBench, not a measurement."
            )}
          </p>
          <NetzDemo data={demo} selection={selection} />
        </div>
      </section>
    </div>
  );
}
