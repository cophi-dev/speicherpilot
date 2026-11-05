"use client";

import Link from "next/link";

import { getBerlinIsoWeekdayForDateKey } from "@/lib/berlinCalendar";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  adjacentMonthWithData,
  buildMonatGrid,
  formatBerlinMonthLabel,
  monatPointe,
  type MonatDayCell,
} from "@/lib/monatCalendar";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

function dayMark(cell: MonatDayCell): string {
  if (!cell.inSeries || !cell.record) {
    if (cell.future) {
      return "noch nicht";
    }
    return "—";
  }
  if (cell.record.surplusGwh >= 0.05) {
    return `${formatQuantity(cell.record.surplusGwh, "de", 1)} GWh`;
  }
  return "kein Übersch.";
}

export function MonatNav({
  monthKey,
  records,
}: {
  monthKey: string;
  records: TagesKennzahlRecord[];
}) {
  const prev = adjacentMonthWithData(monthKey, "prev", records);
  const next = adjacentMonthWithData(monthKey, "next", records);
  return (
    <nav className="v4-tag-nav v4-content" aria-label="Monat wählen">
      {prev ? (
        <Link href={`/monat/${prev}`} prefetch={false} className="v4-tag-nav-btn">
          ← Vormonat
        </Link>
      ) : (
        <span className="v4-tag-nav-btn is-disabled" aria-disabled="true">
          ← Vormonat
        </span>
      )}
      <span className="v4-tag-nav-date-label num">{formatBerlinMonthLabel(monthKey)}</span>
      {next ? (
        <Link href={`/monat/${next}`} prefetch={false} className="v4-tag-nav-btn">
          Folgemonat →
        </Link>
      ) : (
        <span className="v4-tag-nav-btn is-disabled" aria-disabled="true">
          Folgemonat →
        </span>
      )}
    </nav>
  );
}

export function MonatPageV4({
  monthKey,
  todayKey,
  lastCompleteDayKey,
  records,
  dataStand,
}: {
  monthKey: string;
  todayKey: string;
  lastCompleteDayKey: string;
  records: TagesKennzahlRecord[];
  dataStand: string;
}) {
  const { h1, subline } = monatPointe(monthKey, records);
  const grid = buildMonatGrid({ monthKey, records, todayKey, lastCompleteDayKey });
  const pad = grid[0] ? getBerlinIsoWeekdayForDateKey(grid[0].dateKey) - 1 : 0;

  return (
    <div className="v4-start monat-page">
      <MonatNav monthKey={monthKey} records={records} />
      <section className="v4-kopf" aria-labelledby="monat-h1">
        <div className="v4-kopf-inner v4-content">
          <p className="v4-kicker num">
            Monat · {formatBerlinMonthLabel(monthKey)} · Datenstand {dataStand}
          </p>
          <h1 id="monat-h1" className="v4-h1">
            {h1}
          </h1>
          <p className="v4-subline">{subline}</p>
          <p className="v4-subline">
            Die Reihe zeigt Tage aus der geladenen Kennzahlenfolge — keine erfundenen Kalendertage, keine
            Jahreskonflikte.
          </p>
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="monat-grid-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">Kalender</p>
          <h2 id="monat-grid-title" className="v4-chapter-h2">
            Tage im {formatBerlinMonthLabel(monthKey)}
          </h2>
        </div>
        <div className="v4-monat-grid v4-content" role="grid" aria-label={`Monat ${monthKey}`}>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <span key={d} className="v4-monat-dow num" role="columnheader">
              {d}
            </span>
          ))}
          {Array.from({ length: pad }).map((_, i) => (
            <span key={`pad-${i}`} className="v4-monat-pad" aria-hidden />
          ))}
          {grid.map((cell) => {
            const mark = dayMark(cell);
            const clickable = cell.inSeries && cell.record && !cell.future;
            const className = [
              "v4-monat-cell",
              cell.record && cell.record.surplusGwh < 0.05 ? "is-dry" : "",
              cell.record && cell.record.surplusGwh >= 0.05 ? "is-surplus" : "",
              !cell.inSeries ? "is-empty" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const inner = (
              <>
                <span className="v4-monat-day num">{cell.dayNum}</span>
                <span className="v4-monat-mark num">{mark}</span>
              </>
            );
            return clickable ? (
              <Link key={cell.dateKey} href={`/tag/${cell.dateKey}`} className={className} role="gridcell">
                {inner}
              </Link>
            ) : (
              <div key={cell.dateKey} className={className} role="gridcell" aria-disabled={!cell.inSeries}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <p className="v4-chapter-foot v4-content num">
        <Link href="/" className="v4-text-link">
          Zur Startseite →
        </Link>
      </p>
    </div>
  );
}
