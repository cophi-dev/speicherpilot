import { MonatMarktInsightsDl } from "@/components/home/MonatMarktInsightsDl";
import { NationalFleetMonthChapter } from "@/components/home/NationalFleetMonthChapter";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import { NationalFleetThreeGoalsCompare } from "@/components/home/NationalFleetThreeGoalsCompare";
import type { MonatSurplusBar } from "@/lib/monatSurplusBars";
import {
  buildThreeGoalsCompare,
  formatMarktPeakFootnote,
  marktPeakFootnoteFromRun,
} from "@/lib/nationalFleetThreeGoals";
import {
  factorCompareRowsForStrategy,
  strategyMarginalForUi,
} from "@/lib/nationalFleetMarginal";
import {
  monthStatsForRun,
  nationalFleetMonthAvailable,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import {
  loadNationalFleetBundleMeta,
  loadNationalFleetRunSeries,
  nationalFleetContext,
} from "@/lib/nationalMonthFleetModel.server";
import type { MarktInsight } from "@/lib/marktInsights";

export function NationalFleetMonatSlot({
  monthKey,
  factor,
  strategy,
  bars,
  surplusLine,
  seriesLine,
  marktInsights = [],
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  bars: MonatSurplusBar[];
  surplusLine?: string;
  seriesLine?: string;
  marktInsights?: MarktInsight[];
}) {
  if (!nationalFleetMonthAvailable(monthKey)) {
    return <NationalFleetMonthUnavailable monthKey={monthKey} />;
  }

  const bundle = nationalFleetContext(factor, strategy);
  const stats = monthStatsForRun(bundle, factor, strategy);
  const run = loadNationalFleetRunSeries(factor, strategy);
  const marginalUi = strategyMarginalForUi(bundle, strategy);
  const factorRows = factorCompareRowsForStrategy(bundle, strategy);

  const compareModel = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
  let marktPeakFootnote: string | null = null;
  if (compareModel.marktX10PeakTs) {
    const marktRun = loadNationalFleetRunSeries(10, "markt");
    const idx = marktRun.timestamp_berlin.indexOf(compareModel.marktX10PeakTs);
    if (idx >= 0) {
      marktPeakFootnote = formatMarktPeakFootnote(
        marktPeakFootnoteFromRun(
          compareModel.marktX10PeakTs,
          marktRun.r_mw[idx],
          marktRun.r_prime_mw[idx],
          marktRun.c_mw[idx],
          marktRun.day_ahead_eur_mwh[idx],
        ),
      );
    }
  }

  return (
    <>
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
        surplusLine={surplusLine}
        seriesLine={seriesLine}
        insightsFooter={<MonatMarktInsightsDl insights={marktInsights} />}
      />
      <div className="v4-three-goals-slot">
        <NationalFleetThreeGoalsCompare
          model={compareModel}
          monthKey={monthKey}
          activeFactor={factor}
          activeStrategy={strategy}
          marktPeakFootnote={marktPeakFootnote}
        />
      </div>
    </>
  );
}
