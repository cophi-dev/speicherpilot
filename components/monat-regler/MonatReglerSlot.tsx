import { MonatReglerGate } from "@/components/monat-regler/MonatReglerGate.client";
import { loadNationalFleetBundleMeta } from "@/lib/nationalMonthFleetModel.server";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

export function MonatReglerSlot({
  monthKey,
  factor,
  strategy,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
}) {
  const meta = loadNationalFleetBundleMeta(monthKey);
  return (
    <MonatReglerGate
      monthKey={monthKey}
      factor={factor}
      strategy={strategy}
      kpiSource={{ summary: meta.summary, provenance: meta.provenance }}
    />
  );
}