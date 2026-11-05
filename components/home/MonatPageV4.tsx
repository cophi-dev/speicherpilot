"use client";

import Link from "next/link";

import { getBerlinIsoWeekdayForDateKey } from "@/lib/berlinCalendar";
import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import {
  adjacentMonthWithData,
  buildMonatGrid,
  formatBerlinMonthLabel,
  monatPointe,
  type MonatDayCell,
} from "@/lib/monatCalendar";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

function dayMark(cell: MonatDayCell, compact = false): string {
  if (!cell.inSeries || !cell.record) {
    if (cell.future) {
      return "noch nicht";
    }
    return "—";
  }
  if (cell.record.surplusGwh >= 0.05) {
    return `${formatQuantity(cell.record.surplusGwh, "de", 1)} GWh`;
  }
  return compact ? "kein Übersch." : "kein Überschuss";
}

function cellClassName(cell: MonatDayCell): string {
  return [
    "v4-monat-cell",
    cell.record && cell.record.surplusGwh < 0.05 ? "is-dry" : "",
    cell.record && cell.record.surplusGwh >= 0.05 ? "is-surplus" : "",
    !cell.inSeries ? "is-empty" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function listRowClassName(cell: MonatDayCell): string {
  return [
    "v4-monat-list-row",
    cell.record && cell.record.surplusGwh < 0.05 ? "is-dry" : "",
    cell.record && cell.record.surplusGwh >= 0.05 ? "is-surplus" : "",
    !cell.inSeries ? "is-empty" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function isClickable(cell: MonatDayCell): boolean {
  return Boolean(cell.inSeries && cell.record && !cell.future);
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

function MonatCalendarGrid({ grid, pad, monthKey }: { grid: MonatDayCell[]; pad: number; monthKey: string }) {
  return (
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
        const mark = dayMark(cell, true);
        const className = cellClassName(cell);
        const inner = (
          <>
            <span className="v4-monat-day num">{cell.dayNum}</span>
            <span className="v4-monat-mark num">{mark}</span>
          </>
        );
        return isClickable(cell) ? (
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
  );
}

function MonatCalendarList({ grid, monthKey }: { grid: MonatDayCell[]; monthKey: string }) {
  return (
    <ul className="v4-monat-list v4-content" aria-label={`Tage im ${monthKey}`}>
      {grid.map((cell) => {
        const mark = dayMark(cell, false);
        const dateLabel = `${weekdayShort(cell.dateKey, "de")}, ${formatBerlinDayLabel(cell.dateKey)}`;
        const className = listRowClassName(cell);
        const inner = (
          <>
            <span className="v4-monat-list-date num">{dateLabel}</span>
            <span className="v4-monat-list-mark num">{mark}</span>
          </>
        );
        return (
          <li key={cell.dateKey}>
            {isClickable(cell) ? (
              <Link href={`/tag/${cell.dateKey}`} className={className}>
                {inner}
              </Link>
            ) : (
              <div className={className} aria-disabled={!cell.inSeries}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="monat-grid-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">Kalender</p>
          <h2 id="monat-grid-title" className="v4-chapter-h2">
            Tage im {formatBerlinMonthLabel(monthKey)}
          </h2>
        </div>
        <div className="v4-monat-grid-wrap">
          <MonatCalendarGrid grid={grid} pad={pad} monthKey={monthKey} />
        </div>
        <MonatCalendarList grid={grid} monthKey={monthKey} />
      </section>

      <p className="v4-chapter-foot v4-content num">
        <Link href="/" className="v4-text-link">
          Zur Startseite →
        </Link>
      </p>
    </div>
  );
}
