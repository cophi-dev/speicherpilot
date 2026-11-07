import { NationalFleetDayChapter } from "@/components/home/NationalFleetDayChapter";
import {
  getFleetRun,
  monthStatsForRun,
  nationalFleetMonthAvailable,
  sliceFleetDay,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

export function NationalFleetTagSlot({
  dayKey,
  factor,
  strategy,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
}) {
  if (!nationalFleetMonthAvailable(dayKey.slice(0, 7))) {
    return null;
  }
  const bundle = loadNationalFleetMonthBundle();
  const run = getFleetRun(bundle, factor, strategy);
  const slice = sliceFleetDay(run, dayKey);
  if (!slice) {
    return null;
  }
  const compareRun = factor !== 1 ? getFleetRun(bundle, 1, strategy) : null;
  const monthStats = monthStatsForRun(bundle, factor, strategy);

  return (
    <NationalFleetDayChapter
      dayKey={dayKey}
      factor={factor}
      strategy={strategy}
      run={run}
      slice={slice}
      compareRun={compareRun}
      monthStats={monthStats}
    />
  );
}
