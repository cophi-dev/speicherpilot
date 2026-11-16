import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { SimulatorFahrweisenWorkbench } from "@/components/monat-v1/SimulatorFahrweisenWorkbench.client";
import styles from "@/components/monat-v1/monat-v1.module.css";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";

export const dynamic = "force-static";

function kompromissMeta(): Metadata {
  const teaser = loadEps70Teaser();
  const title = "Kompromiss · Fahrweisen · Oktober 2026";
  const description = `${teaser.headlineDe} ${teaser.sublineDe}`;
  return {
    title,
    description,
    alternates: { canonical: "/kompromiss" },
    ...socialMeta({ title, description, url: "/kompromiss" }),
  };
}

export function generateMetadata(): Metadata {
  return kompromissMeta();
}

export default function KompromissPage() {
  const data = loadSimulatorFahrweisen();
  return (
    <div className={`${styles.root} v4-content`} data-testid="kompromiss-page">
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