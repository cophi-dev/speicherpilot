import Link from "next/link";
import { Suspense } from "react";

import { MonatSurplusGraph } from "@/components/home/MonatSurplusGraph";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  NATIONAL_FLEET_MONTH_KEYS,
  nationalFleetMonthAvailable,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import {
  adjacentAvailableMonths,
  buildMonatGrid,
  formatBerlinMonthLabel,
  formatBerlinMonthShort,
  formatDataStandDayDe,
  MONAT_SURPLUS_EXPLAIN_DE,
  monatPointe,
} from "@/lib/monatCalendar";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { FleetScrollRestore } from "@/components/home/FleetScrollRestore";
import { StartKompromissTeaser } from "@/components/home/SimulatorTeasers";
import type { Eps70TeaserUi } from "@/lib/simulatorTeaser.types";

export function MonatNav({
  monthKey,
  records,
}: {
  monthKey: string;
  records: TagesKennzahlRecord[];
}) {
  const hasFleetModel = nationalFleetMonthAvailable(monthKey);
  const { prev, next } = adjacentAvailableMonths(monthKey, records, NATIONAL_FLEET_MONTH_KEYS);
  return (
    <div className="v4-content">
      <nav className="v4-tag-nav" aria-label="Monat wählen">
        {prev ? (
          <Link href={`/monat/${prev}`} prefetch={false} className="v4-tag-nav-btn">
            ← Vormonat
          </Link>
        ) : (
          <span className="v4-tag-nav-btn is-disabled" aria-disabled="true" aria-label="Kein Vormonat vorhanden">
            ← Vormonat
          </span>
        )}
        <span className="v4-tag-nav-date-label num">
          {formatBerlinMonthLabel(monthKey)}
          {hasFleetModel ? "" : " · nur Beobachtung"}
        </span>
        {next ? (
          <Link href={`/monat/${next}`} prefetch={false} className="v4-tag-nav-btn">
            Folgemonat →
          </Link>
        ) : (
          <span className="v4-tag-nav-btn is-disabled" aria-disabled="true" aria-label="Kein Folgemonat vorhanden">
            Folgemonat →
          </span>
        )}
      </nav>
      <div className="v4-monat-model-months num">
        <span>Modellmonate mit Regler:</span>
        {NATIONAL_FLEET_MONTH_KEYS.map((mk) => (
          <Link
            key={mk}
            href={`/monat/${mk}`}
            prefetch={false}
            className="v4-text-link v4-monat-model-months-link"
            aria-current={mk === monthKey ? "page" : undefined}
          >
            {formatBerlinMonthLabel(mk)}
          </Link>
        ))}
        <span aria-hidden="true">·</span>
        <Link href="/jahr#saison-12m" prefetch={false} className="v4-text-link v4-monat-model-months-link">
          Alle 12{"\u00A0"}Monate (Jahr) →
        </Link>
      </div>
    </div>
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
  surplusBars,
  kompromissTeaser,
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
  /** Vorgebaute Balken — vermeidet doppeltes buildMonatGrid. */
  surplusBars?: import("@/lib/monatSurplusBars").MonatSurplusBar[];
  kompromissTeaser?: Eps70TeaserUi | null;
  children?: React.ReactNode;
}) {
  const { h1, subline, footnote } = monatPointe(monthKey, records, todayKey);
  const heroFootnote = footnote.replace(MONAT_SURPLUS_EXPLAIN_DE, "").trim();
  const fleetOnPage = nationalFleetMonthAvailable(monthKey);
  const standDay = formatDataStandDayDe(dataStand);
  const bars =
    surplusBars ??
    barsFromMonatGrid(
      buildMonatGrid({ monthKey, records, todayKey, lastCompleteDayKey }),
    );
  return (
    <div className={`v4-start monat-page${fleetOnPage ? " has-fleet-konzept monat-page-v1" : ""}`}>
      <Suspense fallback={null}>
        <FleetScrollRestore />
      </Suspense>
      <MonatNav monthKey={monthKey} records={records} />
      {!fleetOnPage ? (
        <section className="v4-kopf" aria-labelledby="monat-h1">
          <div className="v4-kopf-inner v4-content">
            <p className="v4-kicker num v4-kicker-long">
              Monat · {formatBerlinMonthLabel(monthKey)} · Datenstand {dataStand}
            </p>
            <p className="v4-kicker num v4-kicker-short">
              {formatBerlinMonthShort(monthKey)} · Datenstand {standDay}
            </p>
            <h1 id="monat-h1" className="v4-h1">
              {h1}
            </h1>
            <p className="v4-subline">{subline}</p>
            <p className="v4-footnote">{heroFootnote}</p>
          </div>
        </section>
      ) : null}

      {children}

      {fleetOnPage && kompromissTeaser ? <StartKompromissTeaser teaser={kompromissTeaser} /> : null}

      {fleetOnPage ? null : (
      <section className="v4-chapter" aria-labelledby="monat-graph-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">Beobachteter Überschuss</p>
          <h2 id="monat-graph-title" className="v4-chapter-h2">
            Positive Wind-Solar-Differenz je Tag im Monat
          </h2>
          <p className="v4-subline v4-monat-obs-subline-desktop">
            Beobachtete Überschuss-Kennzahl je Tag — nicht Spitzen- oder Preisnutzen.
          </p>
        </div>
        <details className="v4-content v4-monat-obs-disclosure">
          <summary>Warum hier keine Balken stehen</summary>
          <p className="v4-subline">
            Nur die beobachtete Überschuss-Kennzahl je Tag — kein Maß für Peak-Senkung, Preisarbitrage oder Abregelung.{" "}
            {nationalFleetMonthAvailable(monthKey)
              ? observationLive
                ? "Energy-Charts-Viertelstunden; die Modellflotte oben rechnet Spitzen- und Preisfahrweisen."
                : `Daten bis ${formatBerlinDayLabel(lastCompleteDayKey)}. Für ${formatBerlinMonthLabel(monthKey)} gibt es noch keine Modellrechnung.`
              : observationLive
                ? "Für diesen Monat keine vorberechnete Modellflotte."
                : "Beobachtung ohne Monatsmodell."}
            {!observationLive && observationFallbackNote ? ` ${observationFallbackNote}` : null}
          </p>
        </details>
        <MonatSurplusGraph
          monthKey={monthKey}
          bars={bars}
          fleetFactor={fleetFactor}
          fleetStrategy={fleetStrategy}
        />
      </section>
      )}

      <p className="v4-chapter-foot v4-content num">
        <Link href="/" className="v4-text-link">
          Zur Startseite →
        </Link>
      </p>
    </div>
  );
}
