import { NationalFleetMonatKonzeptClient } from "@/components/home/NationalFleetMonatKonzeptClient";
import { fleetSizeRows, plateauPeakNoteFromGws } from "@/lib/monatKonzeptA";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import { buildArbeitWirkungModel } from "@/lib/monatKonzeptA";
import { buildDauerlinieFromRun } from "@/lib/monatKonzeptC";
import { marktPeakFootnoteFromRun } from "@/lib/nationalFleetThreeGoals";
import {
  getFleetRun,
  monthStatsForRun,
  nationalFleetMonthAvailable,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import {
  loadNationalFleetBundleMeta,
  loadNationalFleetMonthBundle,
  loadNationalFleetRunSeries,
} from "@/lib/nationalMonthFleetModel.server";

export function NationalFleetMonatSlot({
  monthKey,
  factor,
  strategy,
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
  const arbeit = buildArbeitWirkungModel(bundle);
  const observed = getFleetRun(bundle, 1, "ueberschuss");
  const activeRun = getFleetRun(bundle, factor, strategy);
  const dauer = buildDauerlinieFromRun(observed, activeRun);
  const stats = monthStatsForRun(bundle, factor, strategy);

  let marktX10Detail: { residualGw: number; chargeGw: number; priceEurMwh: number } | null = null;
  if (arbeit.compare.marktX10PeakTs) {
    const marktRun = loadNationalFleetRunSeries(10, "markt");
    const idx = marktRun.timestamp_berlin.indexOf(arbeit.compare.marktX10PeakTs);
    if (idx >= 0) {
      const d = marktPeakFootnoteFromRun(
        arbeit.compare.marktX10PeakTs,
        marktRun.r_mw[idx],
        marktRun.r_prime_mw[idx],
        marktRun.c_mw[idx],
        marktRun.day_ahead_eur_mwh[idx],
      );
      marktX10Detail = {
        residualGw: d.residualGw,
        chargeGw: d.chargeGw,
        priceEurMwh: d.priceEurMwh,
      };
    }
  }

  const meta = loadNationalFleetBundleMeta();
  const mw = (meta.provenance?.model_fleet as { power_mw?: number; energy_mwh?: number }) ?? {};
  const fleetSizes = fleetSizeRows(mw.power_mw ?? 4580, mw.energy_mwh ?? 8000);

  const plateauNote =
    factor >= 5 && strategy === "spitze"
      ? plateauPeakNoteFromGws(activeRun.r_prime_mw.map((mw) => mw / 1000))
      : null;

  return (
    <NationalFleetMonatKonzeptClient
      monthKey={monthKey}
      arbeit={arbeit}
      dauer={dauer}
      factor={factor}
      strategy={strategy}
      peakReductionGw={stats.peakReductionGw}
      peakReductionPct={stats.peakReductionPct}
      peakAfterGw={stats.peakAfterGw}
      fleetSizes={fleetSizes}
      marktX10Detail={marktX10Detail}
      plateauNote={plateauNote}
      fleetFootnote={formatFleetFromMeta()}
    />
  );
}

function formatFleetFromMeta(): string {
  const meta = loadNationalFleetBundleMeta();
  const mw = (meta.provenance?.model_fleet as { power_mw?: number; energy_mwh?: number }) ?? {};
  const gw = (mw.power_mw ?? 4580) / 1000;
  const gwh = (mw.energy_mwh ?? 8000) / 1000;
  return `${gw.toFixed(2).replace(".", ",")} GW / ${gwh.toFixed(0)} GWh (×1)`;
}
