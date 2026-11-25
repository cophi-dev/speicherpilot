import Link from "next/link";

import { formatThroughputLine, formatTagRevenueDelta, formatTagRevenueEur, loadTagFahrweisenErloese, missingRevenueHint } from "@/lib/tagFahrweisenErloese";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { fleetTagHref } from "@/lib/nationalMonthFleetModel";
import { REFERENCE_FLEET_REPO_FACTOR } from "@/lib/auffaelligkeitWoche";

/**
 * Referenzflotte (Repo-Stufe ×2): Tageserlöse der drei Fahrweisen plus Differenz Spitze minus Markt.
 * Zahlen und Durchsatz kommen ausschließlich aus data/auffaelligkeit-woche/tage/{datum}.json.
 */
export function TagFahrweisenErloese({ dayKey }: { dayKey: string }) {
  const view = loadTagFahrweisenErloese(dayKey);
  const delta = formatTagRevenueDelta(view);
  const missing = missingRevenueHint(view);

  return (
    <div className="v4-content v4-tag-erloese">
      <h3 className="v4-tag-erloese-title">Day-Ahead-Erlöse der Referenzflotte</h3>
      <p className="v4-tag-erloese-lead">
        Modellschätzung, Preisnehmer, eine Referenzflotte (auf dieser Seite Stufe ×{REFERENCE_FLEET_REPO_FACTOR}), nicht
        auf ×5/×10 hochgerechnet. Quelle: Schema auffaelligkeit-woche/1. Spitzen-Fahrweise: min. Tagesspitze, danach
        max. Erlös.{" "}
        {view.isolatedDayHorizon
          ? "Isolierter Tageshorizont (Start-SoC gleich End-SoC)."
          : "Für diesen Tag liegt noch keine Wochen-Datei vor."}{" "}
        Round-Trip-Wirkungsgrad der Rechnung: 85{"\u00a0"}%.
      </p>
      <div className="v4-fleet-day-table-scroll">
        <table className="v4-fleet-day-table num">
          <caption>Referenzflotte · {view.dayKey}</caption>
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
                <th scope="row">{row.labelDe}</th>
                <td>{row.revenueEur == null ? "steht aus" : formatTagRevenueEur(row.revenueEur)}</td>
                <td>{insertDisplayUnitNbsp(formatThroughputLine(row))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="v4-tag-erloese-delta">
        Differenz Spitze minus Markt:{" "}
        {delta ?? "steht aus (beide Werte in der Wochen-Datei nötig)"}
      </p>
      {missing ? <p className="v4-tag-erloese-missing">{missing}</p> : null}
    </div>
  );
}

export function TagFahrweisenErloeseHint({ dayKey }: { dayKey: string }) {
  return (
    <p className="v4-content v4-tag-erloese-hint">
      Day-Ahead-Erlöse der drei Fahrweisen stehen nur für die Referenzflotte (Stufe{" "}
      <Link href={fleetTagHref(dayKey, REFERENCE_FLEET_REPO_FACTOR, "spitze")} className="v4-text-link">
        ×{REFERENCE_FLEET_REPO_FACTOR}
      </Link>
      ), nicht linear hochgerechnet.
    </p>
  );
}
