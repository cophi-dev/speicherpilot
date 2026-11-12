import { MonatV1Page } from "@/components/monat-v1/MonatV1Page";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import { buildMonatV1Model } from "@/lib/monatV1Model";
import { nationalFleetMonthAvailable, type NationalFleetFactor, type NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

export function NationalFleetMonatSlot({
  monthKey,
  factor: _factor,
  strategy: _strategy,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  bars?: unknown;
  surplusLine?: string;
  seriesLine?: string;
  marktInsights?: unknown;
}) {
  if (!nationalFleetMonthAvailable(monthKey)) {
    return <NationalFleetMonthUnavailable monthKey={monthKey} />;
  }

  const bundle = loadNationalFleetMonthBundle();
  const model = buildMonatV1Model(bundle);
  return <MonatV1Page model={model} monthKey={monthKey} />;
}
