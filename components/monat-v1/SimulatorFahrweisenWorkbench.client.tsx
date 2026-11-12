"use client";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import { SimulatorParetoSection } from "@/components/monat-v1/SimulatorParetoSection.client";
import { SimulatorTagesSection } from "@/components/monat-v1/SimulatorTagesSection.client";
import { SimulatorBeispieltageSection } from "@/components/monat-v1/SimulatorBeispieltageSection.client";
import { SimulatorFnavSection } from "@/components/monat-v1/SimulatorFnavSection.client";
import { SimulatorLegalBox } from "@/components/monat-v1/SimulatorLegalBox";
import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";

export function SimulatorFahrweisenWorkbench({ data }: { data: SimulatorFahrweisenData }) {
  return (
    <div data-testid="simulator-werkbank" className={simStyles.simulatorRoot}>
      <p className={styles.eyebrow}>FAHRWEISEN · OKTOBER 2026 · MONATSHORIZONT</p>
      <div className={styles.chipRow}>
        <span className={styles.chip}>MODELL</span>
      </div>
      <p className={styles.lead} data-testid="simulator-vision-satz">
        Mehr Gigawatt helfen. Mehr Stunden helfen mehr.
      </p>
      <SimulatorParetoSection data={data} />
      <SimulatorTagesSection data={data} />
      <SimulatorBeispieltageSection data={data} />
      <SimulatorFnavSection data={data} />
      <SimulatorLegalBox />
    </div>
  );
}
