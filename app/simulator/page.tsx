import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { SimulatorFahrweisenWorkbench } from "@/components/monat-v1/SimulatorFahrweisenWorkbench.client";
import styles from "@/components/monat-v1/monat-v1.module.css";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";

export const dynamic = "force-static";

function simulatorMeta(): Metadata {
  const teaser = loadEps70Teaser();
  const title = "Simulator · Fahrweisen · Oktober 2026";
  const description = `70 Prozent der Monatssenkung kosten ${teaser.costPctText} des Erlöses (ε-70, Flotte ×2, Modellschätzung). Monatsfront, Tageshorizont Regel T, Kipppunkt — national, kein Netzengpass, Vollvoraussicht.`;
  return {
    title,
    description,
    alternates: { canonical: "/simulator" },
    ...socialMeta({ title, description, url: "/simulator" }),
  };
}

export function generateMetadata(): Metadata {
  return simulatorMeta();
}

export default function SimulatorPage() {
  const data = loadSimulatorFahrweisen();
  return (
    <div className={`${styles.root} v4-content`} data-testid="simulator-page">
      <SimulatorFahrweisenWorkbench data={data} />
      <footer className={styles.pageFooter}>
        <p>
          Quellen, Annahmen und Rechtsrahmen:{" "}
          <a href="/methodik#simulator-annahmen" className="v4-text-link">
            Methodik → Simulator
          </a>
        </p>
      </footer>
    </div>
  );
}
