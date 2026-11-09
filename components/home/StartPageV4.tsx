"use client";

import { useMemo } from "react";

import { StartAnmerkungen } from "@/components/home/StartAnmerkungen";
import { StartGesternTeaser } from "@/components/home/StartGesternTeaser";
import { StartKopf } from "@/components/home/StartKopf";
import { StartOrtTeaser } from "@/components/home/OrtTeasers";
import { SystemChapter } from "@/components/home/SystemChapter";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { OverviewsBundle } from "@/lib/germanyView";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";
import { lastSurplusBefore, tagLastSurplusLine, tagSurplusLine } from "@/lib/kopfTagCopy";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import { startPointe } from "@/lib/startPointe";
import type { ResidualDay } from "@/lib/windSolarResidual";

export function StartPageV4({
  overviews,
  dispatch,
  todayKey,
  kopfDayKey,
  auffaelligkeitRecords,
  dataStand,
  homeDayPanel,
  kopfDay,
}: {
  overviews: OverviewsBundle | null;
  dispatch: LiveDispatchInput;
  todayKey: string;
  kopfDayKey: string;
  auffaelligkeitRecords: TagesKennzahlRecord[];
  dataStand: string;
  homeDayPanel: HomeDayPanelData | null;
  kopfDay: ResidualDay | null;
}) {
  const tagRecord = auffaelligkeitRecords.find((r) => r.dateKey === kopfDayKey);
  const systemModel = overviews?.byBlick["30tage"];
  const fleet = dispatch.fleet;
  const pointe = useMemo(() => startPointe(auffaelligkeitRecords, kopfDayKey), [auffaelligkeitRecords, kopfDayKey]);

  if (!overviews || !fleet) {
    return null;
  }

  const surplusLine =
    tagRecord != null
      ? tagSurplusLine(tagRecord.surplusGwh)
      : "Überschuss-Kennzahl für diesen Tag nicht verfügbar.";
  const lastLine = tagLastSurplusLine(lastSurplusBefore(auffaelligkeitRecords, kopfDayKey));

  return (
    <div className="v4-start start-page">
      <StartKopf
        kopfDayKey={kopfDayKey}
        todayKey={todayKey}
        dataStand={dataStand}
        records={auffaelligkeitRecords}
        pointe={pointe}
      />

      <StartGesternTeaser kopfDayKey={kopfDayKey} record={tagRecord} day={kopfDay} panel={homeDayPanel} />

      {systemModel ? (
        <SystemChapter model={systemModel} fleetPowerGw={fleet.powerGw} fleetEnergyGwh={fleet.energyGwh} />
      ) : null}

      <StartOrtTeaser />

      <StartAnmerkungen
        kopfDayKey={kopfDayKey}
        kopfFootnote={pointe.footnote}
        panel={homeDayPanel}
        surplusLine={surplusLine}
        lastLine={lastLine}
        system={
          systemModel
            ? {
                totalSurplusGwh: systemModel.observed.surplusGwh ?? 0,
                x1AbsorbedGwh: systemModel.factors[1].absorbedGwh,
                x1SharePct: Math.round((systemModel.factors[1].absorbedShare ?? 0) * 100),
              }
            : null
        }
      />
    </div>
  );
}
