import Link from "next/link";

import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { formatPeakKpi } from "@/lib/nationalFleetCharts";
import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  fleetMonatHref,
  fleetTagHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_MONTH_KEY,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export function NationalFleetDayChapter({
  dayKey,
  factor,
  strategy,
  run,
  slice,
  monthStats,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  run: NationalFleetRunSeries;
  slice: NationalFleetDaySlice;
  monthStats: NationalFleetMonthStats;
}) {
  const peakRpGw = slice.maxRPrimeMw / 1000;
  const peakRGw = slice.maxRMw / 1000;
  const peakReductionDayGw = peakRGw - peakRpGw;
  const peakReductionPct = peakRGw > 0 ? (peakReductionDayGw / peakRGw) * 100 : 0;
  const gridLossGwh = (slice.chargeMwh - slice.dischargeMwh) / 1000;
  const windSolarSurplusGwh = slice.windSolarSurplusMwh / 1000;
  const showPeakWithoutSurplus =
    strategy === "spitze" && slice.positiveSurplusQuarterHours === 0 && slice.chargeMwh > 1;

  const rows = slice.indices.map((i) => ({
    ts: run.timestamp_berlin[i],
    r: run.r_mw[i],
    c: run.c_mw[i],
    d: run.d_mw[i],
    e0: run.e_start_mwh[i],
    e1: run.e_end_mwh[i],
    rp: run.r_prime_mw[i],
  }));

  return (
    <section className="v4-chapter" aria-labelledby="fleet-day-title">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Modellflotte · {formatBerlinDayLabel(dayKey)}</p>
        <h2 id="fleet-day-title" className="v4-chapter-h2 v4-fleet-day-h2">
          Monatslauf-Ausschnitt (×{factor}, {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe})
        </h2>
        <p className="v4-subline">
          Hypothetischer Monatslauf-Ausschnitt (kein Tages-Reset). Hero/„01 · Der Tag“ = Beobachtung; hier die gewählte
          Fahrweise über alle Viertelstunden — auch ohne Tages-Überschuss kann Spitzen senken oder Energie verschieben.{" "}
          <Link href={fleetMonatHref(NATIONAL_FLEET_MONTH_KEY, factor, strategy)} className="v4-text-link">
            Zum Monatsmodell
          </Link>
          .
        </p>
      </div>

      <div className="v4-content v4-fleet-controls" role="group" aria-label="Szenario wählen">
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Größe</legend>
          <div className="v4-fleet-factor-row">
            {NATIONAL_FLEET_FACTORS.map((f) => (
              <Link
                key={f}
                href={fleetTagHref(dayKey, f, strategy)}
                className={`v4-fleet-pill${f === factor ? " is-active" : ""}`}
                aria-current={f === factor ? "true" : undefined}
              >
                ×{f}
              </Link>
            ))}
          </div>
        </fieldset>
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Ziel / Fahrweise</legend>
          <div className="v4-fleet-strategy-row">
            {(Object.keys(NATIONAL_FLEET_STRATEGY_UI) as NationalFleetStrategyUi[]).map((id) => (
              <Link
                key={id}
                href={fleetTagHref(dayKey, factor, id)}
                className={`v4-fleet-pill v4-fleet-pill-wide${id === strategy ? " is-active" : ""}`}
                aria-current={id === strategy ? "true" : undefined}
              >
                {NATIONAL_FLEET_STRATEGY_UI[id].shortDe}
              </Link>
            ))}
          </div>
        </fieldset>
      </div>

      {showPeakWithoutSurplus ? (
        <div className="v4-fleet-day-beleg v4-content" role="note">
          <p>
            <strong>Peaknutzen ohne Wind-Solar-Überschuss:</strong> an diesem Tag in allen {slice.indices.length}{" "}
            Viertelstunden max(0, Wind+Sonne − Last) = 0 GWh — die Fahrweise „Spitze senken“ lädt trotzdem{" "}
            {formatQuantity(slice.chargeMwh / 1000, "de", 2)} GWh aus dem Netz (Restlast steigt in der Ladephase) und
            gibt {formatQuantity(slice.dischargeMwh / 1000, "de", 2)} GWh ab. Tages-Spitze Restlast{" "}
            {formatQuantity(peakRGw, "de", 2)} → {formatQuantity(peakRpGw, "de", 2)} GW (−
            {formatQuantity(peakReductionDayGw, "de", 2)} GW, {formatQuantity(peakReductionPct, "de", 1)} %). SoC ohne
            Tagesreset: {formatQuantity(slice.socStartMwh / 1000, "de", 2)} →{" "}
            {formatQuantity(slice.socEndMwh / 1000, "de", 2)} GWh. Kein Nachweis für Abregelung, Kraftwerksstarts oder
            Kostenersparnis.
          </p>
          {dayKey === "2026-10-29" && factor === 1 ? (
            <p className="num" style={{ marginTop: 8 }}>
              Ladung 14:15–16:00 ist eine zulässige Minimax-Lösung dieses Modells — nicht der einzige Fahrplan (z. B. gleiche
              Wirkung mit Laden 12:00–13:45 bei unverändertem Entladen). Der Solver minimiert die Monatsspitze mit kleinem
              Durchsatz-Zusatz; die konkrete Uhrzeit ist kein Kosten-, Rampen- oder Preisoptimum.
            </p>
          ) : null}
        </div>
      ) : null}

      <dl className="v4-fleet-kpis v4-content num">
        <div>
          <dt>Wind-Solar-Überschuss (Tag, integriert)</dt>
          <dd>
            {slice.positiveSurplusQuarterHours === 0
              ? "0 GWh (keine positive Viertelstunde)"
              : `${formatQuantity(windSolarSurplusGwh, "de", 2)} GWh in ${slice.positiveSurplusQuarterHours} Viertelstunden`}
          </dd>
        </div>
        <div>
          <dt>SoC Tagesanfang (kontinuierlich)</dt>
          <dd>{formatQuantity(slice.socStartMwh / 1000, "de", 2)} GWh</dd>
        </div>
        <div>
          <dt>SoC Tagesende</dt>
          <dd>{formatQuantity(slice.socEndMwh / 1000, "de", 2)} GWh</dd>
        </div>
        <div>
          <dt>Netz-Ladung / -Abgabe (Tag)</dt>
          <dd>
            {formatQuantity(slice.chargeMwh / 1000, "de", 2)} / {formatQuantity(slice.dischargeMwh / 1000, "de", 2)} GWh
          </dd>
        </div>
        <div>
          <dt>Ladung minus Abgabe (Verlustkette)</dt>
          <dd>{formatQuantity(gridLossGwh, "de", 2)} GWh</dd>
        </div>
        <div>
          <dt>Max. Restlast / mit Speicher (Tag)</dt>
          <dd>
            {formatQuantity(peakRGw, "de", 2)} / {formatQuantity(peakRpGw, "de", 2)} GW (
            {peakReductionDayGw >= 0
              ? `Senkung ${formatQuantity(peakReductionDayGw, "de", 2)} GW`
              : `${formatQuantity(Math.abs(peakReductionDayGw), "de", 2)} GW höher`}
            )
          </dd>
        </div>
        <div>
          <dt>Monatskontext Spitze</dt>
          <dd>{formatPeakKpi(monthStats.peakAfterGw, monthStats.peakReductionGw, monthStats.peakReductionPct)}</dd>
        </div>
      </dl>

      <NationalFleetTimeSeriesChart
        monthKey={NATIONAL_FLEET_MONTH_KEY}
        factor={factor}
        strategy={strategy}
        dateKey={dayKey}
        peakReductionGw={monthStats.peakReductionGw}
        peakReductionPct={monthStats.peakReductionPct}
        peakReductionDayGw={peakReductionDayGw}
        peakObservedDayGw={peakRGw}
        scrollHint={`${slice.indices.length} Viertelstunden am ${formatBerlinDayLabel(dayKey)}`}
      />

      <details className="v4-content v4-fleet-day-table-wrap">
        <summary>Viertelstunden-Tabelle</summary>
        <div className="v4-fleet-day-table-scroll">
          <table className="v4-fleet-day-table num">
            <thead>
              <tr>
                <th scope="col">Zeit</th>
                <th scope="col">Restlast GW</th>
                <th scope="col">mit Speicher GW</th>
                <th scope="col">Laden MW</th>
                <th scope="col">Entladen MW</th>
                <th scope="col">SoC Start MWh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ts}>
                  <td>{row.ts.slice(11, 16)}</td>
                  <td>{formatQuantity(row.r / 1000, "de", 2)}</td>
                  <td>{formatQuantity(row.rp / 1000, "de", 2)}</td>
                  <td>{row.c > 0.0005 ? formatQuantity(row.c, "de", 1) : "—"}</td>
                  <td>{row.d > 0.0005 ? formatQuantity(row.d, "de", 1) : "—"}</td>
                  <td>{formatQuantity(row.e0, "de", 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
