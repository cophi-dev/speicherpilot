import { NationalFleetDayChapter } from "@/components/home/NationalFleetDayChapter";
import {
  monthStatsForRun,
  nationalFleetMonthAvailable,
  sliceFleetDay,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetRunSeries, nationalFleetContext } from "@/lib/nationalMonthFleetModel.server";

export function NationalFleetTagSlot({
  dayKey,
  factor,
  strategy,
  preloadedRun,
  isStartSurface = false,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  preloadedRun?: NationalFleetRunSeries;
  isStartSurface?: boolean;
}) {
  if (!nationalFleetMonthAvailable(dayKey.slice(0, 7))) {
    return null;
  }
  const monthKey = dayKey.slice(0, 7);
  const bundle = nationalFleetContext(factor, strategy, { monthKey, dayKey });
  const run = preloadedRun ?? loadNationalFleetRunSeries(factor, strategy, { monthKey, dayKey });
  const slice = sliceFleetDay(run, dayKey);
  if (!slice) {
    return null;
  }
  const monthStats = monthStatsForRun(bundle, factor, strategy, run);

  return (
    <NationalFleetDayChapter
      dayKey={dayKey}
      factor={factor}
      strategy={strategy}
      run={run}
      slice={slice}
      monthStats={monthStats}
      isStartSurface={isStartSurface}
    />
  );
}

export function fleetDayNoWindSolarSurplus(slice: NationalFleetDaySlice | null | undefined): boolean {
  return (slice?.positiveSurplusQuarterHours ?? 1) === 0;
}
