import { NationalFleetDayChapter } from "@/components/home/NationalFleetDayChapter";
import { fleetChartSeriesForDay } from "@/lib/nationalFleetSeriesPayload";
import {
  getFleetRun,
  monthStatsForRun,
  nationalFleetMonthAvailable,
  sliceFleetDay,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

export function NationalFleetTagSlot({
  dayKey,
  factor,
  strategy,
  preloadedBundle,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  preloadedBundle?: NationalFleetMonthBundle;
}) {
  if (!nationalFleetMonthAvailable(dayKey.slice(0, 7))) {
    return null;
  }
  const bundle = preloadedBundle ?? loadNationalFleetMonthBundle();
  const run = getFleetRun(bundle, factor, strategy);
  const slice = sliceFleetDay(run, dayKey);
  if (!slice) {
    return null;
  }
  const monthStats = monthStatsForRun(bundle, factor, strategy);
  const compareRun = factor !== 1 ? getFleetRun(bundle, 1, strategy) : null;
  const chartSeries = fleetChartSeriesForDay(run, compareRun, slice.indices, factor);

  return (
    <NationalFleetDayChapter
      dayKey={dayKey}
      factor={factor}
      strategy={strategy}
      run={run}
      slice={slice}
      monthStats={monthStats}
      chartSeries={chartSeries}
    />
  );
}

export function fleetDayNoWindSolarSurplus(slice: NationalFleetDaySlice | null | undefined): boolean {
  return (slice?.positiveSurplusQuarterHours ?? 1) === 0;
}
