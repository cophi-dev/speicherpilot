"use client";

import Link from "next/link";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import { SimulatorParetoSection } from "@/components/monat-v1/SimulatorParetoSection.client";
import { SimulatorTagesSection } from "@/components/monat-v1/SimulatorTagesSection.client";
import { SimulatorBeispieltageSection } from "@/components/monat-v1/SimulatorBeispieltageSection.client";
import { SimulatorFnavSection } from "@/components/monat-v1/SimulatorFnavSection.client";
import { SimulatorLegalBox } from "@/components/monat-v1/SimulatorLegalBox";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";

export function SimulatorFahrweisenWorkbench({ data }: { data: SimulatorFahrweisenData }) {
  return (
    <div data-testid="simulator-werkbank" className={simStyles.simulatorRoot}>
      <p className={styles.eyebrow}>FAHRWEISEN · OKTOBER 2026 · MONATSHORIZONT</p>
      <div className={styles.chipRow}>
        <span className={styles.chip}>MODELL</span>
      </div>
      <h1 className="v4-h1" style={{ marginBottom: "0.5rem" }} data-testid="simulator-vision-satz">
        Fahrweise schlägt Größe.
      </h1>
      <p className={styles.lead}>
        {insertDisplayUnitNbsp(
          "Wie viel Spitzensenkung bringt ein dynamischer Leistungsdeckel (§ 17 Abs. 2b EnWG) — und wie wenig Börsenerlös kostet er? Gerechnet für ×2 im Oktober 2026. ",
        )}
        <Link href="/monat/2026-10" className="v4-text-link">
          Monatsmodell
        </Link>
        {" · "}
        <Link href="/knoten" className="v4-text-link">
          Knoten
        </Link>
      </p>
      <SimulatorParetoSection data={data} />
      <SimulatorTagesSection data={data} />
      <SimulatorBeispieltageSection data={data} />
      <SimulatorFnavSection data={data} />
      <SimulatorLegalBox />
    </div>
  );
}
