"use client";

import { MonatReglerHero } from "@/components/monat-regler/MonatReglerHero.client";
import type { MonatReglerCompact } from "@/lib/monatReglerAsset";
import type { ReglerKpiSource } from "@/lib/monatReglerKpis";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

export function MonatReglerGate({
  monthKey,
  factor,
  strategy,
  kpiSource,
  initialCompact = null,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  kpiSource: ReglerKpiSource;
  initialCompact?: MonatReglerCompact | null;
}) {
  return (
    <MonatReglerHero
      monthKey={monthKey}
      factor={factor}
      strategy={strategy}
      kpiSource={kpiSource}
      initialCompact={initialCompact}
    />
  );
}