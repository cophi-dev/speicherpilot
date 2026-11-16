"use client";

import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { weekdayLabelDe } from "@/lib/auffaelligkeit";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

export function TagSystemChapter({
  dayKey,
  record,
  dayOverview,
  fleetPowerGw,
  fleetEnergyGwh,
  fleetDayNoWindSolarSurplus,
}: {
  dayKey: string;
  record: TagesKennzahlRecord;
  dayOverview: OverviewEvaluation | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  fleetDayNoWindSolarSurplus?: boolean;
}) {
  const factor = dayOverview?.factors[1];
  const dayRow = factor?.dayRows.find((row) => row.dateBerlin === dayKey);
  const absorbed = dayRow?.absorbedGwh ?? record.absorbedGwh;
  const surplus = record.surplusGwh;
  const hasSurplus = surplus >= 0.05 && !fleetDayNoWindSolarSurplus;
  const sharePct =
    hasSurplus && surplus > 0 ? Math.round((absorbed / surplus) * 100) : Math.round((factor?.absorbedShare ?? 0) * 100);

  const lead = hasSurplus ? (
    <>
      Die heutige Flotte ({formatQuantity(fleetPowerGw, "de", 2)} GW / {formatQuantity(fleetEnergyGwh, "de", 2)} GWh)
      hätte {formatQuantity(sharePct, "de", 0)}&nbsp;% des Überschusses aus Wind und Sonne aufgenommen (Modell).
    </>
  ) : (
    <>
      Die deutschen Großspeicher ({formatQuantity(fleetPowerGw, "de", 2)} GW /{" "}
      {formatQuantity(fleetEnergyGwh, "de", 2)} GWh Kapazität, Battery Charts) hatten nichts aufzunehmen: Wind und Sonne
      lagen den ganzen Tag unter dem Verbrauch. Fahrweisen nach Preis oder gegen die Abendspitze rechnen wir bisher für
      Oktober (
      <Link href="/monat/2026-10" className="v4-text-link">
        /monat/2026-10
      </Link>
      ).
    </>
  );

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-tag-system">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">02 · Das System</p>
        <h2 id="kapitel-tag-system" className="v4-chapter-h2">
          Speicher am {weekdayLabelDe(dayKey)}
          {hasSurplus ? "" : ": nichts geladen"}
        </h2>
        {hasSurplus ? (
          <p className="v4-system-pct v4-tag-kern">{formatQuantity(sharePct, "de", 0)}&nbsp;%</p>
        ) : (
          <p className="v4-tag-kern">0 GWh geladen</p>
        )}
        <p className="v4-tag-side">{lead}</p>
      </div>
    </section>
  );
}
