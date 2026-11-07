import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  fleetMonatHref,
  NATIONAL_FLEET_MONTH_KEY,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export function NationalFleetDayChapter({
  dayKey,
  factor,
  strategy,
  run,
  slice,
}: {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  run: NationalFleetRunSeries;
  slice: NationalFleetDaySlice;
}) {
  const rows = slice.indices.map((i) => ({
    ts: run.timestamp_berlin[i],
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
        <h2 id="fleet-day-title" className="v4-chapter-h2">
          Ausschnitt aus dem Monatslauf (×{factor}, {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe})
        </h2>
        <p className="v4-subline">
          Durchgängiger SoC ohne Tages-Reset — gleiche Fahrweise wie im{" "}
          <Link href={fleetMonatHref(NATIONAL_FLEET_MONTH_KEY, factor, strategy)} className="v4-text-link">
            Oktober-Modell
          </Link>
          .
        </p>
      </div>

      <dl className="v4-fleet-kpis v4-content num">
        <div>
          <dt>SoC Tagesanfang (kontinuierlich)</dt>
          <dd>{formatQuantity(slice.socStartMwh / 1000, "de", 2)} GWh</dd>
        </div>
        <div>
          <dt>SoC Tagesende</dt>
          <dd>{formatQuantity(slice.socEndMwh / 1000, "de", 2)} GWh</dd>
        </div>
        <div>
          <dt>Ladung / Abgabe (Tag)</dt>
          <dd>
            {formatQuantity(slice.chargeMwh / 1000, "de", 2)} / {formatQuantity(slice.dischargeMwh / 1000, "de", 2)} GWh
          </dd>
        </div>
        <div>
          <dt>Max R / R′ (Tag)</dt>
          <dd>
            {formatQuantity(slice.maxRMw / 1000, "de", 2)} / {formatQuantity(slice.maxRPrimeMw / 1000, "de", 2)} GW
          </dd>
        </div>
      </dl>

      <details className="v4-content v4-fleet-day-table-wrap">
        <summary>Viertelstunden (MW / SoC MWh)</summary>
        <div className="v4-fleet-day-table-scroll">
          <table className="v4-fleet-day-table num">
            <thead>
              <tr>
                <th scope="col">Zeit</th>
                <th scope="col">Laden MW</th>
                <th scope="col">Entladen MW</th>
                <th scope="col">SoC Start</th>
                <th scope="col">SoC Ende</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ts}>
                  <td>{row.ts.slice(11, 16)}</td>
                  <td>{row.c > 0.0005 ? formatQuantity(row.c, "de", 1) : "—"}</td>
                  <td>{row.d > 0.0005 ? formatQuantity(row.d, "de", 1) : "—"}</td>
                  <td>{formatQuantity(row.e0, "de", 1)}</td>
                  <td>{formatQuantity(row.e1, "de", 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
