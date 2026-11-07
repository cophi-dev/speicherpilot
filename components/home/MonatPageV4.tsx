import Link from "next/link";

import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { MonatSurplusGraph } from "@/components/home/MonatSurplusGraph";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import { nationalFleetMonthAvailable } from "@/lib/nationalMonthFleetModel";
import {
  adjacentMonthWithData,
  buildMonatGrid,
  formatBerlinMonthLabel,
  monatPointe,
  type MonatDayCell,
} from "@/lib/monatCalendar";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

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
            Nur die beobachtete Überschuss-Kennzahl je Tag — kein Maß für Peak-Senkung, Preisarbitrage oder Abregelung.{" "}
            {nationalFleetMonthAvailable(monthKey)
              ? observationLive
                ? "Gemessene Viertelstunden (Energy-Charts); die Modellflotte oben rechnet zusätzlich Spitzen- und Preisfahrweisen über den ganzen Monat."
                : "Eingefrorener Beobachtungsstand (Live-API gerade nicht verfügbar). Modellflotte oben aus dem Oktober-Bundle."
              : observationLive
                ? "Gemessene Tageswerte — für diesen Monat keine vorberechnete Modellflotte (das ist kein Null-Nutzen-Urteil)."
                : "Beobachtung aus eingefrorenen bzw. Live-Daten — kein Monatsmodell für diesen Monat."}
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
      </section>

      <p className="v4-chapter-foot v4-content num">
        <Link href="/" className="v4-text-link">
          Zur Startseite →
        </Link>
      </p>
    </div>
  );
}
