import Link from "next/link";

import {
  formatThroughputLine,
  formatTagRevenueDelta,
  formatTagRevenueEur,
  loadTagFahrweisenErloese,
  readerMissingRevenueHint,
} from "@/lib/tagFahrweisenErloese";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { fleetTagHref, NATIONAL_FLEET_FACTOR_LABEL_DE } from "@/lib/nationalMonthFleetModel";
import { REFERENCE_FLEET_REPO_FACTOR } from "@/lib/auffaelligkeitWoche";

/**
 * Referenzflotte: Tageserlöse der drei Fahrweisen plus Differenz Spitze minus Markt.
 * Zahlen und Durchsatz kommen ausschließlich aus data/auffaelligkeit-woche/tage/{datum}.json.
 */
export function TagFahrweisenErloese({ dayKey }: { dayKey: string }) {
  const view = loadTagFahrweisenErloese(dayKey);
  const delta = formatTagRevenueDelta(view);
  const missing = readerMissingRevenueHint(view);

  return (
    <div className="v4-content v4-tag-erloese">
      <h3 className="v4-tag-erloese-title">Day-Ahead-Erlöse der Referenzflotte</h3>
      <p className="v4-tag-erloese-lead">
        Modellschätzung, Preisnehmer, eine zusätzliche Flotte so groß wie die heutigen Großspeicher (4,6{"\u00a0"}GW),
        nicht auf größere Stufen hochgerechnet. Spitzen-Fahrweise: min. Tagesspitze, danach max. Erlös.{" "}
        {view.isolatedDayHorizon
          ? "Isolierter Tageshorizont: Speicherstand am Abend wie am Morgen."
          : "Für diesen Tag fehlen die Erlöse der Tagesrechnung."}{" "}
        Round-Trip-Wirkungsgrad der Rechnung: 85{"\u00a0"}%.
      </p>
      <div className="v4-fleet-day-table-scroll">
        <table className="v4-fleet-day-table num">
          <caption>Referenzflotte · {formatBerlinDayLabel(view.dayKey)} · Modellschätzung</caption>
          <thead>
            <tr>
              <th scope="col">Fahrweise</th>
              <th scope="col">Day-Ahead-Erlös</th>
              <th scope="col">Durchsatz</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.strategy}>
                <th scope="row" className="v4-tag-erloese-fahrweise">{row.labelDe}</th>
                <td className="v4-tag-erloese-eur">{row.revenueEur == null ? "steht aus" : formatTagRevenueEur(row.revenueEur)}</td>
                <td className="v4-tag-erloese-eur">{insertDisplayUnitNbsp(formatThroughputLine(row))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="v4-tag-erloese-delta">
        Differenz Spitze minus Markt: {delta ?? "steht aus"}
      </p>
      {view.grenzeDe ? <p className="v4-tag-erloese-grenze">{insertDisplayUnitNbsp(view.grenzeDe)}</p> : null}
      {missing ? <p className="v4-tag-erloese-missing">{missing}</p> : null}
    </div>
  );
}

export function TagFahrweisenErloeseHint({ dayKey }: { dayKey: string }) {
  return (
    <p className="v4-content v4-tag-erloese-hint">
      Day-Ahead-Erlöse der drei Fahrweisen stehen nur für die Referenzflotte (
      <Link href={fleetTagHref(dayKey, REFERENCE_FLEET_REPO_FACTOR, "spitze")} className="v4-text-link">
        {NATIONAL_FLEET_FACTOR_LABEL_DE[REFERENCE_FLEET_REPO_FACTOR]}
      </Link>
      ), nicht linear hochgerechnet.
    </p>
  );
}
