"use client";

import { Suspense, useCallback, useMemo, useState } from "react";

import {
  MonatArbeitWirkungChart,
  MonatDauerlinieChart,
  MonatKonzeptWerkbank,
} from "@/components/home/MonatKonzeptCharts";
import { MonatKonzeptAnnahmen } from "@/components/home/MonatKonzeptAnnahmen";
import styles from "@/components/home/monat-konzept.module.css";
import type { ArbeitWirkungModel } from "@/lib/monatKonzeptA";
import type { FleetSizeRow } from "@/lib/monatKonzeptA";
import type { DauerlinieModel } from "@/lib/monatKonzeptC";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

export function NationalFleetMonatKonzeptClient({
  monthKey,
  arbeit,
  dauer,
  factor,
  strategy,
  peakReductionGw,
  peakReductionPct,
  peakAfterGw,
  fleetSizes,
  marktX10Detail,
  plateauNote,
  fleetFootnote,
}: {
  monthKey: string;
  arbeit: ArbeitWirkungModel;
  dauer: DauerlinieModel;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  peakReductionGw: number;
  peakReductionPct: number;
  peakAfterGw: number;
  fleetSizes: FleetSizeRow[];
  marktX10Detail: { residualGw: number; chargeGw: number; priceEurMwh: number } | null;
  plateauNote: string | null;
  fleetFootnote: string;
}) {
  const [werkbenchOpen, setWerkbenchOpen] = useState(false);

  const onPointSelect = useCallback(() => {
    setWerkbenchOpen(true);
  }, []);

  const wirkungGw = useMemo(
    () => arbeit.points.find((p) => p.factor === factor && p.strategy === strategy)?.wirkungGw ?? 0,
    [arbeit.points, factor, strategy],
  );

  return (
    <div className={`v4-monat-konzept v4-content ${styles.konzeptRoot}`} data-testid="konzept-root">
      <MonatArbeitWirkungChart
        model={arbeit}
        monthKey={monthKey}
        activeFactor={factor}
        activeStrategy={strategy}
        fleetSizes={fleetSizes}
        marktX10Detail={marktX10Detail}
        onPointSelect={onPointSelect}
      />
      {werkbenchOpen ? (
        <MonatKonzeptWerkbank
          monthKey={monthKey}
          factor={factor}
          strategy={strategy}
          peakReductionGw={peakReductionGw}
          peakReductionPct={peakReductionPct}
          peakAfterGw={peakAfterGw}
          plateauNote={plateauNote}
        />
      ) : (
        <p className={`v4-footnote num ${styles.konzeptWerkbenchHint}`}>
          Punkt wählen (←→↑↓) — darunter öffnet sich die Viertelstundenkurve des Laufs.
        </p>
      )}
      <Suspense fallback={<div className="v4-content" style={{ minHeight: 320 }} />}>
        <MonatDauerlinieChart
          model={dauer}
          monthKey={monthKey}
          activeFactor={factor}
          activeStrategy={strategy}
          fleetAvailable
          peakAfterGw={peakAfterGw}
          wirkungGw={wirkungGw}
        />
      </Suspense>
      <MonatKonzeptAnnahmen fleetFootnote={fleetFootnote} />
    </div>
  );
}
