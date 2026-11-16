"use client";

import dynamic from "next/dynamic";

import styles from "@/components/monat-regler/monat-regler.module.css";
import type { ReglerKpiSource } from "@/lib/monatReglerKpis";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

const MonatReglerHero = dynamic(
  () =>
    import("@/components/monat-regler/MonatReglerHero.client").then((m) => ({
      default: m.MonatReglerHero,
    })),
  {
    ssr: false,
    loading: () => (
      <div className={styles.hero} data-testid="monat-regler-placeholder">
        <h1 className={styles.h1}>Wie hätte eine größere Flotte den Oktober verändert?</h1>
        <p className={styles.placeholder}>Regler und Kurve laden nach dem ersten Paint …</p>
      </div>
    ),
  },
);

export function MonatReglerGate({
  monthKey,
  factor,
  strategy,
  kpiSource,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  kpiSource: ReglerKpiSource;
}) {
  return <MonatReglerHero monthKey={monthKey} factor={factor} strategy={strategy} kpiSource={kpiSource} />;
}