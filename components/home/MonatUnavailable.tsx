import Link from "next/link";

import { adjacentMonthWithData, formatBerlinMonthLabel } from "@/lib/monatCalendar";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

export function MonatUnavailable({
  requestedMonth,
  records,
  lastCompleteDayKey,
}: {
  requestedMonth: string;
  records: TagesKennzahlRecord[];
  lastCompleteDayKey: string;
}) {
  const nearest =
    adjacentMonthWithData(requestedMonth, "next", records) ??
    adjacentMonthWithData(requestedMonth, "prev", records);
  const label = formatBerlinMonthLabel(requestedMonth);

  return (
    <div className="v4-start v4-content py-16">
      <p className="v4-kicker num">Monat</p>
      <h1 className="v4-h1">Für {label} liegen in der geladenen Reihe keine Tageskennzahlen.</h1>
      <p className="v4-subline mt-6">
        Das Datenfenster endet beim letzten vollständigen Tag ({lastCompleteDayKey}). Es werden keine fehlenden Tage
        erfunden.
      </p>
      <p className="mt-8 flex flex-wrap gap-6">
        {nearest ? (
          <Link href={`/monat/${nearest}`} className="v4-text-link">
            Nächster Monat mit Daten →
          </Link>
        ) : null}
        <Link href="/" className="v4-text-link">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}
