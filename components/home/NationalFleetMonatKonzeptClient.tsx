"use client";

import { Suspense, useCallback, useState } from "react";

import {
  MonatArbeitWirkungChart,
  MonatDauerlinieChart,
  MonatKonzeptWerkbank,
} from "@/components/home/MonatKonzeptCharts";
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

  return (
    <div className="v4-monat-konzept monatKonzeptRoot">
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
        <p className="v4-content v4-footnote num" style={{ margin: "12px 0 24px", fontSize: 12 }}>
          Punkt wählen (tippen oder ←→↑↓) — darunter öffnet sich die Viertelstundenkurve des Laufs.
        </p>
      )}
      <Suspense fallback={<div className="v4-content" style={{ minHeight: 320 }} />}>
        <MonatDauerlinieChart
          model={dauer}
          monthKey={monthKey}
          activeFactor={factor}
          activeStrategy={strategy}
          fleetAvailable
        />
      </Suspense>
      <footer className="v4-content v4-day-footnotes v4-monat-slot-foot">
        <p className="v4-footnote num">
          Modellflotte {fleetFootnote} · Round-Trip 85&nbsp;%, SoC 10–90&nbsp;%, Day-Ahead Price Taker, perfekte
          Voraussicht, ohne Preisrückwirkung. Quelle Energy-Charts / SMARD CC BY 4.0.{" "}
          <a href="/methodik#monat-konzept-ac" className="v4-footnote-link">
            Methodik
          </a>
        </p>
      </footer>
    </div>
  );
}
