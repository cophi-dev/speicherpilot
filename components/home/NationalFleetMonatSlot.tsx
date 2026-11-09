import { MonatArbeitWirkungChart, MonatDauerlinieChart, MonatKonzeptWerkbank } from "@/components/home/MonatKonzeptCharts";
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

  return (
    <>
      <MonatArbeitWirkungChart
        model={arbeit}
        monthKey={monthKey}
        activeFactor={factor}
        activeStrategy={strategy}
        marktX10Detail={marktX10Detail}
      />
      <MonatKonzeptWerkbank
        monthKey={monthKey}
        factor={factor}
        strategy={strategy}
        open
        peakReductionGw={stats.peakReductionGw}
        peakReductionPct={stats.peakReductionPct}
      />
      <MonatDauerlinieChart
        model={dauer}
        monthKey={monthKey}
        activeFactor={factor}
        activeStrategy={strategy}
        fleetAvailable
      />
      <footer className="v4-content v4-day-footnotes">
        <p className="v4-footnote num">
          Modellflotte {formatFleetFromMeta()} · Round-Trip 85&nbsp;%, SoC 10–90&nbsp;%, Day-Ahead Price Taker, perfekte
          Voraussicht, ohne Preisrückwirkung. Quelle Energy-Charts / SMARD CC BY 4.0.{" "}
          <a href="/methodik#monat-konzept-ac" className="v4-footnote-link">
            Methodik
          </a>
        </p>
      </footer>
    </>
  );
}

function formatFleetFromMeta(): string {
  const meta = loadNationalFleetBundleMeta();
  const mw = (meta.provenance?.model_fleet as { power_mw?: number; energy_mwh?: number }) ?? {};
  const gw = (mw.power_mw ?? 4580) / 1000;
  const gwh = (mw.energy_mwh ?? 8000) / 1000;
  return `${gw.toFixed(2).replace(".", ",")} GW / ${gwh.toFixed(0)} GWh (×1)`;
}
