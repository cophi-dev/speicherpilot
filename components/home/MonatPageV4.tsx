import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import { MonatSurplusGraph } from "@/components/home/MonatSurplusGraph";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import { fleetTagHref, nationalFleetMonthAvailable } from "@/lib/nationalMonthFleetModel";
import {
  adjacentMonthWithData,
  buildMonatGrid,
  formatBerlinMonthLabel,
  monatPointe,
  type MonatDayCell,
} from "@/lib/monatCalendar";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";
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

function MonatCalendarList({
  grid,
  monthKey,
  fleetFactor,
  fleetStrategy,
}: {
  grid: MonatDayCell[];
  monthKey: string;
  fleetFactor?: NationalFleetFactor;
  fleetStrategy?: NationalFleetStrategyUi;
}) {
  const tagHref = (dateKey: string) =>
    fleetFactor && fleetStrategy && nationalFleetMonthAvailable(monthKey)
      ? fleetTagHref(dateKey, fleetFactor, fleetStrategy)
      : `/tag/${dateKey}`;
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
              <Link href={tagHref(cell.dateKey)} className={className}>
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
  fleetFactor,
  fleetStrategy,
  observationLive,
  observationFallbackNote,
  children,
}: {
  monthKey: string;
  todayKey: string;
  lastCompleteDayKey: string;
  records: TagesKennzahlRecord[];
  dataStand: string;
  fleetFactor?: NationalFleetFactor;
  fleetStrategy?: NationalFleetStrategyUi;
  observationLive?: boolean;
  observationFallbackNote?: string | null;
  children?: React.ReactNode;
}) {
  const { h1, subline } = monatPointe(monthKey, records);
  const grid = buildMonatGrid({ monthKey, records, todayKey, lastCompleteDayKey });
  const bars = barsFromMonatGrid(grid);
  const monthLabel = formatBerlinMonthLabel(monthKey);
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

      {children}

      <section className="v4-chapter" aria-labelledby="monat-graph-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">Beobachteter Überschuss</p>
          <h2 id="monat-graph-title" className="v4-chapter-h2">
            Positive Wind-Solar-Differenz je Tag im Monat
          </h2>
          <p className="v4-subline">
            {nationalFleetMonthAvailable(monthKey)
              ? observationLive
                ? "Gemessene Viertelstunden (Energy-Charts) — nicht identisch mit der Modellflotte oben."
                : "Eingefrorener Beobachtungsstand aus öffentlichen Energy-Charts-Daten (Live-API gerade nicht verfügbar). Modellflotte oben bleibt aus dem vorberechneten Oktober-Bundle."
              : observationLive
                ? "Gemessene Tageswerte — für diesen Monat liegt keine vorberechnete Modellflotte vor."
                : "Beobachtung aus eingefrorenen bzw. Live-Daten — kein Monatslauf der Modellflotte für diesen Monat."}
          </p>
          {!observationLive && observationFallbackNote ? (
            <p className="v4-fleet-observation-note num">{observationFallbackNote}</p>
          ) : null}
        </div>
        <MonatSurplusGraph
          monthKey={monthKey}
          bars={bars}
          fleetFactor={fleetFactor}
          fleetStrategy={fleetStrategy}
        />
        <details className="v4-monat-list-fallback v4-content">
          <summary>Tagesliste (Tabellenalternative)</summary>
          <MonatCalendarList
            grid={grid}
            monthKey={monthKey}
            fleetFactor={fleetFactor}
            fleetStrategy={fleetStrategy}
          />
        </details>
      </section>

      <p className="v4-chapter-foot v4-content num">
        <Link href="/" className="v4-text-link">
          Zur Startseite →
        </Link>
      </p>
    </div>
  );
}
