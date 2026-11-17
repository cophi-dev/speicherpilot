"use client";

import { formatDeGwGwhLine, formatDePercentInt } from "@/lib/displayUnitFormat";
import { formatQuantity } from "@/lib/formatQuantity";
import { formatGwReduction } from "@/lib/monatV1Format";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { weekdayLabelDe } from "@/lib/auffaelligkeit";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import {
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import type { TagFleetSoGerechnetExtra } from "@/components/home/TagSoGerechnet";

const NBSP = "\u00a0";

const TAG_NO_SURPLUS_STRATEGY_HEADLINE: Record<NationalFleetStrategyUi, string> = {
  ueberschuss: "Überschuss aufnehmen",
  spitze: "Spitze senken",
  markt: "Nach Preis gefahren",
};

export function TagSystemChapter({
  dayKey,
  record,
  dayOverview,
  fleetPowerGw,
  fleetEnergyGwh,
  fleetDayNoWindSolarSurplus,
  fleetFactor = 2,
  fleetStrategy = "spitze",
  fleetSoGerechnet = null,
}: {
  dayKey: string;
  record: TagesKennzahlRecord;
  dayOverview: OverviewEvaluation | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  fleetDayNoWindSolarSurplus?: boolean;
  fleetFactor?: NationalFleetFactor;
  fleetStrategy?: NationalFleetStrategyUi;
  fleetSoGerechnet?: TagFleetSoGerechnetExtra | null;
}) {
  const factor = dayOverview?.factors[1];
  const dayRow = factor?.dayRows.find((row) => row.dateBerlin === dayKey);
  const absorbed = dayRow?.absorbedGwh ?? record.absorbedGwh;
  const surplus = record.surplusGwh;
  const hasSurplus = surplus >= 0.05 && !fleetDayNoWindSolarSurplus;
  const sharePct =
    hasSurplus && surplus > 0 ? Math.round((absorbed / surplus) * 100) : Math.round((factor?.absorbedShare ?? 0) * 100);

  const slice = fleetSoGerechnet?.slice;
  const peakReductionDayGw =
    slice != null ? (slice.maxRMw - slice.maxRPrimeMw) / 1000 : null;

  const noSurplusLead = (
    <>
      <strong>Überschuss:</strong> kein Laden möglich, an diesem Tag gab es keine Viertelstunde mit Wind+Sonne über
      Verbrauch.{" "}
      {slice && peakReductionDayGw != null ? (
        <>
          Monatslauf (×{fleetFactor}, {NATIONAL_FLEET_STRATEGY_UI[fleetStrategy].shortDe}): Spitzensenkung{" "}
          {peakReductionDayGw >= 0
            ? formatGwReduction(peakReductionDayGw)
            : `${formatQuantity(Math.abs(peakReductionDayGw), "de", 2)}${NBSP}GW höher`}
          , geladen {formatQuantity(slice.chargeMwh / 1000, "de", 1)}
          {NBSP}GWh, entladen {formatQuantity(slice.dischargeMwh / 1000, "de", 1)}
          {NBSP}GWh (Modell, Tageshorizont).
        </>
      ) : null}
    </>
  );

  const lead = hasSurplus ? (
    <>
      Die heutige Flotte ({formatDeGwGwhLine(fleetPowerGw, fleetEnergyGwh)}) hätte {formatDePercentInt(sharePct)} des
      Überschusses aus Wind und Sonne aufgenommen (Modell).
    </>
  ) : (
    noSurplusLead
  );

  const kernNoSurplus =
    slice && peakReductionDayGw != null && peakReductionDayGw >= 0.05
      ? formatGwReduction(peakReductionDayGw)
      : slice && slice.chargeMwh > 1
        ? `${formatQuantity(slice.chargeMwh / 1000, "de", 1)}${NBSP}GWh geladen`
        : `0${NBSP}GWh geladen`;

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-tag-system">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">02 · Das System</p>
        <h2 id="kapitel-tag-system" className="v4-chapter-h2">
          Speicher am {weekdayLabelDe(dayKey)}
          {hasSurplus
            ? ""
            : slice && peakReductionDayGw != null && peakReductionDayGw >= 0.05
              ? `: ${TAG_NO_SURPLUS_STRATEGY_HEADLINE[fleetStrategy]}`
              : ": nichts aus Überschuss"}
        </h2>
        {hasSurplus ? (
          <p className="v4-system-pct v4-tag-kern">{formatQuantity(sharePct, "de", 0)}&nbsp;%</p>
        ) : (
          <p className="v4-tag-kern">{kernNoSurplus}</p>
        )}
        <p className="v4-tag-side">{lead}</p>
      </div>
    </section>
  );
}