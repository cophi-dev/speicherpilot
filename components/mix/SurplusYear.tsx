"use client";

import { useLanguage } from "@/components/language-context";
import type { SurplusMonthsFile } from "@/lib/surplusMonths";

function monthLabel(month: string): string {
  const [year, part] = month.split("-");
  return `${part}.${year.slice(2)}`;
}

export function SurplusYear({ data }: { data: SurplusMonthsFile }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [year, month, day] = data.generatedOn.split("-");
  const stand = `${day}.${month}.${year}`;
  const max = Math.max(1, ...data.months.map((row) => row.surplusDays));
  const caption = tx(
    `Überschusstage pro Monat, Stand ${stand}. Ein Tag zählt, wenn die Summe von max(0, Wind an Land + Wind auf See + Sonne − Last) mal 0,25 h über ${String(data.thresholdGwh).replace(".", ",")} GWh liegt. ${data.source}.`,
    `Surplus days per month, as of ${stand}. A day counts when the sum of max(0, onshore wind + offshore wind + solar − load) times 0.25 h is above ${data.thresholdGwh} GWh. ${data.source}.`
  );
  return (
    <section className="mix-year-block" aria-labelledby="surplus-year">
      <h3 id="surplus-year">{tx("Überschusstage pro Monat", "Surplus days per month")}</h3>
      <div className="mix-year" aria-hidden="true">
        {data.months.map((row) => (
          <div key={row.month}>
            <b>{row.surplusDays}</b>
            <i style={{ height: `${Math.max(2, (row.surplusDays / max) * 64)}px` }} />
            <span>{monthLabel(row.month)}</span>
          </div>
        ))}
      </div>
      <table className="mix-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{tx("Monat", "Month")}</th>
            <th scope="col">{tx("Tage mit Daten", "Days with data")}</th>
            <th scope="col">{tx("Überschusstage", "Surplus days")}</th>
          </tr>
        </thead>
        <tbody>
          {data.months.map((row) => (
            <tr key={row.month}>
              <th scope="row">{monthLabel(row.month)}</th>
              <td>{row.days}</td>
              <td>{row.surplusDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
