import { formatQuantity } from "@/lib/formatQuantity";
import {
  NATIONAL_FLEET_STRATEGY_UI,
  type MarginalCaptureRow,
  type NationalFleetFactor,
  type NationalFleetFactorCompareRow,
  type NationalFleetMonthStats,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

function formatGw(gw: number, digits = 2): string {
  return formatQuantity(gw, "de", digits);
}

export function NationalFleetMarginalBenefit({
  strategy,
  factor,
  marginal,
  factorRows,
  stats,
  baseStats,
}: {
  strategy: NationalFleetStrategyUi;
  factor: NationalFleetFactor;
  marginal: MarginalCaptureRow[];
  factorRows: NationalFleetFactorCompareRow[];
  stats: NationalFleetMonthStats;
  baseStats: NationalFleetFactorCompareRow;
}) {
  const vsX1PeakGw = stats.peakReductionGw - baseStats.peakReductionGw;
  const vsX1CaptureGwh =
    strategy === "ueberschuss" && stats.surplusCaptureGwh != null
      ? stats.chargeGwh - baseStats.chargeGwh
      : stats.chargeGwh - baseStats.chargeGwh;

  return (
    <section className="v4-fleet-marginal v4-content" aria-labelledby="fleet-marginal-title">
      <h3 id="fleet-marginal-title" className="v4-fleet-marginal-h3">
        Zusatznutzen gegenüber ×1 und zwischen Ausbaustufen
      </h3>
      <p className="v4-fleet-marginal-lead">
        Gewähltes Szenario ×{factor} ({NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}): gegenüber ×1 zusätzlich{" "}
        {vsX1PeakGw >= 0
          ? `${formatGw(vsX1PeakGw)} GW weniger Restlastspitze`
          : `${formatGw(Math.abs(vsX1PeakGw))} GW höhere Restlastspitze`}{" "}
        und {formatGw(vsX1CaptureGwh)} GWh mehr netzseitiger Energieumsatz — kein wirtschaftliches Optimum, nur
        Modellrechnung.
      </p>

      <table className="v4-fleet-marginal-table num">
        <caption className="sr-only">Stufenweise Zusatzwirkung zwischen Faktoren</caption>
        <thead>
          <tr>
            <th scope="col">Stufe</th>
            <th scope="col">Zusätzliche Nennleistung</th>
            <th scope="col">Mehr Aufnahme / Umsatz (GWh)</th>
            <th scope="col">Mehr Spitzen-Senkung (GW)</th>
            <th scope="col">Je zusätzlichem GW Nennleistung (GWh/GW)</th>
          </tr>
        </thead>
        <tbody>
          {marginal.map((row) => (
            <tr
              key={`${row.from_factor}-${row.to_factor}`}
              className={factor === row.to_factor || (factor > row.from_factor && factor < row.to_factor) ? "is-active" : undefined}
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
              <td>{formatGw(row.delta_capture_per_added_gw_power_gwh_per_gw, 2)}</td>
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
