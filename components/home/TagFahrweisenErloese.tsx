import Link from "next/link";

import { formatThroughputLine, formatTagRevenueDelta, formatTagRevenueEur, loadTagFahrweisenErloese, missingRevenueHint } from "@/lib/tagFahrweisenErloese";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { fleetTagHref } from "@/lib/nationalMonthFleetModel";

/**
 * Nur ×1: Tageserlöse der drei Fahrweisen plus Differenz Spitze minus Markt.
 * Zahlen kommen ausschließlich aus dayAheadRevenueEur; fehlen sie, kein Schätzwert.
 */
export function TagFahrweisenErloese({ dayKey }: { dayKey: string }) {
  const view = loadTagFahrweisenErloese(dayKey);
  const delta = formatTagRevenueDelta(view);
  const missing = missingRevenueHint(view);

  return (
    <div className="v4-content v4-tag-erloese">
      <h3 className="v4-tag-erloese-title">Day-Ahead-Erlöse ×1</h3>
      <p className="v4-tag-erloese-lead">
        Modellschätzung, Preisnehmer, nur Stufe ×1, nicht auf ×2/×5/×10 hochgerechnet.{" "}
        {view.isolatedDayHorizon
          ? "Isolierter Tageshorizont (Start-SoC gleich End-SoC)."
          : "Es liegt noch kein isolierter Tageshorizont vor; die Erlöse gehören trotzdem nur in das Feld dayAheadRevenueEur der ×1-Tagesdateien."}{" "}
        Round-Trip-Wirkungsgrad der Rechnung: 85{"\u00a0"}% (AC zu AC, Methodik). Ob der Erlös die Verluste
        bereits enthält, gehört an das Feld dayAheadRevenueEur.
      </p>
      <div className="v4-fleet-day-table-scroll">
        <table className="v4-fleet-day-table num">
          <caption>Referenzflotte ×1 · {view.dayKey}</caption>
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
        {delta ?? `steht aus (beide Werte in ${view.revenueField} nötig)`}
      </p>
      {missing ? <p className="v4-tag-erloese-missing">{missing}</p> : null}
    </div>
  );
}

export function TagFahrweisenErloeseHint({ dayKey }: { dayKey: string }) {
  return (
    <p className="v4-content v4-tag-erloese-hint">
      Day-Ahead-Erlöse der drei Fahrweisen stehen nur in der{" "}
      <Link href={fleetTagHref(dayKey, 1, "spitze")} className="v4-text-link">
        ×1-Ansicht
      </Link>
      , nicht linear hochgerechnet.
    </p>
  );
}
