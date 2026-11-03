import { ModelChip } from "@/components/day-ring/ModelChip";
import { NetzDemo } from "@/components/netz/NetzDemo";
import { SiteGrenzeEloes } from "@/components/site/SiteGrenzeEloes";
import { SiteNetzPrinciple } from "@/components/site/SiteNetzPrinciple";
import { TestnetzHashScroll } from "@/components/site/TestnetzHashScroll";
import { loadNetzDemo, type NetzSelection } from "@/lib/netzDemo";

const demo = loadNetzDemo();

export function SiteOperatorSectionsServer({ selection }: { selection: NetzSelection }) {
  return (
    <div className="site-operator-extra mx-auto max-w-[1200px] px-4">
      <TestnetzHashScroll />
      <p className="day-kicker site-section-kicker">Netzbetreiber</p>
      <SiteGrenzeEloes />
      <section id="testnetz-n1" className="site-testnetz day-paper scroll-mt-24" aria-labelledby="testnetz-n1-title">
        <div className="day-hero-inner">
          <p className="day-kicker">
            Modell · SimBench <ModelChip label="MODELL" />
          </p>
          <h2 id="testnetz-n1-title" className="site-section-title site-testnetz-title">
            Testnetz (n-1)
          </h2>
          <p className="site-testnetz-lead">
            Was passiert im Netz dahinter, wenn eine Leitung oder ein Trafo ausfällt? Zahlen aus SimBench, keine Messung.
          </p>
          <NetzDemo data={demo} selection={selection} embedded surface="paper" />
        </div>
      </section>
    </div>
  );
}

/** @deprecated import SiteOperatorSectionsServer */
export const SiteOperatorSections = SiteOperatorSectionsServer;
