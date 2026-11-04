"use client";

import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { weekdayLabelDe } from "@/lib/auffaelligkeit";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { tagLastSurplusLine } from "@/lib/kopfTagCopy";

export function TagSystemChapter({
  dayKey,
  record,
  dayOverview,
  fleetPowerGw,
  fleetEnergyGwh,
  lastSurplusKey,
}: {
  dayKey: string;
  record: TagesKennzahlRecord;
  dayOverview: OverviewEvaluation | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  lastSurplusKey: string | null;
}) {
  const factor = dayOverview?.factors[1];
  const dayRow = factor?.dayRows.find((row) => row.dateBerlin === dayKey);
  const absorbed = dayRow?.absorbedGwh ?? record.absorbedGwh;
  const surplus = record.surplusGwh;
  const hasSurplus = surplus >= 0.05;
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
            <p className="v4-tag-kern num">{formatQuantity(absorbed, "de", 1)} GWh</p>
            <p className="v4-tag-side">
              hätte die heutige Flotte ({formatQuantity(fleetPowerGw, "de", 2)} GW,{" "}
              {formatQuantity(fleetEnergyGwh, "de", 2)} GWh) aus dem Überschuss von{" "}
              {formatQuantity(surplus, "de", 1)} GWh aufgenommen.{" "}
              <span className="v4-chip num">Modellschätzung</span>
            </p>
            {socPct != null ? (
              <p className="v4-tag-side num">Ladestand am Tagesende im Modell: etwa {formatQuantity(socPct, "de", 0)}&nbsp;%.</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="v4-tag-kern">Kein Überschuss</p>
            <p className="v4-tag-side">
              An diesem Tag blieb keine überschüssige Wind- und Solarstrom-Menge zum Laden.{" "}
              {tagLastSurplusLine(lastSurplusKey)}{" "}
              {lastSurplusKey ? (
                <Link href={`/tag/${lastSurplusKey}`} className="v4-text-link">
                  Tag ansehen →
                </Link>
              ) : null}
            </p>
          </>
        )}
        {priceLine ? (
          <p className="v4-tag-side num">
            Börsenpreis Day-Ahead: {priceLine}
          </p>
        ) : null}
      </div>
      <p className="v4-chapter-foot v4-content num">
        <Link href="/ort?sicht=projekt" className="v4-text-link">
          03 · Ort — Speicher am Anschluss →
        </Link>
      </p>
    </section>
  );
}
