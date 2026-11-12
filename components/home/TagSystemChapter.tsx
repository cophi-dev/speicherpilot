"use client";

import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { weekdayLabelDe } from "@/lib/auffaelligkeit";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

export function TagSystemChapter({
  dayKey,
  record,
  dayOverview,
  fleetPowerGw,
  fleetEnergyGwh,
  lastSurplusKey,
  showFleetMonthBelow,
  fleetStrategyBelow,
  fleetDayNoWindSolarSurplus,
}: {
  dayKey: string;
  record: TagesKennzahlRecord;
  dayOverview: OverviewEvaluation | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  lastSurplusKey: string | null;
  /** Monatslauf-Kapitel folgt auf dieser Seite (Oktober-Modell). */
  showFleetMonthBelow?: boolean;
  fleetStrategyBelow?: NationalFleetStrategyUi | null;
  /** Monatslauf: max(0,W+S−Last) durchgehend 0 (29.10-Spitze). */
  fleetDayNoWindSolarSurplus?: boolean;
}) {
  const factor = dayOverview?.factors[1];
  const dayRow = factor?.dayRows.find((row) => row.dateBerlin === dayKey);
  const absorbed = dayRow?.absorbedGwh ?? record.absorbedGwh;
  const surplus = record.surplusGwh;
  const hasSurplus = surplus >= 0.05 && !fleetDayNoWindSolarSurplus;
  const sharePct =
    hasSurplus && surplus > 0 ? Math.round((absorbed / surplus) * 100) : Math.round((factor?.absorbedShare ?? 0) * 100);
  const socEnd = dayRow?.socEndFraction ?? factor?.socSeries.find((s) => s.dateBerlin === dayKey)?.socFraction;
  const socPct = socEnd != null ? Math.round(socEnd * 100) : null;
  const priceLine =
    record.pmin != null && record.pmax != null
      ? `${formatQuantity(Math.round(record.pmin), "de", 0)}–${formatQuantity(Math.round(record.pmax), "de", 0)} €/MWh`
      : null;

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-tag-system">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">02 · Das System</p>
        <h2 id="kapitel-tag-system" className="v4-chapter-h2">
          Speicher am {weekdayLabelDe(dayKey).replace(/\.$/, "")}
        </h2>
        {hasSurplus ? (
          <>
            <p className="v4-system-pct v4-tag-kern">{formatQuantity(sharePct, "de", 0)}&nbsp;%</p>
            <p className="v4-tag-side">
              des Überschusses hätte die heutige Flotte ({formatQuantity(fleetPowerGw, "de", 2)} GW,{" "}
              {formatQuantity(fleetEnergyGwh, "de", 2)} GWh) bei ×1 aufgenommen.{" "}
              <span className="v4-chip num">Modellschätzung</span>
            </p>
            {socPct != null ? (
              <p className="v4-tag-side">Ladestand am Tagesende im Modell: etwa {formatQuantity(socPct, "de", 0)}&nbsp;%.</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="v4-tag-kern">{formatQuantity(fleetEnergyGwh, "de", 2)} GWh</p>
            <p className="v4-tag-side">
              Nennenergie der heutigen Flotte ({formatQuantity(fleetPowerGw, "de", 2)} GW Leistung) — keine verfügbare
              Energie zum Ladetag, sondern Größenordnung des Speichers in der ×1-Referenz.
            </p>
            <p className="v4-tag-side">
              Im Überschuss-Lademodell an diesem Tag nichts zu laden.{" "}
              {lastSurplusKey ? (
                <Link href={`/tag/${lastSurplusKey}`} className="v4-chapter-next-link">
                  Letzter Überschusstag →
                </Link>
              ) : null}
            </p>
          </>
        )}
        {priceLine ? (
          <p className="v4-tag-side v4-tag-price-desktop">Day-Ahead: {priceLine}</p>
        ) : null}
      </div>
      {(showFleetMonthBelow && fleetStrategyBelow && fleetStrategyBelow !== "ueberschuss") || priceLine ? (
        <details className="v4-content v4-tag-system-footnote">
          <summary>Ergänzungen (Preis, Monatsmodell)</summary>
          {priceLine ? <p className="v4-tag-side">Börsenpreis Day-Ahead: {priceLine}</p> : null}
          {showFleetMonthBelow && fleetStrategyBelow && fleetStrategyBelow !== "ueberschuss" ? (
            <p className="v4-tag-side">
              Monatslauf unten (
              {fleetStrategyBelow === "spitze" ? "Spitze senken" : "Marktorientiert"}, Price Taker nur Marktfahrweise)
              rechnet Netzladung getrennt vom Überschuss-Modell.
            </p>
          ) : null}
        </details>
      ) : null}
      <p className="v4-chapter-foot v4-content">
        <Link href="/ort?sicht=projekt" className="v4-chapter-next-link">
          03 · Ort — Speicher am Anschluss →
        </Link>
      </p>
    </section>
  );
}
