import { NationalFleetMonthChapter } from "@/components/home/NationalFleetMonthChapter";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import type { MonatSurplusBar } from "@/lib/monatSurplusBars";
import {
  factorCompareRowsForStrategy,
  strategyMarginalForUi,
} from "@/lib/nationalFleetMarginal";
import {
  getFleetRun,
  monthStatsForRun,
  nationalFleetMonthAvailable,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

export function NationalFleetMonatSlot({
  monthKey,
  factor,
  strategy,
  bars,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  bars: MonatSurplusBar[];
}) {
  if (!nationalFleetMonthAvailable(monthKey)) {
    return <NationalFleetMonthUnavailable monthKey={monthKey} />;
  }

  const bundle = loadNationalFleetMonthBundle();
  const stats = monthStatsForRun(bundle, factor, strategy);
  const run = getFleetRun(bundle, factor, strategy);
  const marginalUi = strategyMarginalForUi(bundle, strategy);
  const factorRows = factorCompareRowsForStrategy(bundle, strategy);

  return (
    <NationalFleetMonthChapter
      monthKey={monthKey}
      factor={factor}
      strategy={strategy}
      stats={stats}
      run={run}
      marginalSteps={marginalUi.steps}
      surplusPoolMarginal={marginalUi.surplusPoolOnly}
      factorRows={factorRows}
      bars={bars}
    />
  );
}
