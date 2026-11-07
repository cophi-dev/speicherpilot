import { formatQuantity } from "@/lib/formatQuantity";
import {
  type StrategyMarginalStep,
  type NationalFleetFactorCompareRow,
} from "@/lib/nationalFleetMarginal";
import {
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

function formatGw(gw: number, digits = 2): string {
  return formatQuantity(gw, "de", digits);
}

export function NationalFleetMarginalBenefit({
  strategy,
  factor,
  steps,
  surplusPoolOnly,
  factorRows,
  stats,
  baseStats,
}: {
  strategy: NationalFleetStrategyUi;
  factor: NationalFleetFactor;
  steps: StrategyMarginalStep[];
  surplusPoolOnly: boolean;
  factorRows: NationalFleetFactorCompareRow[];
  stats: NationalFleetMonthStats;
  baseStats: NationalFleetFactorCompareRow;
}) {
  const vsX1PeakGw = stats.peakReductionGw - baseStats.peakReductionGw;
  const vsX1CaptureGwh = stats.chargeGwh - baseStats.chargeGwh;

  return (
    <section className="v4-fleet-marginal v4-content" aria-labelledby="fleet-marginal-title">
      <h3 id="fleet-marginal-title" className="v4-fleet-marginal-h3">
        Zusatznutzen gegenüber ×1 und zwischen Ausbaustufen
      </h3>
      <p className="v4-fleet-marginal-lead">
        Gewähltes Szenario ×{factor} ({NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}): gegenüber ×1{" "}
        {vsX1PeakGw >= 0
          ? `${formatGw(vsX1PeakGw)} GW weniger Restlastspitze`
          : `${formatGw(Math.abs(vsX1PeakGw))} GW höhere Restlastspitze`}
        {strategy === "ueberschuss"
          ? ` und ${formatGw(vsX1CaptureGwh)} GWh mehr Aufnahme aus der Differenz`
          : strategy === "spitze"
            ? ` und ${formatGw(vsX1CaptureGwh)} GWh mehr netzseitiger Umsatz (technische Vollvoraussicht)`
            : vsX1PeakGw < 0
              ? " — marktorientierte Fahrt kann die Spitze anheben (kein Nutzenversprechen)."
              : ` und ${formatGw(vsX1CaptureGwh)} GWh mehr netzseitiger Umsatz (Day-Ahead-Historie, ohne Marktrückwirkung)`}{" "}
        · kein wirtschaftliches Optimum.
      </p>

      {!surplusPoolOnly ? (
        <p className="v4-fleet-marginal-note">
          Stufenwerte unten gelten für die gewählte Fahrweise „{NATIONAL_FLEET_STRATEGY_UI[strategy].labelDe}“, nicht für den
          Überschuss-Pool-Stufenblock im Datensatz.
        </p>
      ) : null}

      <table className="v4-fleet-marginal-table num">
        <caption className="sr-only">Stufenweise Zusatzwirkung zwischen Faktoren</caption>
        <thead>
          <tr>
            <th scope="col">Stufe</th>
            <th scope="col">Zusätzliche Nennleistung</th>
            <th scope="col">
              {strategy === "ueberschuss" ? "Mehr Differenz-Aufnahme (GWh)" : "Mehr netzseitiger Umsatz (GWh)"}
            </th>
            <th scope="col">Δ Spitzen-Senkung (GW)</th>
            <th scope="col">Hinweis</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((row) => (
            <tr
              key={`${row.from_factor}-${row.to_factor}`}
              className={factor === row.to_factor ? "is-active" : undefined}
            >
              <td>
                ×{row.from_factor} → ×{row.to_factor}
                <span className="v4-fleet-marginal-delta"> (+{row.delta_factor_units})</span>
              </td>
              <td>+{formatGw((row.to_factor - row.from_factor) * 4.58, 2)} GW</td>
              <td>{formatGw(row.delta_capture_gwh)}</td>
              <td>
                {row.delta_peak_reduction_mw >= 0
                  ? formatGw(row.delta_peak_reduction_mw / 1000)
                  : `${formatGw(Math.abs(row.delta_peak_reduction_mw) / 1000)} höher`}
              </td>
              <td>
                {row.delta_peak_reduction_mw < 0
                  ? "Spitze steigt in diesem Modell"
                  : surplusPoolOnly
                    ? "Pool 134,2 GWh"
                    : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="v4-fleet-marginal-table num v4-fleet-factor-compare">
        <caption className="sr-only">Alle Faktoren mit gleicher Fahrweise</caption>
        <thead>
          <tr>
            <th scope="col">Faktor</th>
            <th scope="col">Netz Ladung (GWh)</th>
            <th scope="col">Spitze nach Speicher (GW)</th>
            <th scope="col">Senkung ggü. ohne Speicher (GW)</th>
          </tr>
        </thead>
        <tbody>
          {factorRows.map((st) => (
            <tr key={st.factor} className={st.factor === factor ? "is-active" : undefined}>
              <td>×{st.factor}</td>
              <td>{formatGw(st.chargeGwh)}</td>
              <td>{formatGw(st.peakAfterGw)}</td>
              <td>
                {st.peakReductionGw >= 0
                  ? formatGw(st.peakReductionGw)
                  : `${formatGw(Math.abs(st.peakReductionGw))} höher`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
